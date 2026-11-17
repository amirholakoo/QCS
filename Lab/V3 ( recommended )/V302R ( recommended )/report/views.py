from django.shortcuts import render
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
from django.db.models import Q, Max, Min, Count, Sum
from django.utils import timezone
from django.db import OperationalError
from datetime import datetime, timedelta
import json
import re
import jdatetime
import requests
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter
import csv

from .models import ChartData, PLCKey, RollPLCData, PLCColumnPreference
from paper.models import Paper
from material.models import Material
from pulp.models import Pulp, pulp_Sampling_Location_names

# Create your views here.

def process_paper_data():
    """
    Process paper data and create chart data points.
    """
    papers = Paper.objects.filter(is_delete=False).order_by('roll_number')
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
    pulps = Pulp.objects.filter(is_delete=False).order_by('roll_number')
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
                    paper = Paper.objects.filter(is_delete=False, roll_number=str(pulp.roll_number)).first()
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
    paper_rolls = Paper.objects.filter(is_delete=False).values_list('roll_number', flat=True).distinct()
    for roll in paper_rolls:
        all_roll_numbers.add(roll)
    
    # Get roll numbers from pulp data
    pulp_rolls = Pulp.objects.filter(is_delete=False, roll_number__isnull=False).values_list('roll_number', flat=True).distinct()
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
    paper_rolls = Paper.objects.filter(is_delete=False).values_list('roll_number', flat=True).distinct()
    for roll in paper_rolls:
        all_roll_numbers.add(roll)
    
    # Get roll numbers from pulp data
    pulp_rolls = Pulp.objects.filter(is_delete=False, roll_number__isnull=False).values_list('roll_number', flat=True).distinct()
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
    papers = Paper.objects.filter(is_delete=False, created_at__gte=start_date).order_by('roll_number')
    
    # Get pulp data filtered by date range
    pulps = Pulp.objects.filter(is_delete=False, roll_number__isnull=False, created_at__gte=start_date).order_by('roll_number')
    
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
            paper = Paper.objects.filter(is_delete=False, roll_number=roll_number).first()
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


@csrf_exempt
@require_http_methods(["GET"])
def dashboard_stats_api(request):
    """
    API endpoint to get dashboard statistics for daily, weekly, monthly, and overall periods.
    Returns highest/lowest values for grammage, humidity, and headbox fields, plus total production.
    """
    
    def days_since_saturday(jalali_dt):
        """Iran week: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6"""
        w = jalali_dt.weekday()
        return w
        #return (w + 2) % 7

    def get_shamsi_date_range(period):
        """Get date range for current period in Shamsi calendar (Iran week: Sat–Fri)"""
        now_tehran = timezone.localtime(timezone.now())
        now_jalali = jdatetime.datetime.fromgregorian(datetime=now_tehran)
        
        if period == 'daily':
            start_date = now_jalali.strftime('%Y-%m-%d')
            end_date = start_date
        elif period == 'weekly':
            d = days_since_saturday(now_jalali)
            start_of_week = now_jalali - jdatetime.timedelta(days=d)
            start_date = start_of_week.strftime('%Y-%m-%d')
            end_date = now_jalali.strftime('%Y-%m-%d')
        elif period == 'monthly':
            # Current month
            start_date = now_jalali.strftime('%Y-%m-01')
            end_date = now_jalali.strftime('%Y-%m-%d')
        else:  # overall
            start_date = None
            end_date = None
        
        return start_date, end_date
    
    def filter_papers_by_period(papers, period):
        """Filter paper records by period"""
        if period == 'overall':
            return papers
        
        start_date, end_date = get_shamsi_date_range(period)
        return papers.filter(date__gte=start_date, date__lte=end_date)
    
    def filter_pulps_by_period(pulps, period):
        """Filter pulp records by period (Iran: Tehran tz, week Sat–Fri, month Jalali)"""
        
        now = timezone.localtime(timezone.now())
        now_jalali = jdatetime.datetime.fromgregorian(datetime=now)
        if period == 'daily':
            start_datetime = now.replace(hour=0, minute=0, second=0, microsecond=0)
            return pulps.filter(created_at__gte=start_datetime)
        elif period == 'weekly':
            d = days_since_saturday(now_jalali)
            print(d)
            start_of_week = now - timedelta(days=d)
            start_datetime = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            return pulps.filter(created_at__gte=start_datetime)
        elif period == 'monthly':
            start_jalali = jdatetime.datetime(now_jalali.year, now_jalali.month, 1, 0, 0, 0)
            start_gregorian = start_jalali.togregorian()
            start_datetime = timezone.make_aware(start_gregorian)
            return pulps.filter(created_at__gte=start_datetime)
        else:  # overall
            return pulps
    
    def calculate_stats(papers, pulps):
        """Calculate highest/lowest for all metrics"""
        stats = {}
        
        # Paper metrics
        if papers.exists():
            # Grammage
            grammage_values = papers.filter(real_grammage__isnull=False)
            if grammage_values.exists():
                stats['grammage'] = {
                    'highest': grammage_values.aggregate(Max('real_grammage'))['real_grammage__max'],
                    'lowest': grammage_values.aggregate(Min('real_grammage'))['real_grammage__min'],
                }
            else:
                stats['grammage'] = {'highest': None, 'lowest': None}
            
            # Humidity
            humidity_values = papers.filter(humidity__isnull=False)
            if humidity_values.exists():
                stats['humidity'] = {
                    'highest': humidity_values.aggregate(Max('humidity'))['humidity__max'],
                    'lowest': humidity_values.aggregate(Min('humidity'))['humidity__min'],
                }
            else:
                stats['humidity'] = {'highest': None, 'lowest': None}
            
            # BURST (extract numeric value from burst_test field)
            burst_values = []
            for paper in papers.filter(burst_test__isnull=False):
                if paper.burst_test:
                    burst_match = re.search(r'(\d+\.?\d*)', paper.burst_test)
                    if burst_match:
                        try:
                            burst_values.append(float(burst_match.group(1)))
                        except ValueError:
                            pass
            if burst_values:
                stats['burst'] = {
                    'highest': max(burst_values),
                    'lowest': min(burst_values),
                }
            else:
                stats['burst'] = {'highest': None, 'lowest': None}
            
            # COBB
            cobb_values = papers.filter(cub__isnull=False)
            if cobb_values.exists():
                stats['cobb'] = {
                    'highest': cobb_values.aggregate(Max('cub'))['cub__max'],
                    'lowest': cobb_values.aggregate(Min('cub'))['cub__min'],
                }
            else:
                stats['cobb'] = {'highest': None, 'lowest': None}
            
            # MD (Tensile Strength MD)
            md_values = papers.filter(tensile_strength_md__isnull=False)
            if md_values.exists():
                stats['md'] = {
                    'highest': md_values.aggregate(Max('tensile_strength_md'))['tensile_strength_md__max'],
                    'lowest': md_values.aggregate(Min('tensile_strength_md'))['tensile_strength_md__min'],
                }
            else:
                stats['md'] = {'highest': None, 'lowest': None}
            
            # CD (Tensile Strength CD)
            cd_values = papers.filter(tensile_strength_cd__isnull=False)
            if cd_values.exists():
                stats['cd'] = {
                    'highest': cd_values.aggregate(Max('tensile_strength_cd'))['tensile_strength_cd__max'],
                    'lowest': cd_values.aggregate(Min('tensile_strength_cd'))['tensile_strength_cd__min'],
                }
            else:
                stats['cd'] = {'highest': None, 'lowest': None}
            
            # RCT (Average of rct1-5)
            rct_values = []
            for paper in papers:
                paper_rct_values = [paper.rct1, paper.rct2, paper.rct3, paper.rct4, paper.rct5]
                paper_rct_values = [val for val in paper_rct_values if val is not None]
                if paper_rct_values:
                    rct_values.append(sum(paper_rct_values) / len(paper_rct_values))
            if rct_values:
                stats['rct'] = {
                    'highest': max(rct_values),
                    'lowest': min(rct_values),
                }
            else:
                stats['rct'] = {'highest': None, 'lowest': None}

            tears_values = papers.filter(NumberOfTears__isnull=False)
            if tears_values.exists():
                stats['number_of_tears_total'] = tears_values.aggregate(Sum('NumberOfTears'))['NumberOfTears__sum'] or 0
            else:
                stats['number_of_tears_total'] = 0
        else:
            stats['grammage'] = {'highest': None, 'lowest': None}
            stats['number_of_tears_total'] = 0
            stats['humidity'] = {'highest': None, 'lowest': None}
            stats['burst'] = {'highest': None, 'lowest': None}
            stats['cobb'] = {'highest': None, 'lowest': None}
            stats['md'] = {'highest': None, 'lowest': None}
            stats['cd'] = {'highest': None, 'lowest': None}
            stats['rct'] = {'highest': None, 'lowest': None}
        
        # Pulp metrics
        if pulps.exists():
            # Lower Wire Stats (آمار توری پایین)
            # Down pulp count (کانس خمیر پایین)
            downpulpcount_values = pulps.filter(downpulpcount__isnull=False)
            if downpulpcount_values.exists():
                stats['downpulpcount'] = {
                    'highest': downpulpcount_values.aggregate(Max('downpulpcount'))['downpulpcount__max'],
                    'lowest': downpulpcount_values.aggregate(Min('downpulpcount'))['downpulpcount__min'],
                }
            else:
                stats['downpulpcount'] = {'highest': None, 'lowest': None}
            
            # Lower water filter (کانس توری پایین)
            lower_water_filter_values = pulps.filter(lower_water_filter__isnull=False)
            if lower_water_filter_values.exists():
                stats['lower_water_filter'] = {
                    'highest': lower_water_filter_values.aggregate(Max('lower_water_filter'))['lower_water_filter__max'],
                    'lowest': lower_water_filter_values.aggregate(Min('lower_water_filter'))['lower_water_filter__min'],
                }
            else:
                stats['lower_water_filter'] = {'highest': None, 'lowest': None}
            
            # Lower headbox freeness (فرینس پایین)
            lower_headbox_freeness_values = pulps.filter(lower_headbox_freeness__isnull=False)
            if lower_headbox_freeness_values.exists():
                stats['lower_headbox_freeness'] = {
                    'highest': lower_headbox_freeness_values.aggregate(Max('lower_headbox_freeness'))['lower_headbox_freeness__max'],
                    'lowest': lower_headbox_freeness_values.aggregate(Min('lower_headbox_freeness'))['lower_headbox_freeness__min'],
                }
            else:
                stats['lower_headbox_freeness'] = {'highest': None, 'lowest': None}
            
            # Lower pH (پایین pH)
            lower_ph_values = pulps.filter(lower_ph__isnull=False)
            if lower_ph_values.exists():
                stats['lower_ph'] = {
                    'highest': lower_ph_values.aggregate(Max('lower_ph'))['lower_ph__max'],
                    'lowest': lower_ph_values.aggregate(Min('lower_ph'))['lower_ph__min'],
                }
            else:
                stats['lower_ph'] = {'highest': None, 'lowest': None}
            
            # Lower pulp temperature (دمای پایین)
            lower_pulp_temperature_values = pulps.filter(lower_pulp_temperature__isnull=False)
            if lower_pulp_temperature_values.exists():
                stats['lower_pulp_temperature'] = {
                    'highest': lower_pulp_temperature_values.aggregate(Max('lower_pulp_temperature'))['lower_pulp_temperature__max'],
                    'lowest': lower_pulp_temperature_values.aggregate(Min('lower_pulp_temperature'))['lower_pulp_temperature__min'],
                }
            else:
                stats['lower_pulp_temperature'] = {'highest': None, 'lowest': None}
            
            # Upper Wire Stats (آمار توری بالا)
            # Upper headbox consistency (کانس توری بالا)
            upper_headbox_consistency_values = pulps.filter(upper_headbox_consistency__isnull=False)
            if upper_headbox_consistency_values.exists():
                stats['upper_headbox_consistency'] = {
                    'highest': upper_headbox_consistency_values.aggregate(Max('upper_headbox_consistency'))['upper_headbox_consistency__max'],
                    'lowest': upper_headbox_consistency_values.aggregate(Min('upper_headbox_consistency'))['upper_headbox_consistency__min'],
                }
            else:
                stats['upper_headbox_consistency'] = {'highest': None, 'lowest': None}
            
            # Upper water filter (کانس توری بالا - filter)
            upper_water_filter_values = pulps.filter(upper_water_filter__isnull=False)
            if upper_water_filter_values.exists():
                stats['upper_water_filter'] = {
                    'highest': upper_water_filter_values.aggregate(Max('upper_water_filter'))['upper_water_filter__max'],
                    'lowest': upper_water_filter_values.aggregate(Min('upper_water_filter'))['upper_water_filter__min'],
                }
            else:
                stats['upper_water_filter'] = {'highest': None, 'lowest': None}
            
            # Upper headbox freeness (فرینس بالا)
            upper_headbox_freeness_values = pulps.filter(upper_headbox_freeness__isnull=False)
            if upper_headbox_freeness_values.exists():
                stats['upper_headbox_freeness'] = {
                    'highest': upper_headbox_freeness_values.aggregate(Max('upper_headbox_freeness'))['upper_headbox_freeness__max'],
                    'lowest': upper_headbox_freeness_values.aggregate(Min('upper_headbox_freeness'))['upper_headbox_freeness__min'],
                }
            else:
                stats['upper_headbox_freeness'] = {'highest': None, 'lowest': None}
            
            # Upper pH (بالا pH)
            upper_ph_values = pulps.filter(upper_ph__isnull=False)
            if upper_ph_values.exists():
                stats['upper_ph'] = {
                    'highest': upper_ph_values.aggregate(Max('upper_ph'))['upper_ph__max'],
                    'lowest': upper_ph_values.aggregate(Min('upper_ph'))['upper_ph__min'],
                }
            else:
                stats['upper_ph'] = {'highest': None, 'lowest': None}
            
            # Upper pulp temperature (دمای بالا)
            upper_pulp_temperature_values = pulps.filter(upper_pulp_temperature__isnull=False)
            if upper_pulp_temperature_values.exists():
                stats['upper_pulp_temperature'] = {
                    'highest': upper_pulp_temperature_values.aggregate(Max('upper_pulp_temperature'))['upper_pulp_temperature__max'],
                    'lowest': upper_pulp_temperature_values.aggregate(Min('upper_pulp_temperature'))['upper_pulp_temperature__min'],
                }
            else:
                stats['upper_pulp_temperature'] = {'highest': None, 'lowest': None}
            
            # Pulp Pool Stats (آمار خمیر حوضها)
            # Pond 8 consistency (حوض 8)
            pond8_consistency_values = pulps.filter(pond8_consistency__isnull=False)
            if pond8_consistency_values.exists():
                stats['pond8_consistency'] = {
                    'highest': pond8_consistency_values.aggregate(Max('pond8_consistency'))['pond8_consistency__max'],
                    'lowest': pond8_consistency_values.aggregate(Min('pond8_consistency'))['pond8_consistency__min'],
                }
            else:
                stats['pond8_consistency'] = {'highest': None, 'lowest': None}
            
            # Curtain consistency (کردان)
            curtain_consistency_values = pulps.filter(curtain_consistency__isnull=False)
            if curtain_consistency_values.exists():
                stats['curtain_consistency'] = {
                    'highest': curtain_consistency_values.aggregate(Max('curtain_consistency'))['curtain_consistency__max'],
                    'lowest': curtain_consistency_values.aggregate(Min('curtain_consistency'))['curtain_consistency__min'],
                }
            else:
                stats['curtain_consistency'] = {'highest': None, 'lowest': None}
            
            # Thickener consistency (تیکنر)
            thickener_consistency_values = pulps.filter(thickener_consistency__isnull=False)
            if thickener_consistency_values.exists():
                stats['thickener_consistency'] = {
                    'highest': thickener_consistency_values.aggregate(Max('thickener_consistency'))['thickener_consistency__max'],
                    'lowest': thickener_consistency_values.aggregate(Min('thickener_consistency'))['thickener_consistency__min'],
                }
            else:
                stats['thickener_consistency'] = {'highest': None, 'lowest': None}
        else:
            # Initialize all stats to None if no pulp data
            stats['downpulpcount'] = {'highest': None, 'lowest': None}
            stats['lower_water_filter'] = {'highest': None, 'lowest': None}
            stats['lower_headbox_freeness'] = {'highest': None, 'lowest': None}
            stats['lower_ph'] = {'highest': None, 'lowest': None}
            stats['lower_pulp_temperature'] = {'highest': None, 'lowest': None}
            stats['upper_headbox_consistency'] = {'highest': None, 'lowest': None}
            stats['upper_water_filter'] = {'highest': None, 'lowest': None}
            stats['upper_headbox_freeness'] = {'highest': None, 'lowest': None}
            stats['upper_ph'] = {'highest': None, 'lowest': None}
            stats['upper_pulp_temperature'] = {'highest': None, 'lowest': None}
            stats['pond8_consistency'] = {'highest': None, 'lowest': None}
            stats['curtain_consistency'] = {'highest': None, 'lowest': None}
            stats['thickener_consistency'] = {'highest': None, 'lowest': None}
        
        # Total production (count of paper records)
        stats['total_production'] = papers.count()
        
        return stats
    
    # Calculate stats for each period
    all_papers = Paper.objects.filter(is_delete=False)
    all_pulps = Pulp.objects.filter(is_delete=False)
    
    result = {
        'daily': calculate_stats(
            filter_papers_by_period(all_papers, 'daily'),
            filter_pulps_by_period(all_pulps, 'daily')
        ),
        'weekly': calculate_stats(
            filter_papers_by_period(all_papers, 'weekly'),
            filter_pulps_by_period(all_pulps, 'weekly')
        ),
        'monthly': calculate_stats(
            filter_papers_by_period(all_papers, 'monthly'),
            filter_pulps_by_period(all_pulps, 'monthly')
        ),
        'overall': calculate_stats(
            filter_papers_by_period(all_papers, 'overall'),
            filter_pulps_by_period(all_pulps, 'overall')
        ),
    }
    
    return JsonResponse({
        'success': True,
        'data': result
    })


@csrf_exempt
@require_http_methods(["GET"])
def complete_report_export_csv(request):
    """
    Streaming CSV export for complete report (paper + pulp), matching the XLSX layout.
    """
    # Get date range filters (Shamsi dates)
    date_from = request.GET.get('date_from', None)
    date_to = request.GET.get('date_to', None)

    # Get other filters
    filter_shift = request.GET.get('shift', None)
    filter_production_line = request.GET.get('ProductionLine', None)
    sort_field = request.GET.get('sort_by', '-created_at')

    papers = Paper.objects.filter(is_delete=False)
    if date_from:
        papers = papers.filter(date__gte=date_from)
    if date_to:
        papers = papers.filter(date__lte=date_to)
    if filter_shift:
        papers = papers.filter(shift=filter_shift)
    if filter_production_line:
        try:
            papers = papers.filter(ProductionLine=int(filter_production_line))
        except (TypeError, ValueError):
            pass

    if sort_field.startswith('-'):
        papers = papers.order_by(sort_field[1:]).reverse()
    else:
        papers = papers.order_by(sort_field)

    pulps = Pulp.objects.filter(is_delete=False)
    location_names = list(pulp_Sampling_Location_names.objects.all().order_by('id'))

    materials = Material.objects.filter(is_delete=False)
    material_map = {str(material.id): material.material_name for material in materials}

    def format_material_usage(material_usage_json):
        if not material_usage_json:
            return ''
        try:
            material_usage = json.loads(material_usage_json)
            formatted_items = []
            for material_id, data in material_usage.items():
                if isinstance(data, dict) and 'val' in data:
                    material_name = material_map.get(material_id, f'Material {material_id}')
                    amount = data.get('val', 0)
                    part = f'{material_name}: {amount}'
                    if data.get('Soluble_in_water') is not None and str(data.get('Soluble_in_water')).strip() != '':
                        part += f" (محلول در آب: {data.get('Soluble_in_water')})"
                    formatted_items.append(part)
            return ', '.join(formatted_items)
        except (json.JSONDecodeError, TypeError):
            return material_usage_json

    def to_jalali_datetime(dt):
        if not dt:
            return ''
        try:
            jalali_dt = jdatetime.datetime.fromgregorian(datetime=dt)
            return jalali_dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else ''

    def extract_date(dateTimeStr):
        if not dateTimeStr:
            return ''
        date_part = str(dateTimeStr).split('T')[0].split(' ')[0]
        return date_part

    def time_to_minutes(time_str):
        if not time_str:
            return 0
        try:
            parts = str(time_str).split(':')
            hours = int(parts[0]) if len(parts) > 0 else 0
            minutes = int(parts[1]) if len(parts) > 1 else 0
            return hours * 60 + minutes
        except:
            return 0

    def is_time_between(time, start_time, end_time):
        time_minutes = time_to_minutes(time)
        start_minutes = time_to_minutes(start_time)
        end_minutes = time_to_minutes(end_time)
        return time_minutes >= start_minutes and time_minutes <= end_minutes

    # Build headers matching XLSX
    base_paper_headers_before_plc = [
        'نوع رکورد','شماره رول','خط تولید','تاریخ','زمان شروع نمونه‌گیری','زمان پایان نمونه‌گیری','شیفت',
        'نام مسئول','نوع کاغذ','عرض کاغذ','گراماژ','رطوبت','خاکستر','کاب','پروفایل','جزئیات پروفایل',
        'burst','MD','CD','CCT','RCT','پارگی','زمان پارگی','زمان وقفه (دقیقه)','علت پارگی',
    ]
    pref = PLCColumnPreference.objects.first()
    if pref and pref.visible_keys:
        plc_keys = list(PLCKey.objects.filter(id__in=pref.visible_keys).order_by('order_index', 'fa_name'))
    else:
        plc_keys = list(PLCKey.objects.all().order_by('order_index', 'fa_name'))
    plc_headers = [pk.fa_name or pk.name or pk.key for pk in plc_keys]
    base_paper_headers_after_plc = [
        'کالندر','سرعت','مواد','دمای سیلندر (قبل/بعد)','دمای کاغذ (نشاسته/پوپ ریل)','دمای نشاسته/خشک کن ۳','غلظت','رقیق‌ساز',
    ]
    paper_headers = base_paper_headers_before_plc + plc_headers + base_paper_headers_after_plc

    pulp_headers = [
        'زمان نمونه‌گیری','کانس خمیر پایین','کانس توری پایین','فرینس خمیر پایین','pH پایین','دمای خمیر پایین',
        'کانس خمیر بالا','کانس توری بالا','فرینس خمیر بالا','pH بالا','دمای خمیر بالا','حوض ۸','کردان','تیکنر',
    ]

    location_headers = [loc.title for loc in location_names]
    headers = paper_headers + pulp_headers + location_headers + ['تاریخ ایجاد']

    production_line_map = {2: 'PM2', 3: 'PM3', 4: 'PM4', 0: 'مشترک'}
    shift_map = {'day': 'روزانه', 'night': 'شبانه'}
    profile_map = {
        '+1g': '+۱g-', '+2g': '+۲g-', '+3g': '+۳g-', '+4g': '+۴g-', '>5g': 'بیشتر از 5 گرم'
    }

    # Preload PLC data
    plc_map = {
        str(obj.roll_number): obj
        for obj in RollPLCData.objects.filter(roll_number__in=papers.values_list('roll_number', flat=True))
    }

    class Echo:
        def write(self, value):
            return value

    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)

    def stream():
        yield '\ufeff'
        yield writer.writerow(headers)

        for paper in papers:
            # Build paper row
            row = []
            row.append('کاغذ')
            row.append(paper.roll_number or '')
            row.append(production_line_map.get(paper.ProductionLine, '') if paper.ProductionLine else '')
            row.append(paper.date or '')
            row.append(paper.sampling_start_time or '')
            row.append(paper.sampling_end_time or '')
            row.append(shift_map.get(paper.shift, '') if paper.shift else '')
            row.append(paper.responsible_person_name or '')
            row.append(paper.PaperType.name if paper.PaperType else '')
            row.append(paper.paper_size or '')
            row.append(paper.real_grammage or '')
            row.append(paper.humidity or '')
            row.append(paper.ash_percentage or '')
            row.append(paper.cub or '')
            row.append(profile_map.get(paper.profile, paper.profile or '') if paper.profile else '')

            # profile_details
            profile_details_str = ''
            if paper.profile_details:
                try:
                    if isinstance(paper.profile_details, str):
                        profile_details = json.loads(paper.profile_details)
                    else:
                        profile_details = paper.profile_details
                    if profile_details:
                        items = []
                        for key in sorted(profile_details.keys(), key=lambda x: int(x) if x.isdigit() else 0):
                            value = profile_details[key]
                            if value is not None:
                                label = key if key != '1' and key != '24' else ('1 ( سالن )' if key == '1' else '24 ( دیوار-دیوار )')
                                items.append(f'{label}: {value}')
                        profile_details_str = ', '.join(items)
                except (json.JSONDecodeError, TypeError, AttributeError):
                    pass
            row.append(profile_details_str)

            row.append(paper.burst_test or '')
            row.append(paper.tensile_strength_md or '')
            row.append(paper.tensile_strength_cd or '')
            # CCT
            cct_values = [paper.cct1, paper.cct2, paper.cct3, paper.cct4, paper.cct5]
            cct_values = [str(v) for v in cct_values if v is not None]
            row.append('\n'.join(cct_values) if cct_values else '')
            # RCT
            rct_values = [paper.rct1, paper.rct2, paper.rct3, paper.rct4, paper.rct5]
            rct_values = [str(v) for v in rct_values if v is not None]
            row.append('\n'.join(rct_values) if rct_values else '')
            row.append(paper.NumberOfTears or '')
            row.append(paper.tearing_time or '')
            row.append(paper.ProductionDowntime or '')
            row.append(paper.CauseOfTearing or '')

            # PLC values
            roll_plc = plc_map.get(str(paper.roll_number))
            for pk in plc_keys:
                val = None
                if roll_plc:
                    if pk.key == 'b':
                        val = roll_plc.paper_breaks
                    elif pk.key == 'me1':
                        val = roll_plc.printed_length
                    else:
                        setting = roll_plc.plc_setting or {}
                        val = setting.get(pk.key)
                row.append(val if (val is not None and val != '') else '')

            row.append('بله' if paper.calender_applied else 'خیر')
            row.append(paper.machine_speed or '')
            row.append(format_material_usage(paper.material_usage))

            pm_settings = paper.pm_settings.all()
            temp_before_values = [str(s.cylinder_temperature_before_press) for s in pm_settings if s.cylinder_temperature_before_press is not None]
            temp_after_values = [str(s.cylinder_temperature_after_press) for s in pm_settings if s.cylinder_temperature_after_press is not None]
            temp_display = f"{', '.join(temp_before_values) if temp_before_values else '-'} / {', '.join(temp_after_values) if temp_after_values else '-'}"
            row.append(temp_display)
            paper_temp_starch_values = [str(s.paper_temperature_before_starch) for s in pm_settings if s.paper_temperature_before_starch is not None]
            paper_temp_pop_reel_values = [str(s.paper_temperature_before_pop_reel) for s in pm_settings if s.paper_temperature_before_pop_reel is not None]
            paper_temp_display = f"{', '.join(paper_temp_starch_values) if paper_temp_starch_values else '-'} / {', '.join(paper_temp_pop_reel_values) if paper_temp_pop_reel_values else '-'}"
            row.append(paper_temp_display)
            extra_temp_parts = []
            for s in pm_settings:
                if s.fructose_temperature_before_press is not None:
                    extra_temp_parts.append(f'نشاسته:{s.fructose_temperature_before_press}')
                if s.paper_temperature_before_dryer3 is not None:
                    extra_temp_parts.append(f'کاغذ خشک۳:{s.paper_temperature_before_dryer3}')
                if s.dryer3_first_cylinder_temperature is not None:
                    extra_temp_parts.append(f'سیلندر خشک۳:{s.dryer3_first_cylinder_temperature}')
            row.append(', '.join(extra_temp_parts) if extra_temp_parts else '')
            density_vals = [paper.density_valve, paper.density_valve2, paper.density_valve3, paper.density_valve4, paper.density_valve5]
            density_parts = [f'{i + 1}: {v}' for i, v in enumerate(density_vals) if v is not None]
            row.append(', '.join(density_parts) if density_parts else '')
            diluting_vals = [paper.diluting_valve, paper.diluting_valve2, paper.diluting_valve3, paper.diluting_valve4, paper.diluting_valve5]
            diluting_parts = [f'{i + 1}: {v}' for i, v in enumerate(diluting_vals) if v is not None]
            row.append(', '.join(diluting_parts) if diluting_parts else '')

            # Pulp placeholders (pulp_headers + location_headers + created_at)
            for _ in range(len(pulp_headers) + len(location_headers) + 1):
                row.append('')

            yield writer.writerow(row)

            # matching pulps
            matching_pulps = []
            paper_date = extract_date(paper.created_at) if paper.created_at else ''
            for pulp in pulps:
                if str(pulp.roll_number) != str(paper.roll_number):
                    continue
                pulp_date = extract_date(pulp.created_at)
                if pulp_date != paper_date:
                    continue
                if (pulp.lower_sampling_time and paper.sampling_start_time and paper.sampling_end_time):
                    if is_time_between(pulp.lower_sampling_time, paper.sampling_start_time, paper.sampling_end_time):
                        matching_pulps.append(pulp)

            for pulp in matching_pulps:
                prow = []
                # type, roll, line
                prow.append('خمیر')
                prow.append(pulp.roll_number or '')
                prow.append(production_line_map.get(pulp.ProductionLine, '') if pulp.ProductionLine else '')
                # pad paper columns except first three
                for _ in range(len(paper_headers) - 3):
                    prow.append('')
                # pulp columns
                prow.append(pulp.lower_sampling_time or '')
                prow.append(pulp.downpulpcount or '')
                prow.append(pulp.lower_water_filter or '')
                prow.append(pulp.lower_headbox_freeness or '')
                prow.append(pulp.lower_ph or '')
                prow.append(pulp.lower_pulp_temperature or '')
                prow.append(pulp.upper_headbox_consistency or '')
                prow.append(pulp.upper_water_filter or '')
                prow.append(pulp.upper_headbox_freeness or '')
                prow.append(pulp.upper_ph or '')
                prow.append(pulp.upper_pulp_temperature or '')
                prow.append(pulp.pond8_consistency or '')
                prow.append(pulp.curtain_consistency or '')
                prow.append(pulp.thickener_consistency or '')
                # dynamic locations
                for loc in location_names:
                    location_value = pulp.sampling_locations.filter(title=loc.title).first()
                    prow.append(location_value.value if location_value else '')
                prow.append(to_jalali_datetime(pulp.created_at))
                yield writer.writerow(prow)

    response = StreamingHttpResponse(stream(), content_type='text/csv; charset=utf-8')
    if date_from and date_to:
        filename = f'complete-report-{date_from}-{date_to}.csv'
    elif date_from:
        filename = f'complete-report-{date_from}-.csv'
    elif date_to:
        filename = f'complete-report--{date_to}.csv'
    else:
        filename = f'complete-report-{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    response['Content-Disposition'] = f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}'
    return response


PLC_ROLLS_API_URL = ["http://192.168.2.46:6010/api/rolls/","http://192.168.2.22:6011/api/rolls/"]


def _fetch_plc_api(url,time_range=None):
    """
    Fetch data from external PLC rolls API.
    """
    params = {}
    # if time_range is not None:
    #     params['time_range'] = time_range
    pm="pm2"
    if url == "http://192.168.2.46:6010/api/rolls/":
        pm="pm3"
        try:
            last_roll = RollPLCData.objects.filter(
                plc_setting__n="pm3"
            ).order_by('-created_at').first()

            if last_roll:
                roll_number = int(str(last_roll.roll_number)[3:])
                
                
        except:
            pass
    else:
        last_roll = RollPLCData.objects.filter(
            plc_setting__n="pm2"
        ).order_by('-created_at').first()
        if last_roll:
            roll_number = int(str(last_roll.roll_number)[3:])

    print(roll_number,"=================")
    params['roll_from_request'] = roll_number
    try:
        response = requests.post(url, params=params, timeout=30)
    except Exception as exc: #except requests.RequestException as exc:
        return None, {'success': False, 'error': str(exc)}

    if response.status_code != 200:
        return None, {
            'success': False,
            'status_code': response.status_code,
            'error': response.text,
        }

    try:
        payload = response.json()
        payload["pm"]=pm
    except json.JSONDecodeError:
        return None, {'success': False, 'error': 'Invalid JSON response from PLC API'}

    return payload, None


def _sync_plc_data_from_payload(payload):
    """
    Upsert PLCKey and RollPLCData instances from API payload.
    """
    plc_keys_data = payload.get('plc_keys', []) or []
    rolls_data = payload.get('data', []) or []
    created_keys = 0
    updated_keys = 0
    # remove key if error
    for item in plc_keys_data:
        defaults = {
            'name': item.get('name') or '',
            'fa_name': item.get('fa_name') or '',
            'external_id': item.get('id') or '',
            'value_type': item.get('value') or '',
            'description': item.get('description') or '',
            'creation_datetime': datetime.fromisoformat(item.get('CreationDateTime').replace('Z', '+00:00')).timestamp(),
            'last_update': datetime.fromisoformat(item.get('LastUpdate').replace('Z', '+00:00')).timestamp(),
        }
        obj = PLCKey.objects.filter(key=item.get('key')).first()
    
        if obj:
            created = False
        else:
            obj = PLCKey.objects.create(key=item.get('key'), **defaults)
            created = True

        if created:
            created_keys += 1
        else:
            updated_keys += 1

    created_rolls = 0
    updated_rolls = 0

    for item in rolls_data:
        roll_number = item.get('roll_number')
        if roll_number is None:
            continue

        plc_setting = item.get('plc_setting') or {}
        pm = payload.get('pm') or False #plc_setting.get('n') or False
        roll_number = str(roll_number)
        if pm == "pm2":
            roll_number = f'205{roll_number if len(roll_number) == 5 else "0"+roll_number if len(roll_number) == 4 else "00"+roll_number if len(roll_number) == 3 else "000"+roll_number if len(roll_number) == 2 else "0000"+roll_number if len(roll_number) == 1 else roll_number }'
        elif pm == "pm3":
            roll_number = "305" + (5-len(roll_number))*"0" + roll_number

        defaults = {
            'plc_setting': plc_setting,
            'creation_datetime': datetime.fromisoformat(item.get('CreationDateTime').replace('Z', '+00:00')).timestamp(),
            'paper_breaks': item.get('Paper_breaks'),
            'printed_length': item.get('Printed_length'),
        }

        obj, created = RollPLCData.objects.update_or_create(
            roll_number=str(roll_number),
            defaults=defaults,
        )
        if created:
            created_rolls += 1
        else:
            updated_rolls += 1

    return {
        'plc_keys': {
            'created': created_keys,
            'updated': updated_keys,
            'total': PLCKey.objects.count(),
        },
        'roll_plc_data': {
            'created': created_rolls,
            'updated': updated_rolls,
            'total': RollPLCData.objects.count(),
        },
    }


@csrf_exempt
@require_http_methods(["POST", "GET"])
def sync_plc_data_api(request):
    """
    API endpoint to sync PLC data from external system.
    """
    time_range = request.GET.get('time_range') or request.POST.get('time_range')

    if RollPLCData.objects.exists() and not time_range:
        time_range = 1

    for url in PLC_ROLLS_API_URL:
        payload, error = _fetch_plc_api(url,time_range=time_range)
        if error is not None:
            return JsonResponse(error, status=502)
        try:
            result = _sync_plc_data_from_payload(payload)
        except OperationalError as exc:
            return JsonResponse(
                {
                    'success': False,
                    'error': 'database_locked',
                    'message': str(exc),
                },
                status=503,
            )

    return JsonResponse({
        'success': True,
        'time_range': time_range,
        'sync_result': result,
    })


@csrf_exempt
@require_http_methods(["GET"])
def plc_keys_api(request):
    """
    API endpoint to get PLC keys metadata.
    """
    keys = list(
        PLCKey.objects.all()
        .order_by('order_index', 'fa_name')
        .values('id', 'name', 'fa_name', 'key', 'value_type', 'order_index', 'description')
    )
    # i=1
    # for item in keys:
    #     if item["key"] == "me1":
    #         item["order_index"] = 43
    #     else:
    #         item["order_index"] = i
    #     i+=1
        
    # # keys.sort(key=lambda item: item['order_index'])
    # print(keys)
    return JsonResponse({
        'success': True,
        'plc_keys': keys,
    })


@csrf_exempt
@require_http_methods(["POST"])
def plc_keys_reorder_api(request):
    """
    API endpoint to reorder PLC keys by updating order_index.
    Body: { "ordered_ids": [1,2,3,...] }
    """
    try:
        body = request.body.decode('utf-8') if request.body else '{}'
        data = json.loads(body or '{}')
    except json.JSONDecodeError:
        data = {}

    ordered_ids = data.get('ordered_ids') or []
    if not isinstance(ordered_ids, list):
        return JsonResponse({'success': False, 'error': 'invalid_payload'}, status=400)

    normalized_ids = []
    for v in ordered_ids:
        try:
            normalized_ids.append(int(v))
        except (TypeError, ValueError):
            continue

    if not normalized_ids:
        return JsonResponse({'success': False, 'error': 'no_ids'}, status=400)

    existing_ids = set(PLCKey.objects.filter(id__in=normalized_ids).values_list('id', flat=True))
    ordered_existing = [i for i in normalized_ids if i in existing_ids]
    missing = [i for i in normalized_ids if i not in existing_ids]

    with transaction.atomic():
        keys = list(PLCKey.objects.filter(id__in=ordered_existing))
        key_map = {k.id: k for k in keys}
        for idx, key_id in enumerate(ordered_existing, start=1):
            obj = key_map.get(key_id)
            if obj is not None:
                obj.order_index = idx
        PLCKey.objects.bulk_update(keys, ['order_index'])

    return JsonResponse({'success': True, 'updated': len(ordered_existing), 'missing': missing})


@csrf_exempt
@require_http_methods(["POST"])
def plc_keys_reorder_api(request):
    """
    API endpoint to reorder PLC keys by updating order_index.
    Body: { "ordered_ids": [1,2,3,...] }
    """
    try:
        body = request.body.decode('utf-8') if request.body else '{}'
        data = json.loads(body or '{}')
    except json.JSONDecodeError:
        data = {}

    ordered_ids = data.get('ordered_ids') or []
    if not isinstance(ordered_ids, list):
        return JsonResponse({'success': False, 'error': 'invalid_payload'}, status=400)

    normalized_ids = []
    for v in ordered_ids:
        try:
            normalized_ids.append(int(v))
        except (TypeError, ValueError):
            continue

    if not normalized_ids:
        return JsonResponse({'success': False, 'error': 'no_ids'}, status=400)

    existing_ids = set(PLCKey.objects.filter(id__in=normalized_ids).values_list('id', flat=True))
    ordered_existing = [i for i in normalized_ids if i in existing_ids]
    missing = [i for i in normalized_ids if i not in existing_ids]

    with transaction.atomic():
        keys = list(PLCKey.objects.filter(id__in=ordered_existing))
        key_map = {k.id: k for k in keys}
        for idx, key_id in enumerate(ordered_existing, start=1):
            obj = key_map.get(key_id)
            if obj is not None:
                obj.order_index = idx
        PLCKey.objects.bulk_update(keys, ['order_index'])

    return JsonResponse({
        'success': True,
        'updated': len(ordered_existing),
        'missing': missing,
    })


@csrf_exempt
@require_http_methods(["GET"])
def roll_plc_data_api(request):
    """
    API endpoint to get roll PLC data from local database.
    """
    qs = RollPLCData.objects.all()

    roll_numbers_param = request.GET.get('roll_numbers')
    if roll_numbers_param:
        roll_numbers = [
            rn.strip() for rn in str(roll_numbers_param).split(',') if rn.strip()
        ]
        if roll_numbers:
            qs = qs.filter(roll_number__in=roll_numbers)

    data = list(
        qs.values('roll_number', 'plc_setting', 'creation_datetime', 'paper_breaks', 'printed_length')
    )

    return JsonResponse({
        'success': True,
        'data': data,
    })


@csrf_exempt
@require_http_methods(["GET", "POST"])
def plc_column_preference_api(request):
    """
    API endpoint to get/set global PLC column visibility preferences.
    """
    pref, _ = PLCColumnPreference.objects.get_or_create(id=1)

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'visible_keys': pref.visible_keys or [],
        })

    try:
        body = request.body.decode('utf-8') if request.body else '{}'
        data = json.loads(body or '{}')
    except json.JSONDecodeError:
        data = {}

    visible_keys = data.get('visible_keys') or []
    normalized_ids = []
    for value in visible_keys:
        try:
            normalized_ids.append(int(value))
        except (TypeError, ValueError):
            continue

    pref.visible_keys = normalized_ids
    pref.save()

    return JsonResponse({
        'success': True,
        'visible_keys': pref.visible_keys,
    })

