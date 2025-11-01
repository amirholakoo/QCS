from flask import Flask, jsonify
import numpy as np
import signal
import sys
import os
import logging

# Add the MLX90640 library path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'env/lib/python3.11/site-packages'))
import MLX90640

app = Flask(__name__)

# log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MLX90640 sensor
try:
    MLX90640.setup(16)  # 16 FPS
    logger.info("MLX90640 sensor initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize MLX90640: {e}")
    sys.exit(1)


@app.route("/temperature", methods=["GET"])
def get_temperature_data():
    try:
        # Get frame data from MLX90640 (returns 768 values for 24x32)
        data = MLX90640.get_frame()
        if data is None or len(data) == 0:
            return jsonify({"error": "No data from sensor"}), 500

        # Convert to numpy array and reshape to 24x32
        temp_array = np.array(data).reshape((24, 32))
        # Apply same transformations as before if needed
        temp_array = np.fliplr(temp_array)
        temperature_list = temp_array.tolist()
        return jsonify({"temperature": temperature_list})
    except Exception as e:
        logger.error(f"Error getting temperature data: {e}")
        return jsonify({"error": f"Sensor error: {str(e)}"}), 500



def cleanup_on_exit(signal_received, frame):
    logger.info("Stopping sensor and cleaning up...")
    try:
        MLX90640.cleanup()
        logger.info("MLX90640 sensor cleaned up")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup_on_exit)
signal.signal(signal.SIGTERM, cleanup_on_exit)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

