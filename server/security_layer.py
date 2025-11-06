import re
import tensorflow as tf
import requests

# EICAR test signature (for safe malware simulation)
EICAR_SIGNATURE = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

class SecurityLayer:
    def __init__(self):
        self.detected_threats = []
        print("🔐 Security Layer initialized successfully!")

    def inspect_packet(self, packet_data: str):
        """Scan packet content for known malware signatures or patterns"""
        if EICAR_SIGNATURE in packet_data:
            print("🚨 Threat detected: EICAR test file found!")
            self.detected_threats.append("EICAR Test File")
            return True
        return False

    def predict_anomaly(self, features):
        """Use a TensorFlow model to detect unusual network behavior"""
        try:
            model = tf.keras.models.load_model("models/network_anomaly_detector.h5")
            prediction = model.predict([features])
            if prediction[0][0] > 0.5:
                print("⚠️ Anomaly Detected in Network Traffic!")
                return True
        except Exception as e:
            print(f"⚠️ Skipping anomaly model check: {e}")
        return False

    def log_threat(self, packet_data):
        with open("logs/threat_log.txt", "a") as log:
            log.write(packet_data + "\n")
        print("🧾 Threat logged.")
