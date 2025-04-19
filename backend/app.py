from flask import Flask, render_template, jsonify, Response, request, send_from_directory

import threading
from io import StringIO, BytesIO
import csv
import time
import logging
import os
from datetime import datetime
import webbrowser
from flask_cors import CORS
import matplotlib.pyplot as plt

# Import tracking modules
from mouse_tracker import MouseBehaviorTracker
from window_tracker import WindowTracker
from copy_tracker import CopyTracker
from network_lockdown import NetworkLockdown
from peripheral_detector import PeripheralDetector
import face_detector
from voice_detector import VoiceDetector
from cheating_detector import CheatingDetector
from camera_detector import CameraDetector

# Configure paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIST = os.path.abspath(os.path.join(BASE_DIR, '../frontend/dist'))

# Initialize Flask app
# Change this line in your Flask app initialization
app = Flask(__name__,
            template_folder=FRONTEND_DIST,  # Keep frontend templates
            static_folder=os.path.join(FRONTEND_DIST, 'assets'),
            static_url_path='/assets')



CORS(app)
logging.basicConfig(level=logging.DEBUG)

# Debug print paths
print("Template folder:", app.template_folder)
print("Static folder:", app.static_folder)
print("Dist folder exists?:", os.path.exists(FRONTEND_DIST))
if os.path.exists(FRONTEND_DIST):
    print("Files in dist:", os.listdir(FRONTEND_DIST))
    if os.path.exists(os.path.join(FRONTEND_DIST, 'assets')):
        print("Files in assets:", os.listdir(os.path.join(FRONTEND_DIST, 'assets')))

# Initialize cheating detector
cheating_detector = CheatingDetector()

# Initialize camera detector
camera_detector = CameraDetector()

# Global state for exam status
exam_status = {
    'is_paused': False,
    'pause_reason': None,
    'last_activity': None
}

# Event callbacks
def mouse_event_callback(event):
    logging.info(f"Mouse Event: {event}")
    # Add cheating detection for mouse events
    detection_data = {
        'mouse_events': [event],
        'timestamp': datetime.now().isoformat()
    }
    detection_result = cheating_detector.detect_cheating(detection_data)
    if detection_result['should_pause']:
        exam_status['is_paused'] = True
        exam_status['pause_reason'] = detection_result['reasons']
        exam_status['last_activity'] = datetime.now().isoformat()

def window_event_callback(event):
    logging.info(f"Window Event: {event}")
    # Add cheating detection for window events
    detection_data = {
        'window_events': [event],
        'timestamp': datetime.now().isoformat()
    }
    detection_result = cheating_detector.detect_cheating(detection_data)
    if detection_result['should_pause']:
        exam_status['is_paused'] = True
        exam_status['pause_reason'] = detection_result['reasons']
        exam_status['last_activity'] = datetime.now().isoformat()

def copy_event_callback(event):
    logging.info(f"Copy Event: {event}")

def peripheral_event_callback(event):
    logging.info(f"Peripheral Event: {event}")

def voice_event_callback(event):
    logging.info(f"Voice Event: {event}")

# Initialize trackers
mouse_tracker = MouseBehaviorTracker(speed_threshold=1500, angle_threshold=90, callback=mouse_event_callback)
window_tracker = WindowTracker(poll_interval=0.5, callback=window_event_callback)
copy_tracker = CopyTracker(poll_interval=1.0, callback=copy_event_callback)
network_lockdown = NetworkLockdown(allowed_exe="C:\\Path\\to\\exam_browser.exe")
peripheral_detector = PeripheralDetector(callback=peripheral_event_callback)
voice_detector = VoiceDetector(callback=voice_event_callback, threshold=0.0002)
voice_detector.calibrate_threshold()

# Risk calculation
def get_status(score):
    if score >= 100: return "Direct kick out"
    elif score >= 80: return "Warning-2"
    elif score >= 70: return "Warning-1"
    else: return "Safe"

# Frontend routes - SPA handling
@app.route('/')
@app.route('/risk')
@app.route('/copy_test')
@app.route('/face_detection')
def serve_spa():
    return send_from_directory(app.template_folder, 'index.html')

# Special route for assets

# API endpoints
# Add this route below your existing frontend routes
@app.route('/admin-dashboard')
def admin_dashboard():
    # Serve from backend's templates folder
    return send_from_directory(
        os.path.join(BASE_DIR, 'templates'), 
        'index.html'
    )

@app.route('/video_feed')
def video_feed():
    return Response(face_detector.gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/api/mouse_events')
def api_mouse_events():
    return jsonify(mouse_tracker.event_log)

@app.route('/api/window_events')
def api_window_events():
    return jsonify(window_tracker.event_log)

@app.route('/api/copy_events')
def api_copy_events():
    return jsonify(copy_tracker.event_log)

@app.route('/api/peripheral_events')
def api_peripheral_events():
    return jsonify(peripheral_detector.event_log)

@app.route('/api/face_risk')
def api_face_risk():
    return jsonify({
        "face_risk": face_detector.eye_risk_score,
        "face_events": face_detector.eye_risk_events,
        "scoring_started": face_detector.scoring_started
    })

@app.route('/api/risk')
def api_risk():
    risks = {
        "mouse_risk": 0,
        "window_risk": getattr(window_tracker, 'risk_score', 0),
        "copy_risk": getattr(copy_tracker, 'risk_score', 0),
        "peripheral_risk": getattr(peripheral_detector, 'risk_score', 0),
        "face_risk": face_detector.eye_risk_score,
        "voice_risk": getattr(voice_detector, 'risk_score', 0)
    }
    
    aggregate = sum(risks.values())
    kickout_flag = aggregate >= 1000
    
    return jsonify({
        **{k: (v, get_status(v)) for k, v in risks.items()},
        "aggregate": (aggregate, get_status(aggregate)),
        "kickout": kickout_flag
    })

@app.route('/api/register_copy', methods=['POST'])
def register_copy():
    data = request.json
    if data and 'content' in data:
        event = {
            "timestamp": time.time(),
            "event": "Copy-Paste (Client)",
            "content_preview": data['content'][:50],
            "word_count": len(data['content'].split()),
            "full_content": data['content']
        }
        copy_tracker.event_log.append(event)
        logging.info(f"Registered copy event: {event}")
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error"}), 400

@app.route('/api/network_lockdown', methods=['GET'])
def api_network_lockdown():
    state = request.args.get("state", "").lower()
    if state == "on":
        network_lockdown.activate()
        return jsonify({"status": "lockdown activated"}), 200
    elif state == "off":
        network_lockdown.deactivate()
        return jsonify({"status": "lockdown deactivated"}), 200
    return jsonify({"status": "invalid state"}), 400

@app.route('/api/stop_video', methods=['GET'])
def stop_video_endpoint():
    face_detector.stop_video()
    return jsonify({"status": "video stream stopped"}), 200

@app.route('/api/test_voice_detection', methods=['POST'])
def test_voice_detection():
    try:
        has_voice, recording_file = voice_detector.detect_voice()
        return jsonify({
            "voice_detected": has_voice,
            "recording_path": recording_file if has_voice else None
        })
    except Exception as e:
        logging.error(f"Voice detection error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/voice_events')
def voice_events():
    return jsonify(voice_detector.event_log)

@app.route('/api/camera_status', methods=['GET'])
def get_camera_status():
    """Get current camera detection status"""
    return jsonify(camera_detector.get_current_status())

@app.route('/api/camera_events', methods=['GET'])
def get_camera_events():
    """Get all camera-based suspicious events"""
    return jsonify(camera_detector.get_suspicious_events())

@app.route('/api/start_camera', methods=['POST'])
def start_camera():
    """Start camera detection"""
    try:
        camera_detector.start_detection()
        return jsonify({
            'success': True,
            'message': 'Camera detection started'
        })
    except Exception as e:
        logging.error(f"Error starting camera: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/stop_camera', methods=['POST'])
def stop_camera():
    """Stop camera detection"""
    try:
        camera_detector.stop_detection()
        return jsonify({
            'success': True,
            'message': 'Camera detection stopped'
        })
    except Exception as e:
        logging.error(f"Error stopping camera: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/cheating_detection', methods=['POST'])
def cheating_detection():
    """Endpoint for cheating detection"""
    try:
        data = request.json
        detection_result = cheating_detector.detect_cheating(data)
        
        # Get camera status
        camera_status = camera_detector.get_current_status()
        camera_events = camera_detector.get_suspicious_events()
        
        # Combine detection results
        combined_result = {
            'is_cheating': detection_result['is_cheating'] or len(camera_events) > 0,
            'confidence': max(detection_result['confidence'], 0.8 if len(camera_events) > 0 else 0),
            'reasons': detection_result['reasons'] + [event['event_type'] for event in camera_events[-5:]],  # Last 5 events
            'should_pause': detection_result['should_pause'] or len(camera_events) >= 3  # Pause if 3 or more camera events
        }
        
        if combined_result['should_pause']:
            exam_status['is_paused'] = True
            exam_status['pause_reason'] = combined_result['reasons']
            exam_status['last_activity'] = datetime.now().isoformat()
        
        return jsonify({
            'success': True,
            'detection_result': combined_result,
            'camera_status': camera_status,
            'exam_status': exam_status
        })
    except Exception as e:
        logging.error(f"Error in cheating detection: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/exam_status', methods=['GET'])
def get_exam_status():
    """Get current exam status"""
    return jsonify(exam_status)

@app.route('/api/resume_exam', methods=['POST'])
def resume_exam():
    """Resume the exam after admin approval"""
    if not exam_status['is_paused']:
        return jsonify({
            'success': False,
            'message': 'Exam is not paused'
        }), 400
    
    exam_status['is_paused'] = False
    exam_status['pause_reason'] = None
    return jsonify({
        'success': True,
        'message': 'Exam resumed successfully'
    })

@app.route('/api/suspicious_activities', methods=['GET'])
def get_suspicious_activities():
    """Get list of all suspicious activities"""
    return jsonify(cheating_detector.get_suspicious_activities())

# Fallback route for SPA client-side routing
# Replace the existing catch_all route with this simplified version
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def catch_all(path):
    return send_from_directory(app.template_folder, 'index.html')


# CSV export endpoints
@app.route('/download/mouse_csv')
def download_mouse_csv():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'event', 'speed', 'angle_diff', 'position'])
    for event in mouse_tracker.event_log:
        cw.writerow([
            event.get('timestamp', ''),
            event.get('event', ''),
            event.get('speed', ''),
            event.get('angle_diff', ''),
            event.get('position', '')
        ])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=mouse_events.csv"})


@app.route('/download/window_csv')
def download_window_csv():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'window', 'duration'])
    for event in window_tracker.event_log:
        cw.writerow([
            event.get('timestamp', ''),
            event.get('window', ''),
            event.get('duration', '')
        ])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=window_events.csv"})

@app.route('/download/copy_csv')
def download_copy_csv():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'event', 'content_preview', 'word_count', 'full_content'])
    for event in copy_tracker.event_log:
        cw.writerow([
            event.get('timestamp', ''),
            event.get('event', ''),
            event.get('content_preview', ''),
            event.get('word_count', ''),
            event.get('full_content', '')
        ])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=copy_events.csv"})

@app.route('/download/peripheral_csv')
def download_peripheral_csv():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'device'])
    for event in peripheral_detector.event_log:
        cw.writerow([
            event.get('timestamp', ''),
            event.get('device', event.get('Caption', 'Unknown'))
        ])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=peripheral_events.csv"})

@app.route('/download/face_csv')
def download_face_csv():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'event', 'risk', 'details'])
    for event in face_detector.eye_risk_events:
        details = ""
        if event.get("faces_detected"):
            details = f"Faces: {event['faces_detected']}"
        elif event.get("duration"):
            details = f"Duration: {event['duration']:.2f} s, intervals: {event.get('intervals','')}"
        elif event.get("vertical_diff"):
            details = f"Vertical diff: {event['vertical_diff']:.2f}"
        cw.writerow([event.get('timestamp', ''), event.get('event', ''), event.get('risk', ''), details])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=face_events.csv"})

@app.route('/download/voice_csv')
def download_voice_csv():
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(['timestamp', 'event', 'duration', 'risk_score', 'recording_file'])
    for event in voice_detector.event_log:
        cw.writerow([
            event.get('timestamp', ''),
            event.get('event', ''),
            event.get('duration', ''),
            event.get('risk_score', ''),
            event.get('recording_file', '')
        ])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=voice_events.csv"})

@app.route('/download/graph_csv')
def download_graph_csv():
    data = []
    for event in face_detector.eye_risk_events:
        data.append({
            "timestamp": event.get("timestamp", ""),
            "risk": event.get("risk", ""),
            "source": "face"
        })
    for event in voice_detector.event_log:
        data.append({
            "timestamp": event.get("timestamp", ""),
            "risk": event.get("risk_score", ""),
            "source": "voice"
        })
    data.sort(key=lambda x: x["timestamp"])
    si = StringIO()
    cw = csv.writer(si)
    cw.writerow(["timestamp", "risk", "source"])
    for item in data:
        cw.writerow([item["timestamp"], item["risk"], item["source"]])
    output = si.getvalue()
    return Response(output, mimetype="text/csv",
                    headers={"Content-Disposition": "attachment;filename=graph_data.csv"})

# Visualization endpoints
@app.route('/graph/<event_type>')
def graph_event(event_type):
    if event_type == 'mouse':
        events = mouse_tracker.event_log
    elif event_type == 'window':
        events = window_tracker.event_log
    elif event_type == 'copy':
        events = copy_tracker.event_log
    elif event_type == 'peripheral':
        events = peripheral_detector.event_log
    elif event_type == 'face':
        events = face_detector.eye_risk_events
    elif event_type == 'voice':
        events = voice_detector.event_log
    else:
        return "Invalid event type", 400

    times = []
    values = []
    for event in events:
        t = event.get('timestamp')
        if t is not None:
            times.append(t)
            val = event.get('risk', 1)
            values.append(val)
    if not times:
        return "No data available", 404

    fig, ax = plt.subplots(figsize=(8, 4))
    ax.plot(times, values, marker='o', linestyle='-', color='cyan')
    ax.set_xlabel('Timestamp')
    ax.set_ylabel('Risk Value' if any('risk' in e for e in events) else 'Event Count')
    ax.set_title(f'{event_type.capitalize()} Events Graph')
    ax.grid(True)
    fig.tight_layout()

    buf = BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close(fig)
    return Response(buf.getvalue(), mimetype='image/png')

# Kickout page
@app.route('/kickout')
def kickout():
    return """
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Kicked Out</title>
      <style>
        body { background-color: #1a1a1a; color: #fff; text-align: center; padding-top: 50px; }
        h1 { font-size: 3em; }
      </style>
    </head>
    <body>
      <h1>You have been kicked out.</h1>
      <p>Your overall risk score exceeded the allowed threshold.</p>
    </body>
    </html>
    """

if __name__ == '__main__':
    # Auto-open browser
    threading.Thread(target=lambda: webbrowser.open("http://127.0.0.1:5000/"), daemon=True).start()
    
    # Start all trackers
    trackers = [mouse_tracker, window_tracker, copy_tracker, peripheral_detector]
    for tracker in trackers:
        threading.Thread(target=tracker.start, daemon=True).start()

    # Run Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
