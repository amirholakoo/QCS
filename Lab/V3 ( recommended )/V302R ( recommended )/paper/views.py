"""
Views for paper app.
"""
import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from paper_management.permissions import DjangoModelPermissionsWithView
from django.db.models import Q
from django.http import HttpResponse, StreamingHttpResponse
import re
import csv
from .models import Paper, ProductionMachine, PM_Setting
from .serializers import PaperSerializer, PaperListSerializer, ProductionMachineSerializer, PM_SettingSerializer
from logs.utils import log_action
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter
from datetime import datetime
import jdatetime
import pandas as pd
from paper_type.models import PaperType as PaperTypeModel
from pulp.models import Pulp, pulp_Sampling_Location_vals
from material.models import Material
from report.models import RollPLCData


class PaperViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Paper model with CRUD operations.
    """
    queryset = Paper.objects.filter(is_delete=False).prefetch_related('pm_settings', 'pm_settings__production_machine')
    serializer_class = PaperSerializer
    permission_classes = [DjangoModelPermissionsWithView]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'list':
            return PaperListSerializer
        return PaperSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters. Excludes soft-deleted.
        """
        queryset = Paper.objects.filter(is_delete=False).prefetch_related('pm_settings', 'pm_settings__production_machine')
        
        # Search functionality (supports roll number, responsible person, date, and ID)
        search = self.request.query_params.get('search', None)
        if search:
            search_filter = (
                Q(roll_number__icontains=search) |
                Q(responsible_person_name__icontains=search) |
                Q(date__icontains=search)
            )
            # Also allow searching by numeric ID (to match previous frontend behaviour)
            try:
                search_id = int(search)
            except (TypeError, ValueError):
                search_id = None
            if search_id is not None:
                search_filter = search_filter | Q(id=search_id)
            queryset = queryset.filter(search_filter)
        
        # Filter by shift
        shift = self.request.query_params.get('shift', None)
        if shift:
            queryset = queryset.filter(shift=shift)
        
        # Filter by production line
        production_line = self.request.query_params.get('ProductionLine', None)
        if production_line:
            queryset = queryset.filter(ProductionLine=production_line)
        
        # Filter by paper type (ForeignKey)
        paper_type = self.request.query_params.get('paper_type', None)
        if paper_type:
            queryset = queryset.filter(PaperType_id=paper_type)
        
        # Sorting
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        
        # queryset = queryset.order_by("created_at")
        return queryset
    
    def perform_create(self, serializer):
        """
        Create paper record and log the action.
        """
        paper = serializer.save()
        
        # Handle PM_Setting data if provided
        pm_settings_data = self.request.data.get('pm_settings', [])
        if pm_settings_data:
            for setting_data in pm_settings_data:
                production_machine_id = setting_data.get('production_machine')
                if production_machine_id:
                    details = setting_data.get('details')
                    if isinstance(details, dict):
                        details = {k: (v if v is not None and str(v).strip() else None) for k, v in details.items()}
                        details = {k: v for k, v in details.items() if v is not None}
                    else:
                        details = None
                    PM_Setting.objects.update_or_create(
                        paper=paper,
                        production_machine_id=production_machine_id,
                        defaults={
                            'bottom': setting_data.get('bottom', ''),
                            'top': setting_data.get('top', ''),
                            'fructose_temperature_before_press': setting_data.get('fructose_temperature_before_press'),
                            'paper_temperature_before_dryer3': setting_data.get('paper_temperature_before_dryer3'),
                            'dryer3_first_cylinder_temperature': setting_data.get('dryer3_first_cylinder_temperature'),
                            'cylinder_temperature_before_press': setting_data.get('cylinder_temperature_before_press'),
                            'cylinder_temperature_after_press': setting_data.get('cylinder_temperature_after_press'),
                            'paper_temperature_before_starch': setting_data.get('paper_temperature_before_starch'),
                            'paper_temperature_before_pop_reel': setting_data.get('paper_temperature_before_pop_reel'),
                            'details': details or None
                        }
                    )
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                details = [{
                    "name": "شماره رول",
                    "new": paper.roll_number,
                    "roll_number": paper.roll_number
                }]
                log_action(self.request.user.username, 'Paper', 'create', details)
            except:
                pass
    
    def perform_update(self, serializer):
        """
        Update paper record and log the action.
        """
        # Save the updated instance
        updated_paper = serializer.save()
        # Handle PM_Setting data if provided
        pm_settings_data = self.request.data.get('pm_settings', [])
        if pm_settings_data:
            for setting_data in pm_settings_data:
                production_machine_id = setting_data.get('production_machine')
                if production_machine_id:
                    details = setting_data.get('details')
                    if isinstance(details, dict):
                        details = {k: (v if v is not None and str(v).strip() else None) for k, v in details.items()}
                        details = {k: v for k, v in details.items() if v is not None}
                    else:
                        details = None
                    PM_Setting.objects.update_or_create(
                        paper=updated_paper,
                        production_machine_id=production_machine_id,
                        defaults={
                            'bottom': setting_data.get('bottom', ''),
                            'top': setting_data.get('top', ''),
                            'fructose_temperature_before_press': setting_data.get('fructose_temperature_before_press'),
                            'paper_temperature_before_dryer3': setting_data.get('paper_temperature_before_dryer3'),
                            'dryer3_first_cylinder_temperature': setting_data.get('dryer3_first_cylinder_temperature'),
                            'cylinder_temperature_before_press': setting_data.get('cylinder_temperature_before_press'),
                            'cylinder_temperature_after_press': setting_data.get('cylinder_temperature_after_press'),
                            'paper_temperature_before_starch': setting_data.get('paper_temperature_before_starch'),
                            'paper_temperature_before_pop_reel': setting_data.get('paper_temperature_before_pop_reel'),
                            'details': details or None
                        }
                    )
        
        # Log action if user is authenticated
        # if self.request.user.is_authenticated:
        #     try:
        #         log_action(self.request.user.username, 'Paper', 'edit')
        #     except:
        #         pass
    
    def perform_destroy(self, instance):
        """
        Soft delete: set is_delete=True and log the action.
        """
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Paper', 'delete', [{'roll_number': instance.roll_number}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=False, methods=['get'])
    def validate_shamsi_date(self, request):
        """
        Validate a Shamsi (Jalali) date string in format YYYY-MM-DD for debugging.
        Returns JSON { valid: true } or { valid: false, error: '...' }
        """
        date_str = request.query_params.get('date', '')
        if not date_str:
            return Response({'valid': False, 'error': 'missing_date'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic format check
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return Response({'valid': False, 'error': 'invalid_format'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            year, month, day = map(int, date_str.split('-'))
            # Will raise ValueError if invalid
            jdatetime.date(year, month, day)
            return Response({'valid': True})
        except Exception as exc:
            return Response({'valid': False, 'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore soft-deleted paper record."""
        instance = Paper.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Paper', 'restore', [{'roll_number': instance.roll_number}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def pm_note_defaults(self, request):
        """
        Return last valid (non-null) details per production_machine for PM setting note defaults.
        """
        qs = PM_Setting.objects.filter(
            paper__is_delete=False,
            details__isnull=False
        ).exclude(
            details={}
        ).select_related('production_machine').order_by('-paper__created_at')
        result = {}
        for setting in qs:
            mid = str(setting.production_machine_id)
            if mid not in result:
                result[mid] = {}
            if not isinstance(setting.details, dict):
                continue
            for k, v in setting.details.items():
                if v is not None and str(v).strip() and k not in result[mid]:
                    result[mid][k] = v
        return Response(result)


    @action(detail=False, methods=['get'])
    def today(self, request):
        return Response({'today': str(jdatetime.date.today())})

    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Get suggestions for autocomplete fields.
        """
        # Get unique values for suggestions (non-deleted only)
        base_paper = Paper.objects.filter(is_delete=False)
        responsible_persons_raw = base_paper.values_list('responsible_person_name', flat=True).distinct()
        shifts_raw = base_paper.values_list('shift', flat=True).distinct()
        material_usage_raw = base_paper.values_list('material_usage', flat=True).distinct()
        machine_speed_raw = base_paper.values_list('machine_speed', flat=True).distinct()
        paper_size_raw = base_paper.values_list('paper_size', flat=True).distinct()
        
        temp_before_press_raw = PM_Setting.objects.filter(paper__is_delete=False).values_list('cylinder_temperature_before_press', flat=True).distinct()
        temp_after_press_raw = PM_Setting.objects.filter(paper__is_delete=False).values_list('cylinder_temperature_after_press', flat=True).distinct()
        
        # Filter out empty values and normalize for deduplication
        responsible_persons_clean = []
        shifts_clean = []
        material_usage_suggestions = {}
        temp_before_press_clean = []
        temp_after_press_clean = []
        machine_speed_clean = []
        paper_size_clean = []
        
        # Deduplicate responsible person names
        seen_names = set()
        for name in responsible_persons_raw:
            if name and name.strip():  # Check if name exists and is not just whitespace
                normalized_name = name.strip()  # Remove leading/trailing whitespace
                if normalized_name.lower() not in seen_names:  # Case-insensitive check
                    seen_names.add(normalized_name.lower())
                    responsible_persons_clean.append(normalized_name)
        
        # Deduplicate shifts
        seen_shifts = set()
        for shift in shifts_raw:
            if shift and shift.strip():
                normalized_shift = shift.strip()
                if normalized_shift.lower() not in seen_shifts:
                    seen_shifts.add(normalized_shift.lower())
                    shifts_clean.append(normalized_shift)
        
        # Deduplicate temperature before press values
        seen_temp_before = set()
        for temp in temp_before_press_raw:
            if temp is not None:
                if temp not in seen_temp_before:
                    seen_temp_before.add(temp)
                    temp_before_press_clean.append(temp)
        
        # Deduplicate temperature after press values
        seen_temp_after = set()
        for temp in temp_after_press_raw:
            if temp is not None:
                if temp not in seen_temp_after:
                    seen_temp_after.add(temp)
                    temp_after_press_clean.append(temp)
        
        # Deduplicate machine speed values
        seen_machine_speed = set()
        for speed in machine_speed_raw:
            if speed is not None:
                if speed not in seen_machine_speed:
                    seen_machine_speed.add(speed)
                    machine_speed_clean.append(speed)
        
        # Deduplicate paper size values
        seen_paper_size = set()
        for size in paper_size_raw:
            if size is not None:
                if size not in seen_paper_size:
                    seen_paper_size.add(size)
                    paper_size_clean.append(size)
        
        # Process material usage suggestions
        for material_usage_str in material_usage_raw:
            if material_usage_str and material_usage_str.strip():
                try:
                    # Parse JSON material usage data
                    material_data = json.loads(material_usage_str)
                    for material_id, data in material_data.items():
                        if isinstance(data, dict) and 'val' in data and 'brand' in data:
                            if material_id not in material_usage_suggestions:
                                material_usage_suggestions[material_id] = {
                                    'amounts': set(),
                                    'brands': set()
                                }
                            
                            # Add amount suggestion
                            if data['val'] is not None:
                                material_usage_suggestions[material_id]['amounts'].add(data['val'])
                            
                            # Add brand suggestion
                            if data['brand'] and data['brand'].strip():
                                material_usage_suggestions[material_id]['brands'].add(data['brand'].strip())
                                
                except (json.JSONDecodeError, TypeError):
                    # Handle old format or invalid JSON
                    continue
        
        # Convert sets to sorted lists for JSON serialization
        for material_id in material_usage_suggestions:
            material_usage_suggestions[material_id]['amounts'] = sorted(list(material_usage_suggestions[material_id]['amounts']))
            material_usage_suggestions[material_id]['brands'] = sorted(list(material_usage_suggestions[material_id]['brands']))
        
        # Sort alphabetically and numerically
        responsible_persons_clean.sort()
        shifts_clean.sort()
        temp_before_press_clean.sort()
        temp_after_press_clean.sort()
        machine_speed_clean.sort()
        paper_size_clean.sort()
        
        return Response({
            'responsible_person_names': responsible_persons_clean,
            'shifts': shifts_clean,
            'temp_before_press_suggestions': temp_before_press_clean,
            'temp_after_press_suggestions': temp_after_press_clean,
            'machine_speed_suggestions': machine_speed_clean,
            'paper_size_suggestions': paper_size_clean,
            'material_usage_suggestions': material_usage_suggestions,
        })

    @action(detail=False, methods=['get'])
    def last_roll(self, request):
        """
        Return the last (most recent) roll_number for a given ProductionLine.
        Query param: ProductionLine (optional) — if omitted, searches across all lines.
        """
        production_line = request.query_params.get('ProductionLine', None)
        qs = Paper.objects.filter(is_delete=False)
        if production_line is not None:
            qs = qs.filter(ProductionLine=production_line)
        last_paper = qs.order_by('-created_at').first()
        if last_paper:
            return Response({'roll_number': last_paper.roll_number})
        return Response({'roll_number': None})
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Streaming CSV export for paper records.
        """
        # Streaming CSV export (preserves filters)
        queryset = self.get_queryset()

        # Filter by date range (Shamsi dates)
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        # Create material map for material names (non-deleted only)
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
                        formatted_items.append(f'{material_name}: {amount}')
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

        headers = [
            'شماره رول',
            'خط تولید',
            'تاریخ',
            'زمان شروع نمونه‌گیری',
            'زمان پایان نمونه‌گیری',
            'نام مسئول',
            'شیفت',
            'نوع کاغذ',
            'عرض کاغذ',
            'تعداد پارگی',
            'تعداد پارگی PLC',
            'متراژ چاپ شده PLC',
            'گراماژ',
            'رطوبت',
            'خاکستر',
            'CUB',
            'پروفایل',
            'جزئیات پروفایل',
            'شیر غلظت',
            'شیر رقیق‌ساز',
            'دمای سیلندر قبل از سایز پرس',
            'دمای سیلندر بعد از سایز پرس',
            'دمای کاغذ قبل از نشاسته',
            'دمای کاغذ قبل از پوپ ریل',
            'Burst',
            'MD',
            'CD',
            'CCT 1',
            'CCT 2',
            'CCT 3',
            'CCT 4',
            'CCT 5',
            'RCT 1',
            'RCT 2',
            'RCT 3',
            'RCT 4',
            'RCT 5',
            'زمان پارگی',
            'زمان وقفه در تولید (دقیقه)',
            'علت پارگی/توقف',
            'کلندر اعمال شده',
            'سرعت دستگاه',
            'مصرف مواد',
            'کاربر',
            'تاریخ ایجاد',
            'آخرین بروزرسانی'
        ]

        # Preload PLC data for rolls
        plc_map = {
            str(obj.roll_number): obj
            for obj in RollPLCData.objects.filter(
                roll_number__in=queryset.values_list('roll_number', flat=True)
            )
        }

        shift_map = {'day': 'روزانه', 'night': 'شبانه'}
        profile_map = {
            '1': '+۱g-',
            '2': '+۲g-',
            '3': '+۳g-',
            '4': '+۴g-',
            '5': 'بیشتر از 5 گرم نوسان سر تا سر کاغذ',
            '+1g': '+۱g-',
            '+2g': '+۲g-',
            '+3g': '+۳g-',
            '+4g': '+۴g-',
            '>5g': 'بیشتر از 5 گرم نوسان سر تا سر کاغذ'
        }
        production_line_map = {2: 'PM2', 3: 'PM3', 4: 'PM4'}

        class Echo:
            def write(self, value):
                return value

        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)

        def stream():
            yield '\ufeff'
            yield writer.writerow(headers)

            for paper in queryset.iterator(chunk_size=1000):
                row = []
                row.append(paper.roll_number or '')
                row.append(production_line_map.get(paper.ProductionLine, '') if paper.ProductionLine else '')
                row.append(paper.date or '')
                row.append(paper.sampling_start_time or '')
                row.append(paper.sampling_end_time or '')
                row.append(paper.responsible_person_name or '')
                row.append(shift_map.get(paper.shift, '') if paper.shift else '')
                row.append(paper.PaperType.name if paper.PaperType else '')
                row.append(paper.paper_size or '')
                row.append(paper.NumberOfTears or '')

                roll_plc = plc_map.get(str(paper.roll_number))
                row.append(getattr(roll_plc, 'paper_breaks', None) or '')
                row.append(getattr(roll_plc, 'printed_length', None) or '')

                row.append(paper.real_grammage or '')
                row.append(paper.humidity or '')
                row.append(paper.ash_percentage or '')
                row.append(paper.cub or '')
                row.append(profile_map.get(paper.profile, paper.profile or '') if paper.profile else '')

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

                row.append(paper.density_valve or '')
                row.append(paper.diluting_valve or '')
                pm_settings = paper.pm_settings.all()
                temp_before_values = [str(s.cylinder_temperature_before_press) for s in pm_settings if s.cylinder_temperature_before_press is not None]
                temp_after_values = [str(s.cylinder_temperature_after_press) for s in pm_settings if s.cylinder_temperature_after_press is not None]
                paper_temp_starch_values = [str(s.paper_temperature_before_starch) for s in pm_settings if s.paper_temperature_before_starch is not None]
                paper_temp_pop_reel_values = [str(s.paper_temperature_before_pop_reel) for s in pm_settings if s.paper_temperature_before_pop_reel is not None]
                row.append(', '.join(temp_before_values) if temp_before_values else '')
                row.append(', '.join(temp_after_values) if temp_after_values else '')
                row.append(', '.join(paper_temp_starch_values) if paper_temp_starch_values else '')
                row.append(', '.join(paper_temp_pop_reel_values) if paper_temp_pop_reel_values else '')
                row.append(paper.burst_test or '')
                row.append(paper.tensile_strength_md or '')
                row.append(paper.tensile_strength_cd or '')
                row.append(paper.cct1 or '')
                row.append(paper.cct2 or '')
                row.append(paper.cct3 or '')
                row.append(paper.cct4 or '')
                row.append(paper.cct5 or '')
                row.append(paper.rct1 or '')
                row.append(paper.rct2 or '')
                row.append(paper.rct3 or '')
                row.append(paper.rct4 or '')
                row.append(paper.rct5 or '')
                row.append(paper.tearing_time or '')
                row.append(paper.ProductionDowntime or '')
                row.append(paper.CauseOfTearing or '')
                row.append('بله' if paper.calender_applied else 'خیر')
                row.append(paper.machine_speed or '')
                row.append(format_material_usage(paper.material_usage))
                row.append(paper.user.username if paper.user else '')
                row.append(to_jalali_datetime(paper.created_at))
                row.append(to_jalali_datetime(paper.last_updated))

                yield writer.writerow(row)

        response = StreamingHttpResponse(stream(), content_type='text/csv; charset=utf-8')
        # Build filename with date range
        date_from = request.query_params.get('date_from', '')
        date_to = request.query_params.get('date_to', '')
        if date_from and date_to:
            filename = f'paper-{date_from}-{date_to}.csv'
        elif date_from:
            filename = f'paper-{date_from}-.csv'
        elif date_to:
            filename = f'paper--{date_to}.csv'
        else:
            filename = f'paper-{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}'
        return response

class ProductionMachineViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ProductionMachine model with CRUD operations.
    """
    queryset = ProductionMachine.objects.filter(is_delete=False)
    serializer_class = ProductionMachineSerializer
    permission_classes = [DjangoModelPermissionsWithView]

    def get_queryset(self):
        return ProductionMachine.objects.filter(is_delete=False)
    
    def perform_destroy(self, instance):
        """
        Soft delete: set is_delete=True and log the action.
        """
        machine_title = instance.title
        if self.request.user.is_authenticated:
            try:
                details = [{"name": "عنوان", "old": machine_title, "roll_number": None}]
                log_action(self.request.user.username, 'ProductionMachine', 'delete', details)
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore soft-deleted production machine."""
        instance = ProductionMachine.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'ProductionMachine', 'restore', [{'name': 'عنوان', 'new': instance.title, 'roll_number': None}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)