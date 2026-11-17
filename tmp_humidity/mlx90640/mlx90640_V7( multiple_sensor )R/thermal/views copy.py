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
import json
roll_sensor_data = None

DATA_IS_CORRECT = True
PI_IP = "192.168.221.102"
FORMULA = [
    "-0.3771*temp+26.63",
    # "-0.01632 * temp * temp + 1.30838 * temp - 18.36",
    # "-0.7444*temp+6.6",
    # "-0.0338*temp**2 + (-0.7663) * temp + 6.6305",
    # "0.0682 * temp**3 + 0.0175 * temp**2 + (-0.9209) * temp + 6.6239",
    # "-0.0163 * temp ** 4 + 0.0541 * temp**3 + 0.0662 * temp**2 + (-0.9067) * temp + 6.6123",
    # "-0.2813* temp ** 5 + (-0.311) * temp ** 4 + 1.0085 * temp ** 3 + 0.5837 * temp ** 2 + (-1.4219) * temp + 6.5605"
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
    """Main thermal view"""
    log_dir = os.path.join(settings.BASE_DIR, 'static', 'logs')
    logs = []

    if os.path.exists(log_dir):
        for filename in sorted(os.listdir(log_dir), reverse=True):
            if filename.endswith('.jpg'):
                details = filename.split("_")
                logs.append({
                    'path': f'/static/logs/{filename}',
                    'date': details[0],
                    'time': details[1].replace("-", ":"),
                    'temp': details[2].replace(".jpg", "")
                })
    
    config = ProbeConfiguration.objects.first()
    
    return render(request, "thermal/index.html", context={
        "log": logs,
        "formuls": FORMULA,
        "threshold": config.humidity_threshold if config else 7.0,
        "edge_threshold": config.edge_threshold if config else 5,
        "auto_edge_detection": config.auto_edge_detection if config else True,
        "find_edge_by_threshold": config.find_edge_by_threshold if config else True,
        "roll_number": config.roll_number if config else 0,
    })

def show_log(request):
    log_dir = os.path.join(settings.BASE_DIR, 'static', 'logs')
    logs = []

    if os.path.exists(log_dir):
        for filename in sorted(os.listdir(log_dir), reverse=True):
            if filename.endswith('.jpg'):
                details = filename.split("_")
                logs.append({'path':f'/static/logs/{filename}','date':details[0],'time':details[1].replace("-",":"),'temp':details[2].replace(".jpg","")})
    return render(request,"thermal/logs.html",context={"log":logs})

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


@csrf_exempt
def update_find_edge_by_threshold(request):
    """Toggle between threshold-based edge detection and manual positioning"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            find_edge_by_threshold = data.get('find_edge_by_threshold', True)
            config = ProbeConfiguration.objects.first()
            if config:
                config.find_edge_by_threshold = find_edge_by_threshold
                config.save(update_fields=['find_edge_by_threshold'])
                return JsonResponse({'status': 'success', 'find_edge_by_threshold': find_edge_by_threshold})
            else:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def update_manual_edge_positions(request):
    """Save manual edge positions (start_col, end_col)"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            start_col = data.get('start_col')
            end_col = data.get('end_col')
            config = ProbeConfiguration.objects.first()
            if config:
                edge_data = config.edge_data or {}
                if start_col is not None:
                    edge_data['start_col'] = int(start_col)
                if end_col is not None:
                    edge_data['end_col'] = int(end_col)
                edge_data['is_detected'] = edge_data.get('start_col') is not None and edge_data.get('end_col') is not None
                config.edge_data = edge_data
                config.save(update_fields=['edge_data'])
                return JsonResponse({'status': 'success', 'edge_data': edge_data})
            else:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
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

def edgeDetection(threshold=5, grid_data=[]):
    """Detect roll edges from thermal grid data"""
    if not grid_data:
        return None
    
    center = int(len(grid_data) / 2)
    row_data = grid_data[center]
    edge_data = {
        "start_col": None,
        "end_col": None,
        "row": center,
        "is_detected": False
    }
    
    max_temp = 0
    min_temp = 0
    for i in range(1, len(row_data)):
        diff = row_data[i] - row_data[i-1]
        
        # Detect start edge (temperature rising)
        if diff >= threshold and edge_data["start_col"] is None:
            edge_data["start_col"] = i
            max_temp = row_data[i] + threshold
            
        # Update start if temperature keeps rising
        # if row_data[i] > max_temp and edge_data["start_col"] is not None:
        #     edge_data["start_col"] = i
        #     max_temp = row_data[i] + threshold
        
        # Detect end edge (temperature falling)
        if diff < -threshold and edge_data["start_col"] is not None and edge_data["end_col"] is None:
            edge_data["end_col"] = i
    
    edge_data["is_detected"] = edge_data["start_col"] is not None and edge_data["end_col"] is not None
    return edge_data


# Track edge jumps for auto-threshold adjustment (matches old frontend logic)
_edge_jump_tracker = {
    "last_start_col": None, 
    "jump_count": 0, 
    "last_reset": None,
    "old_edge_data": None
}

def auto_adjust_threshold(config, edge_data):
    """Auto-adjust edge threshold - exactly like old frontend logic"""
    global _edge_jump_tracker
    if not config.auto_edge_detection or config.temperature < 40:
        print("temperature is low _____")
        return
    print(_edge_jump_tracker,"________________auto_adjust_threshold")
    current_time = timezone.now().timestamp()
    is_detected = edge_data and edge_data.get("is_detected", False)
    
    if not is_detected:
        # When edges are NOT detected → decrement jump_count (goes negative)
        _edge_jump_tracker["jump_count"] -= 1
        _edge_jump_tracker["old_edge_data"] = None
    else:
        # Track edge position changes (both start and end)
        if _edge_jump_tracker["old_edge_data"] is None:
            _edge_jump_tracker["old_edge_data"] = edge_data
        else:
            old_start = _edge_jump_tracker["old_edge_data"].get("start_col")
            new_start = edge_data.get("start_col")
            old_end = _edge_jump_tracker["old_edge_data"].get("end_col")
            new_end = edge_data.get("end_col")
            # If either start OR end edge changed → increment jump_count
            start_changed = old_start is not None and new_start is not None and old_start != new_start
            end_changed = old_end is not None and new_end is not None and old_end != new_end
            if start_changed or end_changed:
                _edge_jump_tracker["jump_count"] += 1
            _edge_jump_tracker["old_edge_data"] = edge_data
    
    # Reset counter every 60 seconds
    if _edge_jump_tracker["last_reset"] is None:
        _edge_jump_tracker["last_reset"] = current_time
    elif current_time - _edge_jump_tracker["last_reset"] > 60:
        _edge_jump_tracker["jump_count"] = 0
        _edge_jump_tracker["last_reset"] = current_time
        return
    
    # Auto-adjust threshold
    if _edge_jump_tracker["jump_count"] > 3:
        # Too many jumps → INCREASE threshold
        config.edge_threshold = round(config.edge_threshold + 0.1, 1)
        _edge_jump_tracker["jump_count"] = 0
        config.save(update_fields=['edge_threshold'])
        print(f"[EDGE] Threshold INCREASED to: {config.edge_threshold}")
    elif _edge_jump_tracker["jump_count"] < 0:
        # No detection → DECREASE threshold
        config.edge_threshold = round(config.edge_threshold - 0.1, 1)
        if config.edge_threshold < 1.0:
            config.edge_threshold = 1.0
        _edge_jump_tracker["jump_count"] = 0
        config.save(update_fields=['edge_threshold'])
        print(f"[EDGE] Threshold DECREASED to: {config.edge_threshold}")
    
    if config.edge_data["start_col"] > (settings.THERMAL_SENSOR_COLS // 2) :
        config.edge_threshold = round(config.edge_threshold - 0.1, 1)
    if config.edge_data["end_col"] < (settings.THERMAL_SENSOR_COLS // 2) :
        config.edge_threshold = round(config.edge_threshold + 0.1, 1)
        
def auto_save_probe_data():
    """Automatically save probe data from thermal map file (called by thermal_worker)"""
    try:
        config = ProbeConfiguration.objects.first()
        if not config or config.probe_count == 0:
            return
        
        # Throttle: only save every 60 seconds
        last_probe_data = ProbeData.objects.first()
        if last_probe_data and (timezone.now().timestamp() - last_probe_data.timestamp.timestamp() < 60):
            return
        
        # Read thermal map data
        thermal_map_path = os.path.join(settings.BASE_DIR, 'static', 'thermal_map.txt')
        if not os.path.exists(thermal_map_path):
            return
        
        with open(thermal_map_path, 'r') as f:
            lines = f.readlines()
        
        if not lines:
            return
        
        grid_data = []
        for line in lines:
            row = [float(temp) for temp in line.strip().split(',')]
            grid_data.append(row)
        
        if not grid_data:
            return
        
        # Get edge data from config (updated by update_realtime_temperature every 0.5s)
        edge_data = config.edge_data
        
        # Only save probe data if roll is detected (both edges found)
        if not edge_data or not edge_data.get("is_detected"):
            return
        
        # Get checked probes
        checked_probes = config.get_checked_probes()
        if not checked_probes:
            return
        
        # Calculate probe data
        total_temp = 0
        total_humidity = 0
        valid_probes = 0
        probes_data = {}
        
        for probe_id in checked_probes:
            probe_key = f"probe{probe_id}"
            probe_info = config.probes_data.get(probe_key, {})
            
            try:
                row = probe_info.get('y')
                col = probe_info.get('x')
                
                if row is None or col is None:
                    continue
                if not (0 <= row < len(grid_data) and 0 <= col < len(grid_data[0])):
                    continue
                
                # Calculate 3x3 average around probe point
                temp_sum = 0
                temp_count = 0
                for r in range(max(0, row-1), min(len(grid_data), row+2)):
                    for c in range(max(0, col-1), min(len(grid_data[0]), col+2)):
                        temp_sum += grid_data[r][c]
                        temp_count += 1
                
                if temp_count > 0:
                    avg_temp = temp_sum / temp_count
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
            except Exception:
                continue
        
        if valid_probes == 0:
            return
        
        # Calculate averages
        avg_temp = total_temp / valid_probes
        avg_humidity = total_humidity / valid_probes
        
        # Check temperature range alarm
        if avg_temp < 35 or avg_temp > 70:
            return
        
        # Add average data
        probes_data[f'avg{min(checked_probes)}-{max(checked_probes)}'] = {
            'temperature': round(avg_temp, 2),
            'humidity': round(avg_humidity, 2),
            'checked_probes': checked_probes,
            'formula': config.active_formula
        }
        
        # Save to database with roll_number from PLC
        ProbeData.objects.create(
            humidity=round(avg_humidity, 2),
            temperature=round(avg_temp, 2),
            active_formula=config.active_formula,
            probe_count=valid_probes,
            probes_data=probes_data,
            roll_number=config.roll_number
        )
            
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
            #print((time + filter_) , item.timestamp.timestamp())
            chart_data.append(float(f"{avg/index:.2f}"))

            if item.timestamp.tzinfo is None:
                dt = item.timestamp.replace(tzinfo=IRAN_TZ)
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
    """Manually update roll number from frontend"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            roll_number = data.get('roll_number')
            
            if roll_number is None:
                return JsonResponse({'error': 'roll_number is required'}, status=400)
            
            config = ProbeConfiguration.objects.first()
            if not config:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
            
            config.roll_number = int(roll_number)
            config.save(update_fields=['roll_number'])
            
            return JsonResponse({'status': 'success', 'roll_number': config.roll_number})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)


@csrf_exempt
def get_roll_status(request):
    """Get current roll number and edge detection data"""
    if request.method == 'GET':
        try:
            config = ProbeConfiguration.objects.first()
            if not config:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
            
            return JsonResponse({
                'status': 'success',
                'roll_number': config.roll_number or 0,
                'edge_data': config.edge_data or {},
                'edge_threshold': config.edge_threshold
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)

@csrf_exempt
def get_connection_status(request):
    """Get system connection status from thermal worker"""
    if request.method == 'GET':
        try:
            connection_status_file = os.path.join(settings.BASE_DIR, 'static', 'connection_status.json')
            
            # If file doesn't exist, assume system is not connected (worker might not have started)
            if not os.path.exists(connection_status_file):
                return JsonResponse({
                    'status': 'success',
                    'is_connected': False,
                    'error_message': 'Connection status file not found - System may not be initialized',
                    'last_update': None
                })
            
            # Read connection status from file
            with open(connection_status_file, 'r') as f:
                status_data = json.load(f)
            
            return JsonResponse({
                'status': 'success',
                'is_connected': status_data.get('is_connected', False),
                'error_message': status_data.get('error_message'),
                'last_update': status_data.get('last_update')
            })
        except Exception as e:
            #print(f"Error reading connection status: {e}")
            return JsonResponse({
                'status': 'error',
                'is_connected': False,
                'error_message': f'Error reading connection status: {str(e)}',
                'last_update': None
            })
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
                dt = item.timestamp.replace(tzinfo=IRAN_TZ)
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
                
                avg=0
                index=0
                time = item.timestamp.timestamp()
        return JsonResponse(chart_data,safe=False)
    return JsonResponse({'status': 'error'})


@csrf_exempt
def change_roll_sensor(request):
    global roll_sensor_data
    if request.method == 'POST':
        try:
            raw = request.body.decode('utf-8')
            roll_sensor_data = raw
            roll_sensor_data = json.loads(roll_sensor_data)
            #print(roll_sensor_data,"____________________________roll_sensor_data_____________________________")
            config = ProbeConfiguration.objects.first()
            # last_roll_number = ProbeData.objects.filter(roll_number=int(config.roll_number)).last()
            # if last_roll_number:
            #     if (timezone.now().timestamp() - last_roll_number.timestamp.timestamp()) > 2400:
            #         config.roll_number += 1
            #         config.save()
            return JsonResponse({'status': 'success', 'roll_sensor_data': roll_sensor_data})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method for roll changing sensor'}, status=405)


# import requests
# r = requests.get("http://172.16.1.5",params={"api_key":"456"})
# print(r.status_code)

def update_realtime_temperature():
    """Update ProbeConfiguration with real-time temperature/humidity and run edge detection"""
    from django.db import connection
    try:
        # Close stale DB connections in long-running process
        connection.close()
        config = ProbeConfiguration.objects.first()
        if not config:
            return
        
        thermal_map_path = os.path.join(settings.BASE_DIR, 'static', 'thermal_map.txt')
        if not os.path.exists(thermal_map_path):
            return
        
        with open(thermal_map_path, 'r') as f:
            lines = f.readlines()
        
        if not lines:
            return
        
        grid_data = []
        for line in lines:
            row = [float(temp) for temp in line.strip().split(',')]
            grid_data.append(row)
        
        if not grid_data:
            return
        
        # ===== Run edge detection only if find_edge_by_threshold is enabled =====
        if config.find_edge_by_threshold:
            edge_data = edgeDetection(config.edge_threshold, grid_data)
            config.edge_data = edge_data
            config.save(update_fields=['edge_data'])
            # Auto-adjust threshold if enabled
            if config.auto_edge_detection:
                auto_adjust_threshold(config, edge_data)
        # When find_edge_by_threshold=False, use existing manual edge_data positions
        # ==================================================================
        
        if config.probe_count == 0:
            return
        
        checked_probes = config.get_checked_probes()
        if not checked_probes:
            return
        
        total_temp = 0
        total_humidity = 0
        valid_probes = 0
        
        for probe_id in checked_probes:
            probe_key = f"probe{probe_id}"
            probe_info = config.probes_data.get(probe_key, {})
            
            try:
                row = probe_info.get('y')
                col = probe_info.get('x')
                
                if row is not None and col is not None and 0 <= row < len(grid_data) and 0 <= col < len(grid_data[0]):
                    temp_sum = 0
                    temp_count = 0
                    
                    for r in range(max(0, row-1), min(len(grid_data), row+2)):
                        for c in range(max(0, col-1), min(len(grid_data[0]), col+2)):
                            if 0 <= r < len(grid_data) and 0 <= c < len(grid_data[0]):
                                temp_sum += grid_data[r][c]
                                temp_count += 1
                    
                    if temp_count > 0:
                        avg_temp = temp_sum / temp_count
                        humidity = calculate_humidity_from_formula(avg_temp, config.active_formula)
                        total_temp += avg_temp
                        total_humidity += humidity
                        valid_probes += 1
            except Exception:
                continue
        
        if valid_probes > 0:
            avg_temp = total_temp / valid_probes
            avg_humidity = total_humidity / valid_probes
            
            config.temperature = round(avg_temp, 2)
            config.humidity = round(avg_humidity, 2)
            config.save(update_fields=['temperature', 'humidity'])
    except Exception as e:
        print(f"Error updating realtime temperature: {e}")


@csrf_exempt
def api_data(request):
    """Return real-time data from ProbeConfiguration (used by PLC and frontend)"""
    if request.method == 'GET':
        # PLC can update roll_number via query param
        roll_number = request.GET.get('roll_number')
        if roll_number:
            config = ProbeConfiguration.objects.first()
            if config:
                config.roll_number = int(roll_number)
                config.save(update_fields=['roll_number'])

        try:
            config = ProbeConfiguration.objects.first()
            if not config:
                return JsonResponse({'error': 'Configuration not found'}, status=404)
            
            return JsonResponse({
                'humidity': config.humidity,
                'temperature': config.temperature,
                'roll_number': config.roll_number or 0,
                'edge_data': config.edge_data or {},
                'edge_threshold': config.edge_threshold,
                'timestamp': config.updated_at.strftime("%Y-%m-%d %H:%M:%S")
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    else:
        return JsonResponse({'error': 'Invalid method'}, status=405)