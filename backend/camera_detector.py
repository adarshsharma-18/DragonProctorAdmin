import cv2
import numpy as np
from datetime import datetime
import logging
import threading
import time
import sounddevice as sd
import scipy.io.wavfile as wav
import os
from typing import Dict, Any, List

class CameraDetector:
    def __init__(self):
        self.camera = cv2.VideoCapture(0)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Initialize audio recording with more sensitive settings
        self.audio_sample_rate = 44100
        self.audio_channels = 1
        self.audio_duration = 0.5  # Reduced duration for faster response
        self.audio_threshold = 0.05  # Lower threshold for more sensitive voice detection
        self.is_recording = False
        self.audio_thread = None
        
        self.is_running = False
        self.detection_thread = None
        self.last_frame = None
        self.suspicious_events = []
        self.face_detection_count = 0
        self.no_face_count = 0
        self.phone_detection_count = 0
        self.looking_away_count = 0
        self.voice_detection_count = 0
        
        # More sensitive thresholds
        self.NO_FACE_THRESHOLD = 30
        self.MULTIPLE_FACES_THRESHOLD = 10
        self.PHONE_DETECTION_THRESHOLD = 3  # Reduced for faster detection
        self.LOOKING_AWAY_THRESHOLD = 20
        self.VOICE_DETECTION_THRESHOLD = 2  # Reduced for faster voice detection
        
        # Calibration values
        self.face_position_history = []
        self.face_position_threshold = 50
        self.eye_ratio_threshold = 0.3

    def start_detection(self):
        """Start the camera and audio detection threads"""
        if not self.is_running:
            self.is_running = True
            self.detection_thread = threading.Thread(target=self._detection_loop)
            self.detection_thread.daemon = True
            self.detection_thread.start()
            
            # Start audio monitoring
            self.is_recording = True
            self.audio_thread = threading.Thread(target=self._audio_monitoring_loop)
            self.audio_thread.daemon = True
            self.audio_thread.start()
            
            logging.info("Camera and audio detection started")

    def stop_detection(self):
        """Stop the camera and audio detection threads"""
        self.is_running = False
        self.is_recording = False
        
        if self.detection_thread:
            self.detection_thread.join()
        if self.audio_thread:
            self.audio_thread.join()
            
        self.camera.release()
        logging.info("Camera and audio detection stopped")

    def _audio_monitoring_loop(self):
        """Monitor audio for voice detection with enhanced sensitivity"""
        while self.is_recording:
            try:
                # Record audio for a short duration
                audio_data = sd.rec(
                    int(self.audio_duration * self.audio_sample_rate),
                    samplerate=self.audio_sample_rate,
                    channels=self.audio_channels,
                    dtype='float32'
                )
                sd.wait()
                
                # Calculate audio level with enhanced sensitivity
                audio_level = np.abs(audio_data).mean()
                logging.debug(f"Audio level: {audio_level}")  # Add debug logging
                
                if audio_level > self.audio_threshold:
                    self.voice_detection_count += 1
                    logging.info(f"Voice detected! Count: {self.voice_detection_count}")  # Add info logging
                    if self.voice_detection_count >= self.VOICE_DETECTION_THRESHOLD:
                        self._log_suspicious_event("Voice detected")
                        self.voice_detection_count = 0
                else:
                    self.voice_detection_count = max(0, self.voice_detection_count - 1)
                    
            except Exception as e:
                logging.error(f"Error in audio monitoring: {str(e)}")
                time.sleep(0.1)

    def _detection_loop(self):
        """Main detection loop"""
        while self.is_running:
            try:
                ret, frame = self.camera.read()
                if not ret:
                    logging.error("Failed to capture frame")
                    continue

                self.last_frame = frame
                self._analyze_frame(frame)
                
                # Log current status periodically
                current_status = self.get_current_status()
                if any([current_status['voice_detected'], 
                       current_status['phone_detected'], 
                       current_status['looking_away']]):
                    logging.info(f"Current status: {current_status}")
                
                time.sleep(0.1)  # Reduce CPU usage
            except Exception as e:
                logging.error(f"Error in detection loop: {str(e)}")
                time.sleep(1)  # Wait a bit before retrying

    def _analyze_frame(self, frame):
        """Analyze a single frame for suspicious activities"""
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
            
            # Multiple faces detection
            if len(faces) > 1:
                self.face_detection_count += 1
                if self.face_detection_count >= self.MULTIPLE_FACES_THRESHOLD:
                    self._log_suspicious_event("Multiple faces detected")
                    self.face_detection_count = 0
            else:
                self.face_detection_count = 0

            # No face detection
            if len(faces) == 0:
                self.no_face_count += 1
                if self.no_face_count >= self.NO_FACE_THRESHOLD:
                    self._log_suspicious_event("Face not detected - possible absence")
                    self.no_face_count = 0
            else:
                self.no_face_count = 0
                self._analyze_face_position(faces[0], frame)
                self._analyze_eye_contact(faces[0], gray)
                self._detect_phone(faces[0], frame)
        except Exception as e:
            logging.error(f"Error in frame analysis: {str(e)}")

    def _analyze_face_position(self, face, frame):
        """Analyze if the face position has changed significantly"""
        x, y, w, h = face
        current_position = (x + w/2, y + h/2)
        
        if self.face_position_history:
            last_position = self.face_position_history[-1]
            distance = np.sqrt((current_position[0] - last_position[0])**2 + 
                             (current_position[1] - last_position[1])**2)
            
            if distance > self.face_position_threshold:
                self._log_suspicious_event("Significant head movement detected")
        
        self.face_position_history.append(current_position)
        if len(self.face_position_history) > 10:  # Keep last 10 positions
            self.face_position_history.pop(0)

    def _analyze_eye_contact(self, face, gray):
        """Analyze if the person is looking at the screen"""
        x, y, w, h = face
        roi_gray = gray[y:y+h, x:x+w]
        eyes = self.eye_cascade.detectMultiScale(roi_gray)
        
        if len(eyes) < 2:  # Less than two eyes detected
            self.looking_away_count += 1
            if self.looking_away_count >= self.LOOKING_AWAY_THRESHOLD:
                self._log_suspicious_event("Looking away from screen")
                self.looking_away_count = 0
        else:
            self.looking_away_count = 0

    def _detect_phone(self, face, frame):
        """Enhanced phone detection with more sensitive parameters"""
        x, y, w, h = face
        
        # Define multiple regions of interest for phone detection
        regions = [
            # 1. Near the face (holding phone to ear)
            (max(0, y-100), min(frame.shape[0], y+h+100), 
             max(0, x-100), min(frame.shape[1], x+w+100)),
            
            # 2. Below the face (looking down at phone)
            (min(frame.shape[0], y+h), min(frame.shape[0], y+h+200),
             max(0, x-150), min(frame.shape[1], x+w+150)),
            
            # 3. Left side of face (phone in left hand)
            (max(0, y-100), min(frame.shape[0], y+h+100),
             max(0, x-200), max(0, x-50)),
            
            # 4. Right side of face (phone in right hand)
            (max(0, y-100), min(frame.shape[0], y+h+100),
             min(frame.shape[1], x+w+50), min(frame.shape[1], x+w+200))
        ]
        
        phone_detected = False
        
        for y1, y2, x1, x2 in regions:
            roi = frame[y1:y2, x1:x2]
            if roi.size == 0:
                continue
                
            # Convert to grayscale
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            
            # Apply adaptive thresholding with more sensitive parameters
            thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                         cv2.THRESH_BINARY_INV, 7, 2)
            
            # Detect edges with lower thresholds for better sensitivity
            edges = cv2.Canny(gray, 30, 100)
            
            # Calculate edge density
            edge_density = np.sum(edges > 0) / (edges.size + 1e-6)
            
            # Calculate contour area ratio
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if contours:
                max_contour = max(contours, key=cv2.contourArea)
                contour_area = cv2.contourArea(max_contour)
                area_ratio = contour_area / (roi.shape[0] * roi.shape[1])
                
                # More sensitive phone detection conditions
                if edge_density > 0.1 or area_ratio > 0.15:  # Lowered thresholds
                    phone_detected = True
                    logging.info(f"Phone detected! Edge density: {edge_density}, Area ratio: {area_ratio}")
                    break
        
        if phone_detected:
            self.phone_detection_count += 1
            logging.info(f"Phone detection count: {self.phone_detection_count}")
            if self.phone_detection_count >= self.PHONE_DETECTION_THRESHOLD:
                self._log_suspicious_event("Mobile device detected")
                self.phone_detection_count = 0
        else:
            self.phone_detection_count = max(0, self.phone_detection_count - 1)

    def _log_suspicious_event(self, event_type: str):
        """Log a suspicious event"""
        event = {
            'timestamp': datetime.now().isoformat(),
            'event_type': event_type,
            'confidence': 0.9,  # Increased confidence
            'frame': self.last_frame.tolist() if self.last_frame is not None else None
        }
        self.suspicious_events.append(event)
        logging.warning(f"Suspicious activity detected: {event_type}")

    def get_suspicious_events(self) -> List[Dict[str, Any]]:
        """Get all suspicious events"""
        return self.suspicious_events

    def get_current_status(self) -> Dict[str, Any]:
        """Get current detection status with enhanced logging"""
        status = {
            'face_detected': self.no_face_count == 0,
            'multiple_faces': self.face_detection_count > 0,
            'phone_detected': self.phone_detection_count > 0,
            'looking_away': self.looking_away_count > 0,
            'voice_detected': self.voice_detection_count > 0,
            'suspicious_events_count': len(self.suspicious_events)
        }
        
        # Log status changes
        if any([status['voice_detected'], status['phone_detected'], status['looking_away']]):
            logging.info(f"Status update: {status}")
            
        return status

    def reset(self):
        """Reset the detector state"""
        self.suspicious_events = []
        self.face_detection_count = 0
        self.no_face_count = 0
        self.phone_detection_count = 0
        self.looking_away_count = 0
        self.voice_detection_count = 0
        self.face_position_history = [] 