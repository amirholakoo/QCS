import requests
from django.http import JsonResponse
import numpy as np
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from io import BytesIO
from PIL import Image
import time
from datetime import datetime
import cv2
import jdatetime
import sys
import django
from zoneinfo import ZoneInfo
from django.conf import settings

current_file = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(current_file))
static_dir = os.path.join(BASE_DIR, "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Add Django project path to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from thermal.views import auto_save_probe_data

DATA_IS_CORRECT = True
PI_IP = "172.16.15.21/data"
PATH = static_dir
LAST_SAVE_TIME = time.time()
SAVE_INTERVAL = 60

# Get Iran/Tehran timezone
IRAN_TZ = ZoneInfo("Asia/Tehran")

# arry 24 to 32 | create matplotlib (image) | save in temperory memory | save in path=static/thermal,png
def save_thermal_image(data):

    if data is None:
        DATA_IS_CORRECT = False
        return JsonResponse({"error": "Failed to fetch thermal data"}, status=500)
    else:
        DATA_IS_CORRECT = True
    # Process thermal sensor data using settings configuration
    # Handle different API response formats
    if "heatmap" in data:
        temp_data = data["heatmap"]
    else:
        return JsonResponse({"error": "Unexpected data format"}, status=500)
    arr = np.array(temp_data).reshape((settings.THERMAL_SENSOR_ROWS, settings.THERMAL_SENSOR_COLS))
    arr = np.fliplr(arr)
    with open(f"{PATH}/thermal_map.txt", "w") as f:
        for i, row in enumerate(arr):
            f.write(",".join(f"{temp:.2f}" for temp in row))
            if i < len(arr) - 1:  # Don't add newline after last row
                f.write("\n")

    norm = cv2.normalize(arr, None, 0, 255, cv2.NORM_MINMAX)
    img = np.uint8(norm)
    # Resize to maintain aspect ratio using settings configuration
    img_resized = cv2.resize(img, (settings.THERMAL_DISPLAY_WIDTH, settings.THERMAL_DISPLAY_HEIGHT), interpolation=cv2.INTER_LINEAR)
    color_img = cv2.applyColorMap(img_resized, cv2.COLORMAP_INFERNO)
    cv2.imwrite(f"{PATH}/thermal_image.jpg", color_img)
    
    # Use Iran/Tehran timezone for logging
    iran_dt = datetime.now(IRAN_TZ)
    jalali_dt = jdatetime.datetime.fromgregorian(datetime=iran_dt)
    print(f"New Image Saved - Gregorian: {iran_dt.strftime('%Y-%m-%d %H:%M:%S %Z')} - Jalali: {jalali_dt.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Auto-save probe data after saving thermal image
    global LAST_SAVE_TIME
    current_time = time.time()
    if current_time - LAST_SAVE_TIME >= SAVE_INTERVAL:
        # Auto-save probe data every minute
        try:
            auto_save_probe_data()
            LAST_SAVE_TIME = time.time()
            print(f"Data saved to database at - Gregorian: {iran_dt.strftime('%Y-%m-%d %H:%M:%S %Z')} - Jalali: {jalali_dt.strftime('%Y-%m-%d %H:%M:%S')}")
        except Exception as e:
            print(f"Error auto-saving probe data: {e}")


def api_live_new_data():
    while DATA_IS_CORRECT:
        try:
            response = requests.get(f"http://{PI_IP}", timeout=10)
            print(response.ok)
            if response.ok:
                data = response.json()
                save_thermal_image(data)
            else:
                print("Error from API:", response.status_code)
        except Exception as e:
            print("Error:", e)

        time.sleep(0.5)



api_live_new_data()