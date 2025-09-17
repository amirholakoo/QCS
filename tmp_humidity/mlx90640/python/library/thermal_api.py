from flask import Flask, jsonify
import MLX90640
import numpy as np

app = Flask(__name__)

@app.route("/temperature")
def get_temperature():
    try:
        MLX90640.setup(4)  # 👈 FPS را مشخص می‌کنیم
        frame = MLX90640.get_frame()
        MLX90640.cleanup()

        frame_2d = np.array(frame).reshape((24, 32))
        return jsonify(frame_2d.tolist())

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return "MLX90640 API is running. Use /temperature to get data."

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

