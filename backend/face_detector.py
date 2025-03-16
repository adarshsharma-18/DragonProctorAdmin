import cv2
import torch
from facenet_pytorch import MTCNN
import time
import logging

# Setup logging.
logger = logging.getLogger("FaceDetector")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(levelname)s] %(asctime)s - %(name)s: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Use GPU if available.
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
mtcnn = MTCNN(keep_all=True, device=device)

# Global risk score and event log.
eye_risk_score = 0  # Cumulative risk score.
eye_risk_events = []  # Log of risk events.

# Tracking variables for extra faces.
prev_extra_faces = 0  # Previous extra face count.
extra_face_start_time = None  # Timestamp when extra face count became stable.

# Tracking variable for looking-away risk.
no_face_start_time = None  # Timestamp when no face was first detected.

# Flag to start scoring only after a person is detected and a wait period passes.
scoring_started = False
detection_start_time = None
WAIT_TIME = 5  # Wait 5 seconds after a face is first detected before starting risk scoring

# Risk parameters.
EXTRA_FACE_IMMEDIATE_RISK = 25  # Immediate risk per extra face.
EXTRA_FACE_TIME_RISK_PER_10SEC = 10  # Additional risk per extra face every 10 seconds.
LOOKING_AWAY_TIME_RISK_PER_10SEC = 10  # Risk for no face detected every 10 seconds.
EYE_ALIGNMENT_THRESHOLD = 10  # Vertical pixel difference threshold.
EYE_ALIGNMENT_RISK = 5  # Risk for abnormal eye alignment.


def process_frame(frame):
    global eye_risk_score, eye_risk_events, prev_extra_faces, extra_face_start_time
    global no_face_start_time, scoring_started, detection_start_time
    current_time = time.time()

    # Convert frame from BGR to RGB.
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    boxes, probs, landmarks = mtcnn.detect(img_rgb, landmarks=True)

    # CASE 1: No face detected.
    if boxes is None or len(boxes) == 0:
        # If scoring hasn't started (i.e. person never detected), do nothing.
        if not scoring_started:
            return frame
        # If a face was detected earlier and now missing, accumulate looking-away risk.
        if no_face_start_time is None:
            no_face_start_time = current_time
        else:
            duration = current_time - no_face_start_time
            if duration >= 10:
                intervals = int(duration // 10)
                looking_away_risk = intervals * LOOKING_AWAY_TIME_RISK_PER_10SEC
                eye_risk_score += looking_away_risk
                eye_risk_events.append({
                    "timestamp": current_time,
                    "event": "Looking Away",
                    "risk": looking_away_risk,
                    "duration": duration,
                    "intervals": intervals
                })
                logger.info("No face detected for %.2f sec (%d intervals); looking away risk +%d",
                            duration, intervals, looking_away_risk)
                no_face_start_time += 10 * intervals
        # Reset extra face tracking when no face is visible.
        prev_extra_faces = 0
        extra_face_start_time = None
        return frame

    # CASE 2: Face detected.
    # If this is the first detection, initialize scoring and wait before starting risk scoring.
    if not scoring_started:
        scoring_started = True
        detection_start_time = current_time
        # Do not accumulate any risk on the first detected frame.
        logger.info("Face detected. Waiting %d seconds to start risk scoring.", WAIT_TIME)
        return frame

    # If waiting period hasn't elapsed, skip risk calculation.
    if current_time - detection_start_time < WAIT_TIME:
        return frame

    # Reset no-face timer if face is detected.
    no_face_start_time = None
    current_delta = 0  # Risk increment for the current frame.

    # Calculate extra face count (faces beyond the first one).
    current_extra_faces = max(len(boxes) - 1, 0)

    if current_extra_faces > 0:
        if current_extra_faces != prev_extra_faces:
            extra_face_start_time = current_time
            immediate_risk = current_extra_faces * EXTRA_FACE_IMMEDIATE_RISK
            current_delta += immediate_risk
            eye_risk_events.append({
                "timestamp": current_time,
                "event": "Multiple Faces Detected",
                "risk": immediate_risk,
                "faces_detected": len(boxes)
            })
            logger.info("Detected %d faces (%d extra); immediate risk +%d",
                        len(boxes), current_extra_faces, immediate_risk)
        else:
            if extra_face_start_time is not None:
                duration = current_time - extra_face_start_time
                if duration >= 10:
                    intervals = int(duration // 10)
                    extra_time_risk = current_extra_faces * EXTRA_FACE_TIME_RISK_PER_10SEC * intervals
                    current_delta += extra_time_risk
                    eye_risk_events.append({
                        "timestamp": current_time,
                        "event": "Extra Face Duration",
                        "risk": extra_time_risk,
                        "duration": duration,
                        "intervals": intervals
                    })
                    logger.info("Extra faces stable for %.2f sec (%d intervals); additional risk +%d",
                                duration, intervals, extra_time_risk)
                    extra_face_start_time += 10 * intervals
        prev_extra_faces = current_extra_faces
    else:
        # Only one face present; reset extra face tracking.
        prev_extra_faces = 0
        extra_face_start_time = None

    # Check eye alignment for each detected face.
    if landmarks is not None:
        for face_landmarks in landmarks:
            if face_landmarks is not None and len(face_landmarks) >= 2:
                left_eye, right_eye = face_landmarks[0], face_landmarks[1]
                cv2.circle(frame, (int(left_eye[0]), int(left_eye[1])), 3, (255, 0, 0), -1)
                cv2.circle(frame, (int(right_eye[0]), int(right_eye[1])), 3, (255, 0, 0), -1)
                vertical_diff = abs(left_eye[1] - right_eye[1])
                if vertical_diff > EYE_ALIGNMENT_THRESHOLD:
                    current_delta += EYE_ALIGNMENT_RISK
                    eye_risk_events.append({
                        "timestamp": current_time,
                        "event": "Abnormal Eye Alignment",
                        "risk": EYE_ALIGNMENT_RISK,
                        "vertical_diff": vertical_diff
                    })
                    logger.info("Abnormal eye alignment (diff=%.2f px); risk +%d",
                                vertical_diff, EYE_ALIGNMENT_RISK)

    # Draw bounding boxes around detected faces.
    for box in boxes:
        box = [int(b) for b in box]
        cv2.rectangle(frame, (box[0], box[1]), (box[2], box[3]), (0, 255, 0), 2)

    eye_risk_score += current_delta
    logger.debug("Frame processed: risk increment = %d, total risk = %d", current_delta, eye_risk_score)
    return frame


def gen_frames():
    global cap
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        logger.error("Cannot open webcam.")
        return
    while True:
        ret, frame = cap.read()
        if not ret:
            logger.error("Failed to capture frame.")
            break
        frame = process_frame(frame)
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')


def stop_video():
    global cap
    if cap is not None:
        cap.release()
        cap = None
        logger.info("Camera has been released.")


if __name__ == '__main__':
    for _ in gen_frames():
        pass
