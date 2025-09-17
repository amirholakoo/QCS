# thermal_sensor.py

import sys
import os
# Add the MLX90640 library path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'env/lib/python3.11/site-packages'))

import logging
import numpy as np
import MLX90640

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Initialize MLX90640 sensor
try:
    MLX90640.setup(16)  # 16 FPS
    logger.info("MLX90640 sensor initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize MLX90640: {e}")

def read_thermal_frame():
    try:
        # Get frame data from MLX90640 (returns 768 values for 24x32)
        data = MLX90640.get_frame()
        if data is None or len(data) == 0:
            logger.error("No data received from sensor.")
            return np.zeros((24, 32))

        # Convert to numpy array and reshape to 24x32
        frame = np.array(data).reshape((24, 32))
        return frame
    except Exception as e:
        logger.error(f"Error reading frame: {e}")
        return np.zeros((24, 32))

def cleanup():
    """Clean up MLX90640 resources"""
    try:
        MLX90640.cleanup()
        logger.info("MLX90640 sensor cleaned up")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")

if __name__ == "__main__":
    import matplotlib.pyplot as plt
    import signal
    
    def signal_handler(sig, frame):
        cleanup()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        while True:
            frame = read_thermal_frame()
            print(f"Min: {frame.min():.2f}°C, Max: {frame.max():.2f}°C")
            plt.imshow(frame, cmap='inferno')
            plt.colorbar()
            plt.pause(0.1)
            plt.clf()
    except KeyboardInterrupt:
        cleanup()
