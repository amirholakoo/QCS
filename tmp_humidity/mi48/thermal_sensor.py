# thermal_sensor.py

import sys
sys.path.append("/home/admin/mlx90640-library/env/lib/python3.11/site-packages")  # مسیر محیط مجازی

import logging
import numpy as np
from senxor.mi48 import MI48
from senxor.utils import connect_senxor

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

mi48, connected_port, port_names = connect_senxor()
logger.info(f"Connected to port: {connected_port}")
logger.info(f"Camera info: {mi48.camera_info}")

mi48.set_fps(15)
mi48.disable_filter(f1=True, f2=True, f3=True)
mi48.set_filter_1(85)
mi48.enable_filter(f1=True, f2=False, f3=False, f3_ks_5=False)
mi48.set_offset_corr(0.0)
mi48.set_sens_factor(0)
mi48.start(stream=True, with_header=False)

def read_thermal_frame():
    data, _ = mi48.read()
    if data is None:
        logger.error("No data received from sensor.")
        return np.zeros((62, 80))

    frame = data.reshape((62, 80))
    return frame

if __name__ == "__main__":
    import matplotlib.pyplot as plt

    while True:
        frame = read_thermal_frame()
        print(f"Min: {frame.min():.2f}°C, Max: {frame.max():.2f}°C")
        plt.imshow(frame, cmap='inferno')
        plt.colorbar()
        plt.pause(0.1)
        plt.clf()
