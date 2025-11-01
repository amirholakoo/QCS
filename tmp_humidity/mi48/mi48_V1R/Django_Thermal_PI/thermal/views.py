from django.shortcuts import render
from django.http import JsonResponse
import time, os, shutil, json
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
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
    return render(request,"thermal/index.html",context={"log":logs,"formuls":FORMULA})

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

        data = load_saved_inputs()
        data[temp] = value

        with open(DATA_FILE, "w") as f:
            json.dump(data, f)

        return JsonResponse({"status": "ok", "temp": temp, "value": value})
    return JsonResponse({"status": "error"}, status=400)


def temp_table(request):
    temps = calculate_formula(FORMULA)
    saved_inputs = load_saved_inputs()
    for row in temps:
        t = str(row["temp"])
        if t in saved_inputs:
            row["device"] = saved_inputs[t]
    context = {
        "temps": temps,
        "formuls": FORMULA,
    }
    return render(request, "thermal/tempandhumidity.html", context)


@csrf_exempt
def save_probe_data(request):
    """Save probe data every 1000ms"""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Extract main data
            humidity = data.get('humidity')
            temperature = data.get('temperature')
            active_formula = data.get('active_formula')
            probes_data = data.get('probes_data', {})
            
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
                probes_data=probes_data
            )
            
            return JsonResponse({
                'status': 'success',
                'id': probe_record.id,
                'timestamp': probe_record.timestamp.isoformat(),
                'probe_count': probe_count,
                'alarm_triggered': False
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
                'checked_probes': config.get_checked_probes()
            })
        else:
            return JsonResponse({
                'status': 'success',
                'active_formula': FORMULA[0],  # Default to first formula
                'probes_data': {},
                'probe_count': 0,
                'checked_probes': []
            })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


def auto_save_probe_data():
    """Automatically save probe data from thermal map file"""
    try:
        # Get current probe configuration
        config = ProbeConfiguration.objects.first()
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
        
        # Calculate averages for each probe
        total_temp = 0
        total_humidity = 0
        valid_probes = 0
        probes_data = {}
        
        # Get checked probes - if none checked, use all probes
        checked_probes = config.get_checked_probes()
        if not checked_probes:
            # Default to all probes if none checked
            checked_probes = list(range(1, config.probe_count + 1))
        
        for probe_id in checked_probes:
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
            
            # Save to database only if temperature is in range
            ProbeData.objects.create(
                humidity=round(avg_humidity, 2),
                temperature=round(avg_temp, 2),
                active_formula=config.active_formula,
                probe_count=valid_probes,
                probes_data=probes_data
            )
            
            print(f"Auto-saved probe data: {valid_probes} checked probes, avg temp: {avg_temp:.2f}°C, avg humidity: {avg_humidity:.2f}%")
            
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