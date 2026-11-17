import requests
from django.http import JsonResponse
import numpy as np
import os
import json
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
from concurrent.futures import ThreadPoolExecutor, as_completed

current_file = os.path.abspath(__file__)
BASE_DIR = os.path.dirname(os.path.dirname(current_file))
static_dir = os.path.join(BASE_DIR, "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# Add Django project path to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from thermal.views import auto_save_probe_data, update_realtime_temperature
from thermal.models import ProbeConfiguration, Sensor
DATA_IS_CORRECT = True
PATH = static_dir
# PI_IP = "172.16.1.46/data"
# PI_IP = "172.16.1.39/data"
LAST_SAVE_TIME = {}  # Per-sensor save times
SAVE_INTERVAL = 60
CONNECTION_STATUS_FILE = os.path.join(static_dir, "connection_status.json")

# Get Iran/Tehran timezone
IRAN_TZ = ZoneInfo("Asia/Tehran")

# arry 24 to 32 | create matplotlib (image) | save in temperory memory | save in path=static/thermal,png
def save_thermal_image(data, sensor):
    """Save thermal image for a specific sensor"""
    if data is None:
        return False
    
    # Process thermal sensor data using settings configuration
    # Handle different API response formats
    if "data" in data:
        temp_data = data["data"]["heatmap"]
    else:
        return False
    
    arr = np.array(temp_data).reshape((settings.THERMAL_SENSOR_ROWS, settings.THERMAL_SENSOR_COLS))
    arr = np.fliplr(arr)
    
    # Save thermal map per sensor
    thermal_map_file = f"{PATH}/thermal_map_{sensor.id}.txt"
    with open(thermal_map_file, "w") as f:
        for i, row in enumerate(arr):
            f.write(",".join(f"{temp:.2f}" for temp in row))
            if i < len(arr) - 1:  # Don't add newline after last row
                f.write("\n")

    norm = cv2.normalize(arr, None, 0, 255, cv2.NORM_MINMAX)
    img = np.uint8(norm)
    # Resize to maintain aspect ratio using settings configuration
    img_resized = cv2.resize(img, (settings.THERMAL_DISPLAY_WIDTH, settings.THERMAL_DISPLAY_HEIGHT), interpolation=cv2.INTER_LINEAR)
    color_img = cv2.applyColorMap(img_resized, cv2.COLORMAP_INFERNO)
    
    # Save image per sensor
    image_file = f"{PATH}/thermal_image_{sensor.id}.jpg"
    cv2.imwrite(image_file, color_img)
    
    # Also save as default thermal_image.jpg for the first sensor (backward compatibility)
    if sensor.id == Sensor.objects.filter(is_active=True).order_by('id').first().id:
        cv2.imwrite(f"{PATH}/thermal_image.jpg", color_img)
        # Also save default thermal_map.txt for backward compatibility
        with open(f"{PATH}/thermal_map.txt", "w") as f:
            for i, row in enumerate(arr):
                f.write(",".join(f"{temp:.2f}" for temp in row))
                if i < len(arr) - 1:
                    f.write("\n")
    
    # Use Iran/Tehran timezone for logging
    iran_dt = datetime.now(IRAN_TZ)
    jalali_dt = jdatetime.datetime.fromgregorian(datetime=iran_dt)
    print(f"[Sensor {sensor.name}] New Image Saved - Gregorian: {iran_dt.strftime('%Y-%m-%d %H:%M:%S %Z')} - Jalali: {jalali_dt.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Auto-save probe data after saving thermal image
    global LAST_SAVE_TIME
    current_time = time.time()
    sensor_id = sensor.id
    
    if sensor_id not in LAST_SAVE_TIME:
        LAST_SAVE_TIME[sensor_id] = current_time
    
    time_since_last_save = current_time - LAST_SAVE_TIME[sensor_id]
    print(f"==============[thermal_worker] Sensor {sensor.name} (ID: {sensor_id}) - Time since last save: {time_since_last_save:.1f}s (interval: {SAVE_INTERVAL}s)")
    
    if time_since_last_save >= SAVE_INTERVAL:
        # Auto-save probe data every minute
        print(f"==============[thermal_worker] Calling auto_save_probe_data for sensor {sensor.name} (ID: {sensor_id})")
        try:
            auto_save_probe_data(sensor)
            LAST_SAVE_TIME[sensor_id] = time.time()
            print(f"[Sensor {sensor.name}] Data saved to database at - Gregorian: {iran_dt.strftime('%Y-%m-%d %H:%M:%S %Z')} - Jalali: {jalali_dt.strftime('%Y-%m-%d %H:%M:%S')}")
        except Exception as e:
            print(f"==============[thermal_worker] Error calling auto_save_probe_data for sensor {sensor.name}: {e}")
            import traceback
            traceback.print_exc()
    else:
        print(f"==============[thermal_worker] Sensor {sensor.name} (ID: {sensor_id}) - Still throttled, skipping auto_save_probe_data")
    
    return True


def update_connection_status(sensor, is_connected, error_message=None):
    """Update connection status in a JSON file per sensor"""
    try:
        status_file = os.path.join(static_dir, f"connection_status_{sensor.id}.json")
        status_data = {
            "sensor_id": sensor.id,
            "sensor_name": sensor.name,
            "is_connected": is_connected,
            "last_update": datetime.now(IRAN_TZ).isoformat(),
            "error_message": error_message
        }
        with open(status_file, 'w') as f:
            json.dump(status_data, f)
        
        # Also update default connection_status.json for backward compatibility (first sensor)
        if sensor.id == Sensor.objects.filter(is_active=True).order_by('id').first().id:
            with open(CONNECTION_STATUS_FILE, 'w') as f:
                json.dump(status_data, f)
    except Exception as e:
        print(f"Error updating connection status: {e}")

def process_sensor(sensor):
    """Process data for a single sensor"""
    try:
        response = requests.get(f"http://{sensor.api_endpoint}", timeout=10)
        if response.ok:
            data = response.json()
            if save_thermal_image(data, sensor):
                update_realtime_temperature(sensor)
                update_connection_status(sensor, True, None)
                return True
            else:
                update_connection_status(sensor, False, "Failed to process thermal data")
                return False
        else:
            print(f"[Sensor {sensor.name}] Error from API: {response.status_code}")
            update_connection_status(sensor, False, f"API returned status code: {response.status_code}")
            return False
    except requests.exceptions.Timeout:
        print(f"[Sensor {sensor.name}] Error: Connection timeout")
        update_connection_status(sensor, False, "Connection timeout")
        return False
    except requests.exceptions.ConnectionError:
        print(f"[Sensor {sensor.name}] Error: Connection failed")
        update_connection_status(sensor, False, "Connection failed - Unable to reach device")
        return False
    except Exception as e:
        print(f"[Sensor {sensor.name}] Error: {e}")
        update_connection_status(sensor, False, f"Error: {str(e)}")
        return False

def api_live_new_data():
    """Main loop to fetch data from all active sensors - OPTIMIZED WITH PARALLEL PROCESSING"""
    global DATA_IS_CORRECT
    
    # Use thread pool for parallel processing
    # Adjust max_workers based on your sensor count (recommended: 3-5)
    max_workers = 5
    
    while DATA_IS_CORRECT:
        try:
            # Get all active sensors
            sensors = list(Sensor.objects.filter(is_active=True))
            
            if not sensors:
                print("No active sensors found. Waiting...")
                time.sleep(5)
                continue
            
            # Process all sensors in parallel using ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Submit all sensor processing tasks
                future_to_sensor = {
                    executor.submit(process_sensor, sensor): sensor 
                    for sensor in sensors
                }
                
                # Wait for all to complete (with timeout per sensor)
                for future in as_completed(future_to_sensor):
                    sensor = future_to_sensor[future]
                    try:
                        result = future.result(timeout=12)  # 12s timeout per sensor
                        if result:
                            print(f"[Sensor {sensor.name}] Processed successfully")
                    except Exception as e:
                        print(f"[Sensor {sensor.name}] Processing error: {e}")
            
            # Shorter sleep since we're processing in parallel
            # Reduced from 0.5s to 0.2s for faster updates
            time.sleep(0.2)
            
        except Exception as e:
            print(f"Error in main loop: {e}")
            time.sleep(1)  # Longer sleep on error to prevent rapid retries



api_live_new_data()