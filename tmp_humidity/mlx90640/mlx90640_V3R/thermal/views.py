from django.shortcuts import render
from django.http import JsonResponse
from django.utils import timezone
import time, os, shutil, json
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime, timedelta
from django.conf import settings
from PIL import Image, ImageDraw
import jdatetime
from zoneinfo import ZoneInfo
from .models import ProbeData
from .models import ProbeConfiguration

DATA_IS_CORRECT = True
PI_IP = "192.168.221.102"
FORMULA = [
    "-0.01632 * temp * temp + 1.30838 * temp - 18.36",
    "-0.7444*temp+6.6",
    "-0.0338*temp**2 + (-0.7663) * temp + 6.6305",
    "0.0682 * temp**3 + 0.0175 * temp**2 + (-0.9209) * temp + 6.6239",
    "-0.0163 * temp ** 4 + 0.0541 * temp**3 + 0.0662 * temp**2 + (-0.9067) * temp + 6.6123",
    "-0.2813* temp ** 5 + (-0.311) * temp ** 4 + 1.0085 * temp ** 3 + 0.5837 * temp ** 2 + (-1.4219) * temp + 6.5605"
]
DATA_FILE = os.path.join(settings.BASE_DIR, "device_inputs.json")

# Get Iran/Tehran timezone
IRAN_TZ = ZoneInfo("Asia/Tehran")

def PointsData(request):
    data = ProbeData.objects.all().last()
    response = data.probes_data
    response["avg_temperature"] = data.temperature
    response["avg_humidity"] = data.humidity
    return JsonResponse(response, safe=False)

def test_view(request):
    """Simple test view to verify URL routing"""
    return JsonResponse({'status': 'success', 'message': 'Test view working'})

def thermal_view(request):
    log_dir = os.path.join(settings.BASE_DIR, 'static', 'logs')
    logs = []

    if os.path.exists(log_dir):
        for filename in sorted(os.listdir(log_dir), reverse=True):
            if filename.endswith('.jpg'):
                details = filename.split("_")
                logs.append({'path':f'/static/logs/{filename}','date':details[0],'time':details[1].replace("-",":"),'temp':details[2].replace(".jpg","")})
    
    # Get threshold from ProbeConfiguration
    config = ProbeConfiguration.objects.first()
    threshold = config.humidity_threshold if config else 7.0
    edge_threshold = config.edge_threshold if config else 5
    roll_number = config.roll_number if config else 0
    roll_last_time = ProbeData.objects.filter(roll_number=int(ProbeData.objects.first().roll_number)).last()
    roll_Remainder = (roll_last_time.timestamp.timestamp() + config.roll_Duration + config.roll_remainder) - timezone.now().timestamp() if roll_last_time else config.roll_Duration
    return render(request,"thermal/index.html",context={"log":logs,"formuls":FORMULA,"threshold":threshold,"edge_threshold":edge_threshold,"auto_edge_detection":config.auto_edge_detection,"roll_number":roll_number,"roll_Remainder":int(roll_Remainder),"roll_Duration":config.roll_Duration})

def show_log(request):
    log_dir = os.path.join(settings.BASE_DIR, 'static', 'logs')
    logs = []

    if os.path.exists(log_dir):
        for filename in sorted(os.listdir(log_dir), reverse=True):
            if filename.endswith('.jpg'):
                details = filename.split("_")
                logs.append({'path':f'/static/logs/{filename}','date':details[0],'time':details[1].replace("-",":"),'temp':details[2].replace(".jpg","")})
    return render(request,"thermal/logs.html",context={"log":logs})

@csrf_exempt
def save_log_image(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            row = data.get("row")
            col = data.get("col")
            avg_temp = data.get("avg_temp")

            # Use Iran/Tehran timezone for timestamp
            iran_dt = datetime.now(IRAN_TZ)
            jalali_dt = jdatetime.datetime.fromgregorian(datetime=iran_dt)
            timestamp = jalali_dt.strftime("%Y-%m-%d_%H-%M-%S")
            temp_part = f"{avg_temp:.1f}"
            filename = f"{timestamp}_{temp_part}.jpg"

            src_path = os.path.join("static", "thermal_image.jpg")
            dst_path = os.path.join("static/logs", filename)

            os.makedirs("static/logs", exist_ok=True)

            # draw
            with Image.open(src_path) as img:
                draw = ImageDraw.Draw(img)

                img_width, img_height = img.size
                cell_width = img_width / 80
                cell_height = img_height / 62

                left = col * cell_width
                top = row * cell_height
                right = left + cell_width
                bottom = top + cell_height

                # orange rectangle
                draw.rectangle([left, top, right, bottom], outline="white", width=2)

                img.save(dst_path)

            return JsonResponse({'status': 'ok'})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


def calculate_formula(formula):
    min_v = 480
    max_v = 600
    output = []
    targets = [i / 10.0 for i in range(min_v, max_v, 1)]
    i = 1
    for f in formula:
        for x in targets:
            newformula = f.replace("temp", str(x))
            Humidity = eval(newformula)
            if i > 1:
                for y in output:
                    if y["temp"] == x:
                        y[f"f{i}"] = f"{Humidity:.2f}"
            else:
                output.append({"temp": x, f"f{i}": f"{Humidity:.2f}"})
        i += 1
    return output


def load_saved_inputs():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    return {}


def save_input(request):
    if request.method == "POST":
        temp = str(request.POST.get("temp"))
        value = request.POST.get("value")
        x = request.POST.get("x")
        y = request.POST.get("y")

        data = load_saved_inputs()
        
        # Store with coordinates if provided, otherwise just the value (backward compatibility)
        if x is not None and y is not None:
            data[temp] = {
                "humidity": value,
                "x": int(x),
                "y": int(y)
            }
        else:
            data[temp] = value

        with open(DATA_FILE, "w") as f:
            json.dump(data, f)

        return JsonResponse({"status": "ok", "temp": temp, "value": value, "x": x, "y": y})
    return JsonResponse({"status": "error"}, status=400)


def get_saved_inputs(request):
    """Return all saved inputs from device_inputs.json"""
    data = load_saved_inputs()
    return JsonResponse({"status": "success", "inputs": data})


def update_saved_point(request):
    """Update an existing saved point"""
    if request.method == "POST":
        old_temp = str(request.POST.get("old_temp"))
        new_temp = str(request.POST.get("temp"))
        value = request.POST.get("value")
        x = request.POST.get("x")
        y = request.POST.get("y")

        data = load_saved_inputs()
        
        # Remove old entry if temperature changed
        if old_temp != new_temp and old_temp in data:
            del data[old_temp]
        
        # Add/update new entry
        if x is not None and y is not None:
            data[new_temp] = {
                "humidity": value,
                "x": int(x),
                "y": int(y)
            }
        else:
            data[new_temp] = value

        with open(DATA_FILE, "w") as f:
            json.dump(data, f)

        return JsonResponse({"status": "ok", "temp": new_temp, "value": value, "x": x, "y": y})
    return JsonResponse({"status": "error"}, status=400)


def delete_saved_point(request):
    """Delete a saved point"""
    if request.method == "POST":
        temp = str(request.POST.get("temp"))

        data = load_saved_inputs()
        
        if temp in data:
            del data[temp]
            
            with open(DATA_FILE, "w") as f:
                json.dump(data, f)
            
            return JsonResponse({"status": "ok", "message": "Point deleted"})
        else:
            return JsonResponse({"status": "error", "message": "Point not found"}, status=404)
    
    return JsonResponse({"status": "error"}, status=400)


def temp_table(request):
    temps = calculate_formula(FORMULA)
    saved_inputs = load_saved_inputs()
    for row in temps:
        t = str(row["temp"])
        if t in saved_inputs:
            value = saved_inputs[t]
            # Handle both old format (string) and new format (object with coordinates)
            if isinstance(value, dict) and "humidity" in value:
                row["device"] = value["humidity"]
            else:
                row["device"] = value
    context = {
        "temps": temps,
        "formuls": FORMULA,
    }
    return render(request, "thermal/tempandhumidity.html", context)


@csrf_exempt
def save_probe_data(request):
    """Save probe data every 1000ms"""
    if timezone.now().timestamp() - ProbeData.objects.first().timestamp.timestamp() < 60:
        return JsonResponse({'error': 'every 1 minute'}, status=400)
    print(now - ProbeData.objects.last().timestamp.timestamp(),"________________save_probe_data")
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract main data
            humidity = data.get('humidity')
            temperature = data.get('temperature')
            active_formula = data.get('active_formula')
            probes_data = data.get('probes_data', {})
            roll_number = data.get('roll_number')
            # Remove avg2-10 from probe count calculation if it exists
            probe_count = len([k for k in probes_data.keys() if not k.startswith('avg')])
            
            # Validate required fields
            if humidity is None or temperature is None or not active_formula:
                return JsonResponse({'error': 'Missing required fields'}, status=400)
            
            # Check temperature range - if out of range, don't save and return alarm status
            if temperature < 35 or temperature > 70:
                return JsonResponse({
                    'status': 'alarm',
                    'message': 'the system has switched to manual mode',
                    'temperature': temperature,
                    'humidity': humidity,
                    'alarm_triggered': True,
                    'reason': 'Temperature out of range (below 30°C or above 70°C)'
                })
            
            # Create and save probe data record only if temperature is in range
            probe_record = ProbeData.objects.create(
                humidity=humidity,
                temperature=temperature,
                active_formula=active_formula,
                probe_count=probe_count,
                probes_data=probes_data,
                roll_number=roll_number
            )
            
            return JsonResponse({
                'status': 'success',
                'id': probe_record.id,
                'timestamp': probe_record.timestamp.isoformat(),
                'probe_count': probe_count,
                'alarm_triggered': False,
                'roll_number': roll_number
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def update_probe_configuration(request):
    """Update probe configuration when client changes probes or formula"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract data
            active_formula = data.get('active_formula')
            probes_data = data.get('probes_data', {})
            checked_probes = data.get('checked_probes', [])  # New field for checked probes
            
            # Validate required fields
            if not active_formula:
                return JsonResponse({'error': 'Missing active_formula'}, status=400)
            
            # Calculate probe count excluding average data
            probe_count = len([k for k in probes_data.keys() if not k.startswith('avg')])
            
            # Create or update probe configuration
            config, created = ProbeConfiguration.objects.get_or_create(
                id=1,  # Always use ID 1 for the current configuration
                defaults={
                    'active_formula': active_formula,
                    'probes_data': probes_data,
                    'probe_count': probe_count,
                    'checked_probes': checked_probes
                }
            )
            
            if not created:
                # Update existing configuration
                config.active_formula = active_formula
                config.probes_data = probes_data
                config.probe_count = probe_count
                config.checked_probes = checked_probes
                config.save()
            
            # Calculate and save average for checked probes
            avg_data = config.calculate_checked_probes_average()
            if avg_data:
                config.save()  # Save the updated probes_data with average
            
            return JsonResponse({
                'status': 'success',
                'message': 'Probe configuration updated',
                'probe_count': probe_count,
                'active_formula': active_formula,
                'checked_probes': checked_probes,
                'average_data': avg_data
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


def get_probe_configuration(request):
    """Get current probe configuration"""
    try:
        config = ProbeConfiguration.objects.first()
        if config:
            return JsonResponse({
                'status': 'success',
                'active_formula': config.active_formula,
                'probes_data': config.probes_data,
                'probe_count': config.probe_count,
                'checked_probes': config.get_checked_probes(),
                'humidity_threshold': config.humidity_threshold,
                'edge_threshold': config.edge_threshold
            })
        else:
            return JsonResponse({
                'status': 'success',
                'active_formula': FORMULA[0],  # Default to first formula
                'probes_data': {},
                'probe_count': 0,
                'checked_probes': [],
                'humidity_threshold': 7.0,
                'edge_threshold': 5
            })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def update_threshold(request):
    """Update humidity threshold"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            threshold = data.get('threshold', 7.0)
            
            # Create or update probe configuration
            config, created = ProbeConfiguration.objects.get_or_create(
                id=1,  # Always use ID 1 for the current configuration
                defaults={
                    'active_formula': FORMULA[0],
                    'probes_data': {},
                    'probe_count': 0,
                    'checked_probes': [],
                    'humidity_threshold': threshold
                }
            )
            
            if not created:
                config.humidity_threshold = threshold
                config.save()
            
            return JsonResponse({
                'status': 'success',
                'threshold': threshold
            })
            
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def update_edge_threshold(request):
    """Update edge threshold"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            edge_threshold = data.get('edge_threshold', 5)
            config = ProbeConfiguration.objects.first()
            config.edge_threshold = edge_threshold
            config.save()
            return JsonResponse({'status': 'success', 'edge_threshold': edge_threshold})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def update_auto_edge_detection(request):
    """Update auto edge detection toggle"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            auto_edge_detection = data.get('auto_edge_detection', True)
            config = ProbeConfiguration.objects.first()
            if config:
                config.auto_edge_detection = auto_edge_detection
                config.save()
                return JsonResponse({'status': 'success', 'auto_edge_detection': auto_edge_detection})
            else:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)

# function edgeDetection(threshold=5) {
#     let all_edge_points = document.querySelectorAll('.edge-point');
#     for (const x of all_edge_points) {
#         x.remove();
#     }
#     center = gridData.length / 2;
#     data_for_edge_detection = gridData[center];
#     edge_data = {
#         start: {
#             temp: false,
#             col: false,
#             row: center,
#         },
#         end: {
#             temp: false,
#             col: false,
#             row: center,
#         }
#     }
#     let point = null;
#     for (let i = 0; i < data_for_edge_detection.length; i++) {
#         const d = data_for_edge_detection[i];
#         if (i > 0) {
#             let diff = d - data_for_edge_detection[i-1];
#             if(diff > threshold && !edge_data.start.temp) {
#                 edge_data.start.temp = d;
#                 edge_data.start.col = i;
#                 max = d+threshold;
#                 point = document.createElement("div");
#                 point.className = "edge-point";
#                 point.style.left = `${(i * cellWidth)}px`;
#                 //point.style.top = `${center * cellHeight}px`;
#                 imagePanel.children[0].appendChild(point);
#             }
#             if (edge_data.start.temp && d > max) {
#                 edge_data.start.temp = d;
#                 edge_data.start.col = i;
#                 max = d+threshold;
#                 point.remove();
#                 point = document.createElement("div");
#                 point.className = "edge-point";
#                 point.style.left = `${(i * cellWidth)}px`;
#                 //point.style.top = `${center * cellHeight}px`;
#                 imagePanel.children[0].appendChild(point);
#             }
#             if (diff < -threshold && !edge_data.end.temp) {
#                 edge_data.end.temp = d;
#                 edge_data.end.col = i;
#                 point = document.createElement("div");
#                 point.className = "edge-point";
#                 point.style.left = `${(i * cellWidth)}px`;
#                 //point.style.top = `${center * cellHeight}px`;
#                 imagePanel.children[0].appendChild(point);
#             }
#         }
#     }
#     if(edge_data.start.col && edge_data.end.col) {
#         if(!IsRollStart) {
#             console.log("startRollCountdown",IsRollStart);
#             IsRollStart = true;
#             startRollCountdown();
#         }
#     } else {
#         IsRollStart = false;
#         clearInterval(roll_countdownInterval);
#         //roll_countdownInterval = null;
#         //roll_countdownSeconds = {{roll_Duration}};
#     }
#     return edge_data;
# }

def edgeDetection(threshold=5,grid_data=[]):
    if grid_data:
        center = int(len(grid_data) / 2)
        data_for_edge_detection = grid_data[center]
        edge_data = {
            "start": {
                "temp": False,
                "col": False,
                "row": center,
            },
            "end": {
                "temp": False,
                "col": False,
                "row": center,
            }
        }
        i = 0
        min = 0
        max = 0
        for x in data_for_edge_detection:
            if i > 0:
                diff = x - data_for_edge_detection[i-1]
                if diff > threshold and not edge_data["start"]["temp"]:
                    edge_data["start"]["temp"] = x
                    edge_data["start"]["col"] = i
                    max = x+threshold
                if x > max and edge_data["start"]["temp"]:
                    edge_data["start"]["temp"] = x
                    edge_data["start"]["col"] = i
                    max = x+threshold
                if diff < -threshold and edge_data["start"]["temp"] and not edge_data["end"]["temp"]:
                    edge_data["end"]["temp"] = x
                    edge_data["end"]["col"] = i
            i+=1
        return edge_data
    return False
# thermal_map_path = os.path.join(settings.BASE_DIR, 'static', 'thermal_map.txt')
# with open(thermal_map_path, 'r') as f:
#     lines = f.readlines()
# grid_data = []
# for line in lines:
#     row = [float(temp) for temp in line.strip().split(',')]
#     grid_data.append(row)
# config = ProbeConfiguration.objects.first()
# edge_data = edgeDetection(config.edge_threshold,grid_data)
# print(edge_data)
def auto_save_probe_data():
    print("auto_save_probe_data")
    """Automatically save probe data from thermal map file"""
    try:
        # Get current probe configuration
        config = ProbeConfiguration.objects.first()
        last_probe_data = ProbeData.objects.first()
        print(last_probe_data.timestamp.timestamp(),"________________auto_save_probe_data")
        if timezone.now().timestamp() - last_probe_data.timestamp.timestamp() < 60:
            return
        print("auto_save_probe_data 2")
        if not config or config.probe_count == 0:
            return  # No probes configured
        
        # Read thermal map data
        thermal_map_path = os.path.join(settings.BASE_DIR, 'static', 'thermal_map.txt')
        if not os.path.exists(thermal_map_path):
            return  # No thermal data available
        
        # Read and parse thermal map
        with open(thermal_map_path, 'r') as f:
            lines = f.readlines()
        
        if not lines:
            return
        
        # Parse temperature data into 2D array
        grid_data = []
        for line in lines:
            row = [float(temp) for temp in line.strip().split(',')]
            grid_data.append(row)
        
        if not grid_data:
            return
        
        edge_data = edgeDetection(config.edge_threshold,grid_data)
        # Calculate averages for each probe
        if edge_data:
            print(edge_data,"________________edge_data")
            if edge_data["start"]["col"] and edge_data["end"]["col"]:
                total_temp = 0
                total_humidity = 0
                valid_probes = 0
                probes_data = {}
                
                # Get checked probes - if none checked, use all probes
                checked_probes = config.get_checked_probes()
                if not checked_probes:
                    # Default to all probes if none checked
                    return  # No probes checked
                    # checked_probes = list(range(1, config.probe_count + 1))
                
                for probe_id in checked_probes:
                    print(checked_probes)
                    probe_key = f"probe{probe_id}"
                    probe_info = config.probes_data.get(probe_key, {})
                    
                    try:
                        row = probe_info.get('y')
                        col = probe_info.get('x')
                        
                        if row is not None and col is not None and 0 <= row < len(grid_data) and 0 <= col < len(grid_data[0]):
                            # Calculate average around probe point (3x3 area for accuracy)
                            temp_sum = 0
                            temp_count = 0
                            
                            for r in range(max(0, row-1), min(len(grid_data), row+2)):
                                for c in range(max(0, col-1), min(len(grid_data[0]), col+2)):
                                    if 0 <= r < len(grid_data) and 0 <= c < len(grid_data[0]):
                                        temp_sum += grid_data[r][c]
                                        temp_count += 1
                            
                            if temp_count > 0:
                                avg_temp = temp_sum / temp_count
                                
                                # Calculate humidity using active formula
                                humidity = calculate_humidity_from_formula(avg_temp, config.active_formula)
                                
                                probes_data[probe_key] = {
                                    'x': col,
                                    'y': row,
                                    'temperature': round(avg_temp, 2),
                                    'humidity': round(humidity, 2)
                                }
                                
                                total_temp += avg_temp
                                total_humidity += humidity
                                valid_probes += 1
                                
                    except Exception as e:
                        print(f"Error processing probe {probe_id}: {e}")
                        continue
                
                if valid_probes > 0:
                    # Calculate overall averages for checked probes
                    avg_temp = total_temp / valid_probes
                    avg_humidity = total_humidity / valid_probes
                    
                    # Check temperature range - if out of range, don't save
                    if avg_temp < 35 or avg_temp > 70:
                        print(f"ALARM: Temperature out of range ({avg_temp:.2f}°C) - System switched to manual mode. Data not saved.")
                        return  # Don't save data when temperature is out of range
                    
                    # Add average data to probes_data JSON
                    probes_data[f'avg{min(checked_probes)}-{max(checked_probes)}'] = {
                        'temperature': round(avg_temp, 2),
                        'humidity': round(avg_humidity, 2),
                        'checked_probes': checked_probes,
                        'formula': config.active_formula
                    }
                    
                    
                    roll_number = config.roll_number if config else 0
                    roll_last_time = ProbeData.objects.filter(roll_number=int(ProbeData.objects.first().roll_number)).last()
                    if config.roll_remainder % 60 != 0 :
                        config.roll_remainder = 0
                    roll_Remainder = (roll_last_time.timestamp.timestamp() + config.roll_Duration + config.roll_remainder) - timezone.now().timestamp() if roll_last_time else config.roll_Duration
                    if roll_Remainder < 1 :
                        roll_Remainder = 1
                        if config.is_user_allowed_auto_change_roll_number:
                            roll_Remainder = config.roll_Duration
                            config.roll_number = ProbeData.objects.first().roll_number + 1
                            config.roll_remainder = 0
                            config.save()
                            roll_number = config.roll_number
                    # Save to database only if temperature is in range
                    ProbeData.objects.create(
                        humidity=round(avg_humidity, 2),
                        temperature=round(avg_temp, 2),
                        active_formula=config.active_formula,
                        probe_count=valid_probes,
                        probes_data=probes_data,
                        roll_number= roll_number
                    )
                    
                    print(f"Auto-saved probe data: {valid_probes} checked probes, avg temp: {avg_temp:.2f}°C, avg humidity: {avg_humidity:.2f}%")
            else:
                print("No edge data")
                roll_number = config.roll_number if config else 0
                roll_last_time = ProbeData.objects.filter(roll_number=int(ProbeData.objects.first().roll_number)).last()
                roll_Remainder = (roll_last_time.timestamp.timestamp() + config.roll_Duration + config.roll_remainder) - timezone.now().timestamp() if roll_last_time else config.roll_Duration
                if config.is_user_allowed_auto_change_roll_number:
                    print("is_user_allowed_auto_change_roll_number is true")
                    if (timezone.now().timestamp() - roll_last_time.timestamp.timestamp()) > 90:
                        config.roll_remainder += 60
                        config.save()
                        print("add 60 seconds to roll_remainder")
                    if config.roll_remainder > 1200:
                        config.roll_remainder = 1
                        config.save()
                        print("roll_remainder is greater than 1200, set to 1")
        
            
    except Exception as e:
        print(f"Error in auto_save_probe_data: {e}")


def calculate_humidity_from_formula(temperature, formula):
    """Calculate humidity from temperature using the given formula"""
    try:
        # Replace 'temp' with actual temperature value
        formula_with_value = formula.replace('temp', str(temperature))
        humidity = eval(formula_with_value)
        return max(0, min(100, humidity))  # Clamp between 0-100%
    except Exception as e:
        print(f"Error calculating humidity: {e}")
        return 0.0


def chart_view(request):
    data = ProbeData.objects.all().order_by('timestamp')
    chart_data = []
    label_data = []
    avg = 0
    index = 0
    time = None
    filter_by_week = True if "week" in request.GET else False
    filter_by_month = True if "month" in request.GET else False
    for item in data:
        timestamp = item.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        
        if time is None:
            time = item.timestamp.timestamp()
        filter_ = (24*60*60) if filter_by_week else (7*24*60*60) if filter_by_month else 60*60
        avg += item.humidity
        index += 1
        if (time + filter_) < item.timestamp.timestamp():
            print((time + filter_) , item.timestamp.timestamp())
            chart_data.append(float(f"{avg/index:.2f}"))

            if item.timestamp.tzinfo is None:
                dt = IRAN_TZ.localize(item.timestamp)
            else:
                dt = item.timestamp.astimezone(IRAN_TZ)
            jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
            label_data.append(jalali_dt.strftime('%Y/%m/%d %H:%M:%S'))
            
            avg=0
            index=0
            time = item.timestamp.timestamp()
    return render(request, "thermal/chart.html",context={"chart_data":chart_data,"label_data":label_data,"max": len(chart_data)})


@csrf_exempt
def save_roll_number(request):
    if request.method == 'POST':
        try:
            config = ProbeConfiguration.objects.first()
            config.roll_number += 1
            config.save()
            return JsonResponse({'status': 'success', 'roll_number': config.roll_number})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def get_roll_status(request):
    """Get current roll number and remaining countdown time"""
    if request.method == 'GET':
        try:
            config = ProbeConfiguration.objects.first()
            if not config:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
            
            roll_number = config.roll_number if config else 0
            roll_last_time = ProbeData.objects.filter(roll_number=int(ProbeData.objects.first().roll_number)).last()
            roll_Remainder = (roll_last_time.timestamp.timestamp() + config.roll_Duration + config.roll_remainder) - timezone.now().timestamp() if roll_last_time else config.roll_Duration
            
            # Make sure remainder is not negative
            if roll_Remainder < 1:
                roll_Remainder = 1
            
            return JsonResponse({
                'status': 'success',
                'roll_number': roll_number,
                'roll_countdown_seconds': int(roll_Remainder)
            })
        except Exception as e:
            print(e, "________________get_roll_status error")
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
def chart_info_json(request):
    if request.method == 'POST':
        
        filter_by_year = True if "year" in request.GET else False
        filter_by_week = True if "week" in request.GET else False
        filter_by_month = True if "month" in request.GET else False
        filter_by_daily_8 = True if "daily_8" in request.GET else False
        filter_by_daily_24 = True if "daily_24" in request.GET else False
        filter_time = timezone.now() - timedelta(days=365) if filter_by_year else timezone.now() - timedelta(days=30) if filter_by_month else timezone.now() - timedelta(weeks=1) if filter_by_week else timezone.now() - timedelta(hours=24) if filter_by_daily_24 else timezone.now() - timedelta(hours=8) if filter_by_daily_8 else timezone.now() - timedelta(hours=1)
        data = ProbeData.objects.filter(timestamp__gte=filter_time).order_by('timestamp')
        chart_data = {"xaxis":[],"series":[],"roll_annotations":[]}
        current_roll = None
        avg = 0
        index = 0
        time = None
        for item in data:
            timestamp = item.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            
            if item.timestamp.tzinfo is None:
                    dt = IRAN_TZ.localize(item.timestamp)
            else:
                dt = item.timestamp.astimezone(IRAN_TZ)

            if time is None:
                time = item.timestamp.timestamp()

            filter_ = 60*60 if filter_by_week or filter_by_month or filter_by_daily_8 or filter_by_daily_24 else 60
            avg += item.humidity
            index += 1
            
            if (time + filter_) < item.timestamp.timestamp():
                chart_data["series"].append(float(f"{avg/index:.2f}"))

                
                jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
                label = jalali_dt.strftime('%Y/%m/%d %H:%M:%S')
                chart_data["xaxis"].append(label)
                
                # Check if roll number changed at this data point
                if item.roll_number is not None and current_roll != item.roll_number:
                    if current_roll is not None:  # Not the first roll
                        chart_data["roll_annotations"].append({
                            'x': label,  # Use the actual label/timestamp
                            'roll_number': item.roll_number
                        })
                    current_roll = item.roll_number
                
                print(jdatetime.datetime.fromgregorian(datetime=datetime.fromtimestamp(item.timestamp.timestamp())).strftime("%a, %d %b %Y %H:%M:%S"))
                avg=0
                index=0
                time = item.timestamp.timestamp()
        return JsonResponse(chart_data,safe=False)
    return JsonResponse({'status': 'error'})