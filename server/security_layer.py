# ============================================================
# 🧠 SentinelVPN Security Layer v2
# ------------------------------------------------------------
# ✅ AI-Enhanced Packet Analyzer
# Features:
#   1. Detects known malware signatures (EICAR test, etc.)
#   2. Optional TensorFlow model for anomaly detection
#   3. Logs every flagged threat safely to /logs/threat_log.txt
#   4. Returns structured result for backend integration
# ============================================================

import os
import re
import tensorflow as tf

# EICAR test signature (safe antivirus test file)
EICAR_SIGNATURE = (
    "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
)

class SecurityLayer:
    """AI-powered security inspection layer for SentinelVPN"""

    def __init__(self, model_path="models/network_anomaly_detector.h5", log_dir="logs"):
        self.detected_threats = []
        self.model_path = model_path
        self.model = None
        self.log_path = os.path.join(log_dir, "threat_log.txt")

        # Ensure log directory exists
        os.makedirs(log_dir, exist_ok=True)
        if not os.path.exists(self.log_path):
            open(self.log_path, "w").close()

        print("🔐 Security Layer initialized successfully!")

        # Try loading TensorFlow model once (optional)
        try:
            if os.path.exists(self.model_path):
                self.model = tf.keras.models.load_model(self.model_path)
                print(f"✅ Loaded anomaly detection model from {self.model_path}")
            else:
                print("⚠️ No anomaly model found; running in signature-only mode.")
        except Exception as e:
            print(f"⚠️ Error loading model: {e}")

    # --------------------------------------------------------
    # 🔍 Signature-based Inspection
    # --------------------------------------------------------
    def inspect_packet(self, packet_data: str) -> dict:
        """Scan packet content for known malware signatures"""
        result = {
            "detected": False,
            "type": None,
            "severity": None,
            "details": None
        }

        if EICAR_SIGNATURE in packet_data:
            threat_type = "EICAR Test File"
            self.detected_threats.append(threat_type)
            self.log_threat(packet_data, threat_type)
            print("🚨 Threat detected: EICAR test signature found!")
            result.update({
                "detected": True,
                "type": threat_type,
                "severity": "High",
                "details": "EICAR signature match"
            })

        # Example heuristic detection (simple pattern check)
        suspicious_patterns = [r"DROP\s+TABLE", r"cmd\.exe", r"powershell", r"wget\s+http"]
        for pattern in suspicious_patterns:
            if re.search(pattern, packet_data, re.IGNORECASE):
                threat_type = f"Suspicious Pattern ({pattern})"
                self.detected_threats.append(threat_type)
                self.log_threat(packet_data, threat_type)
                print(f"⚠️ Suspicious pattern detected: {pattern}")
                result.update({
                    "detected": True,
                    "type": threat_type,
                    "severity": "Medium",
                    "details": f"Matched pattern: {pattern}"
                })
                break

        return result

    # --------------------------------------------------------
    # 🤖 AI-based Anomaly Detection (TensorFlow)
    # --------------------------------------------------------
    def predict_anomaly(self, features):
        """
        Detect unusual network behavior using TensorFlow model.
        `features` should be a numeric array (e.g., [packet_size, latency, ttl]).
        """
        if not self.model:
            print("⚠️ No model loaded; skipping anomaly prediction.")
            return {"detected": False, "confidence": 0.0}

        try:
            import numpy as np
            features = np.array([features], dtype="float32")
            prediction = self.model.predict(features, verbose=0)
            confidence = float(prediction[0][0])
            if confidence > 0.5:
                print(f"⚠️ Anomaly Detected! Confidence: {confidence:.2f}")
                self.log_threat(str(features.tolist()), "AI Anomaly")
                return {"detected": True, "confidence": confidence}
            return {"detected": False, "confidence": confidence}
        except Exception as e:
            print(f"⚠️ Error during anomaly prediction: {e}")
            return {"detected": False, "confidence": 0.0}

    # --------------------------------------------------------
    # 🧾 Logging Utility
    # --------------------------------------------------------
    def log_threat(self, data: str, threat_type="Unknown"):
        """Append detected threats to log file"""
        try:
            with open(self.log_path, "a", encoding="utf-8") as log:
                log.write(f"[{threat_type}] {data}\n")
            print("🧾 Threat logged.")
        except Exception as e:
            print(f"❌ Failed to log threat: {e}")
