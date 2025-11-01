# Copyright (C) Meridian Innovation Ltd. Hong Kong, 2020. All rights reserved.
#
import sys
sys.path.append("/home/test/myenv/lib/python3.11/site-packages")
import os
import signal
import time
import logging
import serial
import numpy as np

try:
    import cv2 as cv
except:
    print("Please install OpenCV (or link existing installation)"
          " to see the thermal image")
    exit(1)

from senxor.mi48 import MI48, format_header, format_framestats
from senxor.utils import data_to_frame, remap, cv_filter,\
                         cv_render, RollingAverageFilter,\
                         connect_senxor

# This will enable mi48 logging debug messages
logger = logging.getLogger(__name__)
logging.basicConfig(level=os.environ.get("LOGLEVEL", "DEBUG"))


# Make the a global variable and use it as an instance of the mi48.
# This allows it to be used directly in a signal_handler.
global mi48

# define a signal handler to ensure clean closure upon CTRL+C
# or kill from terminal
def signal_handler(sig, frame):
    """Ensure clean exit in case of SIGINT or SIGTERM"""
    logger.info("Exiting due to SIGINT or SIGTERM")
    mi48.stop()
    cv.destroyAllWindows()
    logger.info("Done.")
    sys.exit(0)

# Define the signals that should be handled to ensure clean exit
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# Make an instance of the MI48, attaching USB for 
# both control and data interface.
# can try connect_senxor(src='/dev/ttyS3') or similar if default cannot be found
mi48, connected_port, port_names = connect_senxor()

# print out camera info
logger.info('Camera info:')
logger.info(mi48.camera_info)

# set desired FPS
if len(sys.argv) == 2:
    STREAM_FPS = int(sys.argv[1])
else:
    STREAM_FPS = 15
mi48.set_fps(STREAM_FPS)

# see if filtering is available in MI48 and set it up
mi48.disable_filter(f1=True, f2=True, f3=True)
mi48.set_filter_1(85)
mi48.enable_filter(f1=True, f2=False, f3=False, f3_ks_5=False)
mi48.set_offset_corr(0.0)

mi48.set_sens_factor(100)
mi48.get_sens_factor()

# initiate continuous frame acquisition
with_header = True
mi48.start(stream=True, with_header=with_header)

print("\r\n\r\n")
x,y = mi48.read()
for key, value in y.items():
    print(f"{key}: {value}")

print(x)
print("\r\n\r\n")
