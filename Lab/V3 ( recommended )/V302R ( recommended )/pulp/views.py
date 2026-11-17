"""
Views for pulp app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.http import HttpResponse, StreamingHttpResponse
import csv
from .models import Pulp, pulp_Sampling_Location_names
from .serializers import PulpSerializer, PulpListSerializer
from logs.utils import log_action
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from openpyxl.utils import get_column_letter
from datetime import datetime
import jdatetime
from django.utils import timezone
from paper_management.permissions import DjangoModelPermissionsWithView


class PulpViewSet(viewsets.ModelViewSet):
    queryset = Pulp.objects.filter(is_delete=False)
    serializer_class = PulpSerializer
    permission_classes = [DjangoModelPermissionsWithView]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PulpListSerializer
        return PulpSerializer
    
    def get_queryset(self):
        queryset = Pulp.objects.filter(is_delete=False).prefetch_related('sampling_locations')
        search = self.request.query_params.get('search', None)
        if search:
            search_filter = Q(roll_number__icontains=search)
            try:
                search_id = int(search)
            except (TypeError, ValueError):
                search_id = None
            if search_id is not None:
                search_filter = search_filter | Q(id=search_id)
            queryset = queryset.filter(search_filter)
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        return queryset
    
    def perform_create(self, serializer):
        """
        Create pulp record and log the action.
        """
        pulp = serializer.save()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                details = [{
                    "name": "شماره رول",
                    "new": pulp.roll_number if pulp.roll_number else '-',
                    "roll_number": pulp.roll_number
                }]
                log_action(self.request.user.username, 'Pulp', 'create', details)
            except:
                pass
    
    def perform_update(self, serializer):
        """
        Update pulp record and log the action.
        """
        serializer.save()
        
        # Log action if user is authenticated
        # if self.request.user.is_authenticated:
        #     try:
        #         log_action(self.request.user.username, 'Pulp', 'edit')
        #     except:
        #         pass
    
    def perform_destroy(self, instance):
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Pulp', 'delete', [{'roll_number': instance.roll_number}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = Pulp.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Pulp', 'restore', [{'roll_number': instance.roll_number}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Streaming CSV export for pulp records.
        """
        queryset = self.get_queryset()

        # Filter by date range (convert Shamsi to Gregorian for created_at filtering)
        date_from = request.query_params.get('date_from', None)
        date_to = request.query_params.get('date_to', None)

        if date_from:
            try:
                year, month, day = map(int, date_from.split('-'))
                jalali_date = jdatetime.date(year, month, day)
                gregorian_date = jalali_date.togregorian()
                start_datetime = timezone.make_aware(
                    datetime.combine(gregorian_date, datetime.min.time())
                )
                queryset = queryset.filter(created_at__gte=start_datetime)
            except (ValueError, AttributeError):
                pass

        if date_to:
            try:
                year, month, day = map(int, date_to.split('-'))
                jalali_date = jdatetime.date(year, month, day)
                gregorian_date = jalali_date.togregorian()
                end_datetime = timezone.make_aware(
                    datetime.combine(gregorian_date, datetime.max.time())
                )
                queryset = queryset.filter(created_at__lte=end_datetime)
            except (ValueError, AttributeError):
                pass

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
            'زمان نمونه‌گیری پایین',
            'کانس خمیر پایین',
            'فیلتر آب پایین',
            'فرینس خمیر پایین',
            'pH پایین',
            'دمای خمیر پایین',
            'غلظت هدباکس بالا',
            'فیلتر آب بالا',
            'فرینس هدباکس بالا',
            'pH بالا',
            'دمای خمیر بالا',
            'کانس حوض 8',
            'کانس کردان',
            'کانس تیکنر',
            'تاریخ ایجاد',
            'آخرین بروزرسانی'
        ]

        # Include dynamic sampling location names as additional headers (values stored in pulp_Sampling_Location_vals)
        location_names_qs = pulp_Sampling_Location_names.objects.all().order_by('title')
        location_name_titles = [ln.title for ln in location_names_qs]
        # Insert location headers after 'کانس تیکنر'
        try:
            idx = headers.index('کانس تیکنر') + 1
        except ValueError:
            idx = len(headers)
        for i, title in enumerate(location_name_titles):
            headers.insert(idx + i, title)

        production_line_map = {0: 'مشترک', 2: 'PM2', 3: 'PM3', 4: 'PM4'}

        class Echo:
            def write(self, value):
                return value

        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)

        def stream():
            yield '\ufeff'
            yield writer.writerow(headers)

            for pulp in queryset.iterator(chunk_size=1000):
                # Base columns up to thickener_consistency
                row = [
                    pulp.roll_number or '',
                    production_line_map.get(pulp.ProductionLine, '') if pulp.ProductionLine is not None else '',
                    pulp.lower_sampling_time or '',
                    pulp.downpulpcount or '',
                    pulp.lower_water_filter or '',
                    pulp.lower_headbox_freeness or '',
                    pulp.lower_ph or '',
                    pulp.lower_pulp_temperature or '',
                    pulp.upper_headbox_consistency or '',
                    pulp.upper_water_filter or '',
                    pulp.upper_headbox_freeness or '',
                    pulp.upper_ph or '',
                    pulp.upper_pulp_temperature or '',
                    pulp.pond8_consistency or '',
                    pulp.curtain_consistency or '',
                    pulp.thickener_consistency or '',
                ]

                # Append dynamic sampling location values in the same order as headers
                try:
                    sampling_locations = pulp.sampling_locations.all()
                except Exception:
                    sampling_locations = []
                loc_map = {sl.title: (sl.value or '') for sl in sampling_locations}
                for title in location_name_titles:
                    row.append(loc_map.get(title, ''))

                # Finally append timestamps
                row.append(to_jalali_datetime(pulp.created_at))
                row.append(to_jalali_datetime(pulp.last_updated))

                yield writer.writerow(row)

        response = StreamingHttpResponse(stream(), content_type='text/csv; charset=utf-8')
        date_from = request.query_params.get('date_from', '')
        date_to = request.query_params.get('date_to', '')
        if date_from and date_to:
            filename = f'pulp-{date_from}-{date_to}.csv'
        elif date_from:
            filename = f'pulp-{date_from}-.csv'
        elif date_to:
            filename = f'pulp--{date_to}.csv'
        else:
            filename = f'pulp-{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"; filename*=UTF-8\'\'{filename}'
        return response
    
    @action(detail=False, methods=['get'])
    def location_names(self, request):
        """
        Get all unique location names for suggestions.
        """
        location_names = pulp_Sampling_Location_names.objects.all().order_by('title')
        names = [{'id': loc.id, 'title': loc.title} for loc in location_names]
        return Response(names)