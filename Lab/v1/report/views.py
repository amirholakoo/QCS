from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta
import json
import re

from .models import ChartData
from paper.models import Paper
from pulp.models import Pulp

# Create your views here.

def process_paper_data():
    """
    Process paper data and create chart data points.
    """
    papers = Paper.objects.all().order_by('roll_number')
    created_count = 0
    
    for paper in papers:
        # Process Moisture (humidity)
        if paper.humidity is not None:
            ChartData.objects.get_or_create(
                date=paper.date,
                type='moisture',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(paper.humidity),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
        
        # Process Burst
        if paper.burst_test:
            # Try to extract numeric value from burst_test field
            burst_match = re.search(r'(\d+\.?\d*)', paper.burst_test)
            if burst_match:
                burst_value = burst_match.group(1)
                ChartData.objects.get_or_create(
                    date=paper.date,
                    type='burst',
                    roll_number=paper.roll_number,
                    defaults={
                        'value': burst_value,
                        'start_time': paper.sampling_start_time
                    }
                )
                created_count += 1
        
        # Process RCT (average of rct1 to rct5)
        rct_values = [paper.rct1, paper.rct2, paper.rct3, paper.rct4, paper.rct5]
        rct_values = [val for val in rct_values if val is not None]
        if rct_values:
            avg_rct = sum(rct_values) / len(rct_values)
            ChartData.objects.get_or_create(
                date=paper.date,
                type='rct',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(round(avg_rct, 2)),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
        
        # Process MD
        if paper.tensile_strength_md is not None:
            ChartData.objects.get_or_create(
                date=paper.date,
                type='md',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(paper.tensile_strength_md),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
        
        # Process CD
        if paper.tensile_strength_cd is not None:
            ChartData.objects.get_or_create(
                date=paper.date,
                type='cd',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(paper.tensile_strength_cd),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
        
        # Process CCT (average of cct1 to cct5)
        cct_values = [paper.cct1, paper.cct2, paper.cct3, paper.cct4, paper.cct5]
        cct_values = [val for val in cct_values if val is not None]
        if cct_values:
            avg_cct = sum(cct_values) / len(cct_values)
            ChartData.objects.get_or_create(
                date=paper.date,
                type='cct',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(round(avg_cct, 2)),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
        
        # Process GMS (real_grammage)
        if paper.real_grammage is not None:
            ChartData.objects.get_or_create(
                date=paper.date,
                type='gms',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(paper.real_grammage),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
        
        # Process CUB
        if paper.cub is not None:
            ChartData.objects.get_or_create(
                date=paper.date,
                type='cub',
                roll_number=paper.roll_number,
                defaults={
                    'value': str(paper.cub),
                    'start_time': paper.sampling_start_time
                }
            )
            created_count += 1
    
    return created_count

def process_pulp_data():
    """
    Process pulp data and create chart data points.
    """
    pulps = Pulp.objects.all().order_by('roll_number')
    created_count = 0
    
    for pulp in pulps:
        # Process pH (average of lower and upper pH)
        ph_values = []
        if pulp.lower_ph is not None:
            ph_values.append(pulp.lower_ph)
        if pulp.upper_ph is not None:
            ph_values.append(pulp.upper_ph)
        
        if ph_values:
            avg_ph = sum(ph_values) / len(ph_values)
            # Get date from paper if roll_number exists, otherwise use created_at
            if pulp.roll_number:
                try:
                    paper = Paper.objects.filter(roll_number=str(pulp.roll_number)).first()
                    if paper:
                        date = paper.date
                        start_time = paper.sampling_start_time
                    else:
                        # Convert created_at to jalali date (simplified)
                        date = pulp.created_at.strftime('%Y-%m-%d')
                        start_time = '00:00'
                except:
                    date = pulp.created_at.strftime('%Y-%m-%d')
                    start_time = '00:00'
            else:
                date = pulp.created_at.strftime('%Y-%m-%d')
                start_time = pulp.lower_sampling_time or '00:00'
            
            ChartData.objects.get_or_create(
                date=date,
                type='ph',
                roll_number=str(pulp.roll_number) if pulp.roll_number else 'N/A',
                defaults={
                    'value': str(round(avg_ph, 2)),
                    'start_time': start_time
                }
            )
            created_count += 1
    
    return created_count

@csrf_exempt
@require_http_methods(["GET", "POST"])
def chart_data_api(request):
    """
    API endpoint to get chart data and process new data.
    """
    if request.method == 'POST':
        # Process new data from paper and pulp models
        paper_count = process_paper_data()
        pulp_count = process_pulp_data()
        return JsonResponse({
            'success': True,
            'message': f'Processed {paper_count} paper data points and {pulp_count} pulp data points',
            'paper_count': paper_count,
            'pulp_count': pulp_count
        })
    
    # GET request - return chart data
    # Get all unique roll numbers and sort them numerically
    all_roll_numbers = set()
    
    # Get roll numbers from paper data
    paper_rolls = Paper.objects.values_list('roll_number', flat=True).distinct()
    for roll in paper_rolls:
        all_roll_numbers.add(roll)
    
    # Get roll numbers from pulp data
    pulp_rolls = Pulp.objects.filter(roll_number__isnull=False).values_list('roll_number', flat=True).distinct()
    for roll in pulp_rolls:
        all_roll_numbers.add(str(roll))
    
    # Convert to list and sort numerically
    roll_numbers_list = []
    for roll in all_roll_numbers:
        try:
            # Try to convert to int for proper numeric sorting
            roll_numbers_list.append(int(roll))
        except ValueError:
            # If not numeric, keep as string and add to end
            roll_numbers_list.append(roll)
    
    # Sort numerically first, then alphabetically for non-numeric
    numeric_rolls = [r for r in roll_numbers_list if isinstance(r, int)]
    string_rolls = [r for r in roll_numbers_list if isinstance(r, str)]
    numeric_rolls.sort()
    string_rolls.sort()
    sorted_roll_numbers = [str(r) for r in numeric_rolls] + string_rolls
    
    # Get all chart data
    chart_data = ChartData.objects.all()
    
    # Group data by type and roll number
    series_data = {
        'ph': {},
        'moisture': {},
        'burst': {},
        'rct': {},
        'cct': {},
        'md': {},
        'cd': {},
        'gms': {},
        'cub': {}
    }
    
    # Populate series data with actual values
    for data_point in chart_data:
        if data_point.type in series_data:
            series_data[data_point.type][data_point.roll_number] = {
                'x': data_point.roll_number,
                'y': float(data_point.value) * 25 if data_point.type == 'ph' else float(data_point.value) * 25 if data_point.type == 'moisture' else float(data_point.value) * 5 if data_point.type == 'cd' else float(data_point.value) * 3 if data_point.type == 'md' else float(data_point.value) * 2 if data_point.type == 'gms' else float(data_point.value),
                'rollNumber': data_point.roll_number,
                'samplingTime': data_point.start_time,
                'date': data_point.date,
                'type': 'paper' if data_point.type != 'ph' else 'pulp'
            }
    
    # Create complete series data with null values for missing roll numbers
    complete_series_data = {}
    for type_key, data_dict in series_data.items():
        complete_series_data[type_key] = []
        for roll_number in sorted_roll_numbers:
            if roll_number in data_dict:
                complete_series_data[type_key].append(data_dict[roll_number])
            else:
                # Add null value for missing roll number
                complete_series_data[type_key].append({
                    'x': roll_number,
                    'y': None,
                    'rollNumber': roll_number,
                    'samplingTime': '',
                    'date': '',
                    'type': 'paper' if type_key != 'ph' else 'pulp'
                })
    
    # Convert to chart series format
    series = []
    colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16', '#EC4899']
    type_names = {
        'ph': 'pH',
        'moisture': 'Moisture',
        'burst': 'Burst',
        'rct': 'RCT',
        'cct': 'CCT',
        'md': 'MD',
        'cd': 'CD',
        'gms': 'GMS',
        'cub': 'CUB'
    }
    
    for i, (type_key, data) in enumerate(complete_series_data.items()):
        # Always include series, even if all values are null
        series.append({
            'name': type_names[type_key],
            'data': data,
            'color': colors[i]
        })
    
    return JsonResponse({
        'success': True,
        'series': series,
        'roll_numbers': sorted_roll_numbers,
        'total_points': sum(len(data) for data in complete_series_data.values())
    })

@csrf_exempt
@require_http_methods(["GET"])
def clear_chart_data(request):
    """
    Clear all chart data (for testing purposes).
    """
    count = ChartData.objects.count()
    ChartData.objects.all().delete()
    
    return JsonResponse({
        'success': True,
        'message': f'Cleared {count} chart data points'
    })

@csrf_exempt
@require_http_methods(["GET"])
def debug_chart_data(request):
    """
    Debug endpoint to check chart data.
    """
    chart_data = ChartData.objects.all().order_by('roll_number')
    
    debug_info = {
        'total_records': chart_data.count(),
        'sample_records': [],
        'data_types': {},
    }
    
    # Get sample records
    for record in chart_data[:5]:
        debug_info['sample_records'].append({
            'id': record.id,
            'date': record.date,
            'type': record.type,
            'value': record.value,
            'roll_number': record.roll_number,
            'start_time': record.start_time,
        })
    
    # Count by type
    for data_type in ['ph', 'moisture', 'burst', 'rct', 'cct', 'md', 'cd', 'gms', 'cub']:
        debug_info['data_types'][data_type] = chart_data.filter(type=data_type).count()
    
    return JsonResponse(debug_info)

@csrf_exempt
@require_http_methods(["GET"])
def technical_report_data_api(request):
    """
    API endpoint to get technical report data for burst_test, gsm, humidity, and top headbox data.
    """
    # Get time filter parameter
    time_filter = request.GET.get('time_filter', 'daily')
    
    # Calculate date range based on filter
    from datetime import datetime, timedelta
    from django.utils import timezone
    
    now = timezone.now()
    if time_filter == 'daily':
        # Last 7 days
        start_date = now - timedelta(days=7)
    elif time_filter == 'weekly':
        # Last 4 weeks
        start_date = now - timedelta(weeks=4)
    elif time_filter == 'monthly':
        # Last 6 months
        start_date = now - timedelta(days=180)
    else:
        # Default to daily
        start_date = now - timedelta(days=7)
    # Get all unique roll numbers and sort them numerically
    all_roll_numbers = set()
    
    # Get roll numbers from paper data
    paper_rolls = Paper.objects.values_list('roll_number', flat=True).distinct()
    for roll in paper_rolls:
        all_roll_numbers.add(roll)
    
    # Get roll numbers from pulp data
    pulp_rolls = Pulp.objects.filter(roll_number__isnull=False).values_list('roll_number', flat=True).distinct()
    for roll in pulp_rolls:
        all_roll_numbers.add(str(roll))
    
    # Convert to list and sort numerically
    roll_numbers_list = []
    for roll in all_roll_numbers:
        try:
            # Try to convert to int for proper numeric sorting
            roll_numbers_list.append(int(roll))
        except ValueError:
            # If not numeric, keep as string and add to end
            roll_numbers_list.append(roll)
    
    # Sort numerically first, then alphabetically for non-numeric
    numeric_rolls = [r for r in roll_numbers_list if isinstance(r, int)]
    string_rolls = [r for r in roll_numbers_list if isinstance(r, str)]
    numeric_rolls.sort()
    string_rolls.sort()
    sorted_roll_numbers = [str(r) for r in numeric_rolls] + string_rolls
    
    # Get paper data filtered by date range
    papers = Paper.objects.filter(created_at__gte=start_date).order_by('roll_number')
    
    # Get pulp data filtered by date range
    pulps = Pulp.objects.filter(roll_number__isnull=False, created_at__gte=start_date).order_by('roll_number')
    
    # Group data by type and roll number
    series_data = {
        'burst': {},
        'gms': {},
        'moisture': {},
        'upper_headbox_consistency': {},
        'upper_water_filter': {},
        'upper_ph': {},
        'upper_pulp_temperature': {},
        'downpulpcount': {},
        'lower_water_filter': {},
        'lower_ph': {},
        'lower_pulp_temperature': {},
        'tensile_md': {},
        'tensile_cd': {},
        'upper_headbox_consistency_100': {},
        'downpulpcount_100': {},
        'pond8_consistency': {},
        'curtain_consistency': {},
        'thickener_consistency': {}
    }
    
    # Populate series data with paper values
    for paper in papers:
        # Process Burst Test
        if paper.burst_test:
            # Try to extract numeric value from burst_test field
            burst_match = re.search(r'(\d+\.?\d*)', paper.burst_test)
            if burst_match:
                burst_value = float(burst_match.group(1))
                series_data['burst'][paper.roll_number] = {
                    'x': paper.roll_number,
                    'y': burst_value,
                    'rollNumber': paper.roll_number,
                    'samplingStartTime': paper.sampling_start_time,
                    'samplingEndTime': paper.sampling_end_time,
                    'date': paper.date,
                    'type': 'paper'
                }
        
        # Process GSM (real_grammage)
        if paper.real_grammage is not None:
            series_data['gms'][paper.roll_number] = {
                'x': paper.roll_number,
                'y': paper.real_grammage,
                'rollNumber': paper.roll_number,
                'samplingStartTime': paper.sampling_start_time,
                'samplingEndTime': paper.sampling_end_time,
                'date': paper.date,
                'type': 'paper'
            }
        
        # Process Humidity
        if paper.humidity is not None:
            series_data['moisture'][paper.roll_number] = {
                'x': paper.roll_number,
                'y': paper.humidity * 10,
                'rollNumber': paper.roll_number,
                'samplingStartTime': paper.sampling_start_time,
                'samplingEndTime': paper.sampling_end_time,
                'date': paper.date,
                'type': 'paper'
            }
        
        # Process Tensile Strength MD
        if paper.tensile_strength_md is not None:
            series_data['tensile_md'][paper.roll_number] = {
                'x': paper.roll_number,
                'y': paper.tensile_strength_md,
                'rollNumber': paper.roll_number,
                'samplingStartTime': paper.sampling_start_time,
                'date': paper.date,
                'type': 'paper'
            }
        
        # Process Tensile Strength CD
        if paper.tensile_strength_cd is not None:
            series_data['tensile_cd'][paper.roll_number] = {
                'x': paper.roll_number,
                'y': paper.tensile_strength_cd,
                'rollNumber': paper.roll_number,
                'samplingStartTime': paper.sampling_start_time,
                'date': paper.date,
                'type': 'paper'
            }
    
    # Populate series data with pulp values
    for pulp in pulps:
        roll_number = str(pulp.roll_number)
        
        # Get date from paper if roll_number exists, otherwise use created_at
        try:
            paper = Paper.objects.filter(roll_number=roll_number).first()
            if paper:
                date = paper.date
            else:
                # Convert created_at to jalali date (simplified)
                date = pulp.created_at.strftime('%Y-%m-%d')
        except:
            date = pulp.created_at.strftime('%Y-%m-%d')
        
        # Process Upper Headbox Consistency
        if pulp.upper_headbox_consistency is not None:
            series_data['upper_headbox_consistency'][roll_number] = {
                'x': roll_number,
                'y': pulp.upper_headbox_consistency * 100,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Upper Water Filter
        if pulp.upper_water_filter is not None:
            series_data['upper_water_filter'][roll_number] = {
                'x': roll_number,
                'y': pulp.upper_water_filter * 100,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Upper pH
        if pulp.upper_ph is not None:
            series_data['upper_ph'][roll_number] = {
                'x': roll_number,
                'y': pulp.upper_ph * 10,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Upper Pulp Temperature
        if pulp.upper_pulp_temperature is not None:
            series_data['upper_pulp_temperature'][roll_number] = {
                'x': roll_number,
                'y': pulp.upper_pulp_temperature,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Down Pulp Count
        if pulp.downpulpcount is not None:
            series_data['downpulpcount'][roll_number] = {
                'x': roll_number,
                'y': pulp.downpulpcount * 100,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Lower Water Filter
        if pulp.lower_water_filter is not None:
            series_data['lower_water_filter'][roll_number] = {
                'x': roll_number,
                'y': pulp.lower_water_filter * 100,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Lower pH
        if pulp.lower_ph is not None:
            series_data['lower_ph'][roll_number] = {
                'x': roll_number,
                'y': pulp.lower_ph * 10,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Lower Pulp Temperature
        if pulp.lower_pulp_temperature is not None:
            series_data['lower_pulp_temperature'][roll_number] = {
                'x': roll_number,
                'y': pulp.lower_pulp_temperature,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Upper Headbox Consistency * 100
        if pulp.upper_headbox_consistency is not None:
            series_data['upper_headbox_consistency_100'][roll_number] = {
                'x': roll_number,
                'y': pulp.upper_headbox_consistency * 100,
                'rollNumber': roll_number,
                'samplingStartTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Down Pulp Count * 100
        if pulp.downpulpcount is not None:
            series_data['downpulpcount_100'][roll_number] = {
                'x': roll_number,
                'y': pulp.downpulpcount * 100,
                'rollNumber': roll_number,
                'samplingStartTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Pond 8 Consistency
        if pulp.pond8_consistency is not None:
            series_data['pond8_consistency'][roll_number] = {
                'x': roll_number,
                'y': pulp.pond8_consistency,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Curtain Consistency
        if pulp.curtain_consistency is not None:
            series_data['curtain_consistency'][roll_number] = {
                'x': roll_number,
                'y': pulp.curtain_consistency,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
        
        # Process Thickener Consistency
        if pulp.thickener_consistency is not None:
            series_data['thickener_consistency'][roll_number] = {
                'x': roll_number,
                'y': pulp.thickener_consistency,
                'rollNumber': roll_number,
                'lowerSamplingTime': pulp.lower_sampling_time or '',
                'date': date,
                'type': 'pulp'
            }
    
    # Create complete series data with null values for missing roll numbers
    complete_series_data = {}
    for type_key, data_dict in series_data.items():
        complete_series_data[type_key] = []
        for roll_number in sorted_roll_numbers:
            if roll_number in data_dict:
                complete_series_data[type_key].append(data_dict[roll_number])
            else:
                # Add null value for missing roll number
                complete_series_data[type_key].append({
                    'x': roll_number,
                    'y': None,
                    'rollNumber': roll_number,
                    'samplingStartTime': '',
                    'samplingEndTime': '',
                    'lowerSamplingTime': '',
                    'date': '',
                    'type': 'paper' if type_key in ['burst', 'gms', 'moisture'] else 'pulp'
                })
    
    # Convert to chart series format
    series = []
    colors = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#F59E0B', '#8B5CF6', '#3B82F6', '#FF9800', '#8B5CF6', '#84CC16', '#F97316', '#EC4899', '#06B6D4']  # Different colors for each series
    type_names = {
        'burst': 'تست برست',
        'gms': 'گراماژ',
        'moisture': 'رطوبت',
        'upper_headbox_consistency': 'غلظت هدباکس بالا',
        'upper_water_filter': 'فیلتر آب بالا',
        'upper_ph': 'pH بالا',
        'upper_pulp_temperature': 'دمای خمیر بالا',
        'downpulpcount': 'کانس خمیر پایین',
        'lower_water_filter': 'فیلتر آب پایین',
        'lower_ph': 'pH پایین',
        'lower_pulp_temperature': 'دمای خمیر پایین',
        'tensile_md': 'MD',
        'tensile_cd': 'CD',
        'upper_headbox_consistency_100': 'غلظت هدباکس بالا × 100',
        'downpulpcount_100': 'کانس خمیر پایین × 100',
        'pond8_consistency': 'کانس حوض ۸',
        'curtain_consistency': 'کردان',
        'thickener_consistency': 'تیکنر'
    }
    
    for i, (type_key, data) in enumerate(complete_series_data.items()):
        # Always include series, even if all values are null
        series.append({
            'name': type_names[type_key],
            'data': data,
            'color': colors[i]
        })
    
    return JsonResponse({
        'success': True,
        'series': series,
        'roll_numbers': sorted_roll_numbers,
        'total_points': sum(len(data) for data in complete_series_data.values())
    })



