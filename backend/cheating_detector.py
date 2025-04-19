import numpy as np
from sklearn.ensemble import IsolationForest
from typing import Dict, List, Any
import logging
from datetime import datetime
import json

class CheatingDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.feature_names = [
            'mouse_speed', 'mouse_click_frequency', 'window_switch_frequency',
            'copy_attempts', 'peripheral_changes', 'face_risk_score',
            'voice_detection_score'
        ]
        self.feature_weights = {
            'mouse_speed': 1.0,
            'mouse_click_frequency': 1.2,
            'window_switch_frequency': 1.5,
            'copy_attempts': 2.0,
            'peripheral_changes': 1.3,
            'face_risk_score': 1.8,
            'voice_detection_score': 1.6
        }
        self.suspicious_activities = []
        self.is_trained = False
        self.threshold = -0.5  # Anomaly score threshold

    def extract_features(self, logs: Dict[str, Any]) -> np.ndarray:
        """Extract features from various log types"""
        features = np.zeros(len(self.feature_names))
        
        # Mouse behavior features
        if 'mouse_events' in logs:
            mouse_events = logs['mouse_events']
            if mouse_events:
                # Calculate average mouse speed
                speeds = [event.get('speed', 0) for event in mouse_events]
                features[0] = np.mean(speeds) if speeds else 0
                
                # Calculate click frequency (clicks per minute)
                clicks = sum(1 for event in mouse_events if event.get('type') == 'click')
                time_span = (mouse_events[-1]['timestamp'] - mouse_events[0]['timestamp']).total_seconds() / 60
                features[1] = clicks / time_span if time_span > 0 else 0

        # Window switch frequency
        if 'window_events' in logs:
            window_events = logs['window_events']
            if window_events:
                switches = sum(1 for event in window_events if event.get('type') == 'switch')
                time_span = (window_events[-1]['timestamp'] - window_events[0]['timestamp']).total_seconds() / 60
                features[2] = switches / time_span if time_span > 0 else 0

        # Copy attempts
        if 'copy_events' in logs:
            features[3] = len(logs['copy_events'])

        # Peripheral changes
        if 'peripheral_events' in logs:
            features[4] = len(logs['peripheral_events'])

        # Face risk score
        if 'face_risk' in logs:
            features[5] = logs['face_risk'].get('risk_score', 0)

        # Voice detection score
        if 'voice_events' in logs:
            voice_events = logs['voice_events']
            if voice_events:
                features[6] = np.mean([event.get('confidence', 0) for event in voice_events])

        return features

    def train(self, historical_logs: List[Dict[str, Any]]):
        """Train the model on historical data"""
        if not historical_logs:
            logging.warning("No historical data provided for training")
            return

        X = np.array([self.extract_features(log) for log in historical_logs])
        self.model.fit(X)
        self.is_trained = True
        logging.info("Cheating detection model trained successfully")

    def detect_cheating(self, current_logs: Dict[str, Any]) -> Dict[str, Any]:
        """Detect potential cheating based on current logs"""
        if not self.is_trained:
            return {
                'is_cheating': False,
                'confidence': 0,
                'reasons': ['Model not trained yet'],
                'should_pause': False
            }

        features = self.extract_features(current_logs)
        anomaly_score = self.model.score_samples([features])[0]
        
        # Calculate weighted anomaly score
        weighted_score = np.sum(features * np.array(list(self.feature_weights.values())))
        normalized_score = weighted_score / np.sum(list(self.feature_weights.values()))
        
        is_cheating = anomaly_score < self.threshold or normalized_score > 0.7
        reasons = []

        if is_cheating:
            # Identify specific suspicious activities
            if features[0] > 1000:  # Unusually high mouse speed
                reasons.append("Abnormal mouse movement speed")
            if features[1] > 50:  # High click frequency
                reasons.append("Suspiciously high click frequency")
            if features[2] > 10:  # Frequent window switching
                reasons.append("Excessive window switching")
            if features[3] > 0:  # Copy attempts
                reasons.append("Copy/paste attempts detected")
            if features[4] > 5:  # Peripheral changes
                reasons.append("Multiple peripheral device changes")
            if features[5] > 0.7:  # High face risk
                reasons.append("High face detection risk")
            if features[6] > 0.8:  # High voice detection
                reasons.append("Voice detection alert")

        # Log suspicious activity
        if is_cheating:
            self.suspicious_activities.append({
                'timestamp': datetime.now().isoformat(),
                'anomaly_score': float(anomaly_score),
                'weighted_score': float(normalized_score),
                'reasons': reasons,
                'features': dict(zip(self.feature_names, features.tolist()))
            })

        return {
            'is_cheating': is_cheating,
            'confidence': float(1 - (anomaly_score + 1) / 2),  # Normalize to [0,1]
            'reasons': reasons,
            'should_pause': is_cheating and len(reasons) >= 2  # Pause if multiple suspicious activities
        }

    def get_suspicious_activities(self) -> List[Dict[str, Any]]:
        """Get list of all suspicious activities"""
        return self.suspicious_activities

    def reset(self):
        """Reset the detector state"""
        self.suspicious_activities = []
        self.is_trained = False 