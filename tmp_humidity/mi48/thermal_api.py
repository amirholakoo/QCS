from flask import Flask, jsonify
import numpy as np
import signal
import sys
import logging

from senxor.mi48 import MI48
from senxor.utils import connect_senxor

app = Flask(__name__)

# log
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# connect to sensor
mi48, connected_port, port_names = connect_senxor()
logger.info(f"Connected to: {connected_port}")

# config
mi48.set_fps(15)
mi48.disable_filter(f1=True, f2=True, f3=True)
mi48.set_filter_1(85)
mi48.enable_filter(f1=True, f2=False, f3=False, f3_ks_5=False)
mi48.set_offset_corr(0.0)
mi48.set_sens_factor(100)

# start
mi48.start(stream=True, with_header=False)


@app.route("/temperature", methods=["GET"])
def get_temperature_data():

    data, header = mi48.read()
    if data is None:
        return jsonify({"error": "No data from sensor"}), 500

    temp_array = data.reshape((62, 80))
    #temp_array = np.flipud(temp_array)
    temp_array = np.fliplr(temp_array)
    temperature_list = temp_array.tolist()
    return jsonify({"temperature": temperature_list})



def cleanup_on_exit(signal_received, frame):
    logger.info("Stopping sensor and cleaning up...")
    mi48.stop()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup_on_exit)
signal.signal(signal.SIGTERM, cleanup_on_exit)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

