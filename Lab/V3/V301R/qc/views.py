"""
Views for QC (Quality Control) app.
"""
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from paper_management.permissions import DjangoModelPermissionsWithView
from paper.models import Paper
from logs.utils import log_action
from .models import Customer, Loading, QCRecord
from .serializers import (
    CustomerSerializer, LoadingSerializer, QCRecordSerializer, 
    QCRecordListSerializer, PaperFieldsSerializer
)
from django.core.paginator import Paginator
import qrcode
from io import BytesIO
import base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import json
import requests
import logging

logger = logging.getLogger(__name__)

def qc_list_report(request):
    page_number = request.GET.get('page', 1)
    qc_paginator = Paginator(QCRecord.objects.filter(status="completed"), 20)
    qcr_result = qc_paginator.get_page(page_number)
    context = {
        "qc": qcr_result,
    }
    return render(request,"qc/QCList.html",context)

def qc_report_detail(request, id):
    target = QCRecord.objects.filter(id=id).first()
    if target:

        return render(request,"qc/QCDetail.html",{"qc_detail":target})
    return HttpResponse("یافت نشد، لطفا به صفحه قبل بازگردید و صفحه بروزرسانی کنید")

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.filter(is_delete=False)
    serializer_class = CustomerSerializer
    permission_classes = [DjangoModelPermissionsWithView]
    
    def get_queryset(self):
        queryset = Customer.objects.filter(is_delete=False)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name_family__icontains=search) |
                Q(national_code__icontains=search) |
                Q(phone_number__icontains=search)
            )
        return queryset.order_by('-created_at')
    
    def perform_destroy(self, instance):
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Customer', 'delete', [{"name": "نام و نام خانوادگی", "old": instance.name_family, "roll_number": None}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = Customer.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Customer', 'restore', [{'name': 'نام و نام خانوادگی', 'new': instance.name_family, 'roll_number': None}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class LoadingViewSet(viewsets.ModelViewSet):
    queryset = Loading.objects.filter(is_delete=False)
    serializer_class = LoadingSerializer
    permission_classes = [DjangoModelPermissionsWithView]
    
    def get_queryset(self):
        return Loading.objects.filter(is_delete=False)
    
    def perform_destroy(self, instance):
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Loading', 'delete', [{"name": "مشخصات بارگیری", "old": f"Loading-{instance.id}", "roll_number": None}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = Loading.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Loading', 'restore', [{'name': 'مشخصات بارگیری', 'new': f'Loading-{instance.id}', 'roll_number': None}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class QCRecordViewSet(viewsets.ModelViewSet):
    queryset = QCRecord.objects.filter(is_delete=False)
    permission_classes = [DjangoModelPermissionsWithView]
    
    LOCK_DURATION_MINUTES = 15
    
    def _is_locked_by_other(self, instance, user):
        now = timezone.now()
        if not instance.editing_by_id or not instance.edit_lock_expires_at:
            return False
        if instance.edit_lock_expires_at <= now:
            return False
        return instance.editing_by_id != getattr(user, 'id', None)

    def perform_destroy(self, instance):
        roll_numbers = instance.get_roll_numbers_list()
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'QCRecord', 'delete', [{"name": "رکورد کنترل کیفی", "old": f"QC-{instance.id}", "roll_number": roll_numbers[0] if roll_numbers else None}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_update'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = QCRecord.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_update'])
        if request.user.is_authenticated:
            try:
                roll_numbers = instance.get_roll_numbers_list()
                log_action(request.user.username, 'QCRecord', 'restore', [{'name': 'رکورد کنترل کیفی', 'new': f'QC-{instance.id}', 'roll_number': roll_numbers[0] if roll_numbers else None}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        Override update to add debug logging.
        """
        instance = self.get_object()
        if self._is_locked_by_other(instance, request.user):
            editor_name = instance.editing_by.get_full_name() if instance.editing_by else 'کاربر دیگر'
            return Response(
                {
                    'success': False,
                    'error': f'{editor_name} در حال ویرایش این فرم است. لطفا بعدا تلاش کنید.'
                },
                status=423
            )
        #print(f"DEBUG - Update request data: {request.data}")
        try:
            response = super().update(request, *args, **kwargs)
            #print(f"DEBUG - Update successful: {response.data}")
            return response
        except Exception as e:
            #print(f"DEBUG - Update failed: {str(e)}")
            raise
    
    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update to add debug logging.
        """
        instance = self.get_object()
        if self._is_locked_by_other(instance, request.user):
            editor_name = instance.editing_by.get_full_name() if instance.editing_by else 'کاربر دیگر'
            return Response(
                {
                    'success': False,
                    'error': f'{editor_name} در حال ویرایش این فرم است. لطفا بعدا تلاش کنید.'
                },
                status=423
            )
        #print(f"DEBUG - Partial update request data: {request.data}")
        try:
            response = super().partial_update(request, *args, **kwargs)
            #print(f"DEBUG - Partial update successful: {response.data}")
            return response
        except Exception as e:
            #print(f"DEBUG - Partial update failed: {str(e)}")
            raise
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        return [permission() for permission in self.permission_classes]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return QCRecordListSerializer
        return QCRecordSerializer
    
    def get_queryset(self):
        print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<")
        print("=" * 80)
        print("PATH:", self.request.path)
        print("HOST:", self.request.get_host())
        print("COOKIE:", self.request.COOKIES.get("sessionid"))
        print("SESSION:", self.request.session.session_key)
        print("AUTH:", self.request.user.is_authenticated)
        print("USER:", self.request.user)
        print("HEADERS:", dict(self.request.headers))
        print("=" * 80)
        print(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<<<<<<<<<<<<<")
        now = timezone.now()
        # Clear expired locks opportunistically
        QCRecord.objects.filter(edit_lock_expires_at__isnull=False, edit_lock_expires_at__lte=now).update(
            editing_by=None,
            editing_started_at=None,
            edit_lock_expires_at=None
        )
        queryset = QCRecord.objects.filter(is_delete=False).select_related(
            'customer_id', 'loading_id', 'user', 'editing_by'
        ).prefetch_related('rollnumbers')
        
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        user_filter = self.request.query_params.get('user', None)
        if user_filter:
            queryset = queryset.filter(user_id=user_filter)
        return queryset.order_by('-create_time')
    
    @action(detail=False, methods=['get'])
    def recent_papers(self, request):
        """
        Get recent paper records (last 24 hours by default, or custom hours).
        Supports searching by roll number and filtering by usage status.
        """
        hours = int(request.query_params.get('hours', 24))
        since = timezone.now() - timedelta(hours=hours)
        search_query = request.query_params.get('search', None)
        show_only_unused = request.query_params.get('only_unused', 'false').lower() == 'true'
        exclude_qc_id = request.query_params.get('exclude_qc_id', None)
        
        papers = Paper.objects.filter(is_delete=False)
        
        # Apply search filter if provided
        if search_query:
            papers = papers.filter(roll_number__icontains=search_query)
        else:
            papers = papers.filter(created_at__gte=since)
        
        # print("==================",papers.count(),"==================")
        # Track used papers info when in only_unused mode with search
        used_papers_info = []
        
        # Filter to show only unused papers if requested
        if show_only_unused:
            used_paper_ids_query = QCRecord.objects.all()
            if exclude_qc_id:
                used_paper_ids_query = used_paper_ids_query.exclude(id=exclude_qc_id)
            used_paper_ids = used_paper_ids_query.values_list('rollnumbers', flat=True)
            
            # If searching, find papers that match but are used
            if search_query:
                used_matching_papers = papers.filter(id__in=used_paper_ids)
                for paper in used_matching_papers:
                    # Find which QC records use this paper
                    qc_records = QCRecord.objects.filter(rollnumbers=paper)
                    if exclude_qc_id:
                        qc_records = qc_records.exclude(id=exclude_qc_id)
                    qc_ids = list(qc_records.values_list('id', flat=True))
                    if qc_ids:
                        used_papers_info.append({
                            'roll_number': paper.roll_number,
                            'paper_id': paper.id,
                            'used_in_qc_ids': qc_ids
                        })
            
            papers = papers.exclude(id__in=used_paper_ids)
        
        available_papers = papers.order_by('-created_at')
        
        from paper.serializers import PaperSerializer
        serializer = PaperSerializer(available_papers, many=True)
        
        return Response({
            'success': True,
            'papers': serializer.data,
            'total_count': available_papers.count(),
            'hours_range': hours,
            'search_query': search_query,
            'only_unused': show_only_unused,
            'used_papers_info': used_papers_info
        })

    def _fetch_anbar_api(self, endpoint, params=None):
        base_url = 'http://192.168.2.45:8000/myapp/api'
        response = requests.get(
            f'{base_url}/{endpoint}',
            params=params or {},
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    @action(detail=False, methods=['get'])
    def warehouse_names(self, request):
        warehouse_name_to_fa = {
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
            "anbar": "انبار",
        }
        try:
            payload = self._fetch_anbar_api('getAnbarTableNames')
            names = payload.get('data') if isinstance(payload, dict) else []
            if not isinstance(names, list):
                names = []
            normalized_names = [str(name) for name in names if name]
            return Response({
                'success': True,
                'warehouses': normalized_names,
            })
        except Exception as exc:
            return Response(
                {
                    'success': False,
                    'error': f'Failed to fetch warehouse names: {str(exc)}',
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=['get'])
    def warehouse_widths(self, request):
        anbar_location = request.query_params.get('anbar_location')
        if not anbar_location:
            return Response(
                {'success': False, 'error': 'anbar_location is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = self._fetch_anbar_api('getWidths', {'anbar_location': anbar_location})
            widths = payload.get('widths') if isinstance(payload, dict) else []
            cleaned_widths = sorted({
                int(width)
                for width in widths or []
                if width is not None and str(width).strip() != ''
            })
            return Response({
                'success': True,
                'widths': cleaned_widths,
            })
        except Exception as exc:
            return Response(
                {
                    'success': False,
                    'error': f'Failed to fetch widths: {str(exc)}',
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=['get'])
    def warehouse_reels(self, request):
        anbar_location = request.query_params.get('anbar_location')
        width = request.query_params.get('width')
        search_query = request.query_params.get('search', None)
        show_only_unused = request.query_params.get('only_unused', 'false').lower() == 'true'
        exclude_qc_id = request.query_params.get('exclude_qc_id', None)

        if not anbar_location or width is None:
            return Response(
                {'success': False, 'error': 'anbar_location and width are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = self._fetch_anbar_api(
                'getReelNumbersByWidthAndStatus',
                {'anbar_location': anbar_location, 'width': width},
            )
            external_roll_numbers = payload.get('reel_numbers') if isinstance(payload, dict) else []
            external_roll_numbers = [str(roll).strip() for roll in (external_roll_numbers or []) if str(roll).strip()]

            if search_query:
                external_roll_numbers = [
                    roll for roll in external_roll_numbers
                    if search_query.lower() in roll.lower()
                ]

            papers = Paper.objects.filter(
                is_delete=False,
                roll_number__in=external_roll_numbers,
            )
            # Persist warehouse context on matched papers so edit mode can restore it later.
            if anbar_location:
                papers_to_update = [
                    paper for paper in papers
                    if getattr(paper, 'warehouse', None) != anbar_location
                ]
                if papers_to_update:
                    for paper in papers_to_update:
                        paper.warehouse = anbar_location
                    Paper.objects.bulk_update(papers_to_update, ['warehouse'])

            paper_by_roll = {paper.roll_number: paper for paper in papers}
            existing_roll_numbers = set(paper_by_roll.keys())
            missing_roll_numbers = [roll for roll in external_roll_numbers if roll not in existing_roll_numbers]

            used_papers_info = []
            available_papers = papers
            if show_only_unused:
                used_paper_ids_query = QCRecord.objects.filter(is_delete=False)
                if exclude_qc_id:
                    used_paper_ids_query = used_paper_ids_query.exclude(id=exclude_qc_id)
                used_paper_ids = list(used_paper_ids_query.values_list('rollnumbers', flat=True))

                used_matching_papers = papers.filter(id__in=used_paper_ids)
                for paper in used_matching_papers:
                    qc_records = QCRecord.objects.filter(rollnumbers=paper, is_delete=False)
                    if exclude_qc_id:
                        qc_records = qc_records.exclude(id=exclude_qc_id)
                    qc_ids = list(qc_records.values_list('id', flat=True))
                    if qc_ids:
                        used_papers_info.append({
                            'roll_number': paper.roll_number,
                            'paper_id': paper.id,
                            'used_in_qc_ids': qc_ids,
                        })

                available_papers = papers.exclude(id__in=used_paper_ids)

            available_papers = available_papers.order_by('-created_at')
            from paper.serializers import PaperSerializer
            serializer = PaperSerializer(available_papers, many=True)

            return Response({
                'success': True,
                'papers': serializer.data,
                'total_count': available_papers.count(),
                'external_roll_numbers_count': len(external_roll_numbers),
                'external_roll_numbers': external_roll_numbers,
                'missing_roll_count': len(missing_roll_numbers),
                'missing_roll_numbers': missing_roll_numbers,
                'used_papers_info': used_papers_info,
                'search_query': search_query,
                'only_unused': show_only_unused,
            })
        except Exception as exc:
            return Response(
                {
                    'success': False,
                    'error': f'Failed to fetch reels: {str(exc)}',
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
    
    @action(detail=False, methods=['get'])
    def paper_fields(self, request):
        """
        Get available paper fields for custom selection.
        """
        fields = PaperFieldsSerializer.get_available_fields()
        return Response({
            'success': True,
            'fields': fields
        })
    
    @action(detail=True, methods=['post'])
    def acquire_edit_lock(self, request, pk=None):
        qc_record = self.get_object()
        if not request.user.is_authenticated:
            return Response({'success': False, 'error': 'برای ویرایش باید وارد شوید.'}, status=status.HTTP_401_UNAUTHORIZED)

        now = timezone.now()
        if self._is_locked_by_other(qc_record, request.user):
            editor_name = qc_record.editing_by.get_full_name() if qc_record.editing_by else 'کاربر دیگر'
            return Response(
                {
                    'success': False,
                    'locked': True,
                    'error': f'{editor_name} در حال ویرایش این فرم است. لطفا صبر کنید.'
                },
                status=423
            )

        qc_record.editing_by = request.user
        qc_record.editing_started_at = now
        qc_record.edit_lock_expires_at = now + timedelta(minutes=self.LOCK_DURATION_MINUTES)
        qc_record.save(update_fields=['editing_by', 'editing_started_at', 'edit_lock_expires_at', 'last_update'])

        return Response({
            'success': True,
            'locked': True,
            'editing_by_name': request.user.get_full_name(),
            'lock_expires_at': qc_record.edit_lock_expires_at.isoformat() if qc_record.edit_lock_expires_at else None
        })

    @action(detail=True, methods=['post'])
    def release_edit_lock(self, request, pk=None):
        qc_record = self.get_object()
        if not request.user.is_authenticated:
            return Response({'success': False, 'error': 'برای ویرایش باید وارد شوید.'}, status=status.HTTP_401_UNAUTHORIZED)

        if qc_record.editing_by_id and qc_record.editing_by_id != request.user.id:
            return Response({'success': False, 'error': 'این فرم توسط کاربر دیگری قفل شده است.'}, status=403)

        qc_record.editing_by = None
        qc_record.editing_started_at = None
        qc_record.edit_lock_expires_at = None
        qc_record.save(update_fields=['editing_by', 'editing_started_at', 'edit_lock_expires_at', 'last_update'])

        return Response({'success': True, 'locked': False})

    @action(detail=True, methods=['post'])
    def generate_qr_data(self, request, pk=None):
        """
        Generate QR code data for a QC record.
        """
        qc_record = self.get_object()
        loading = qc_record.loading_id
        
        # Create QR data with loading specifications (normal loading data)
        qr_data = f"کنترل کیفی: GSM: {loading.grammage}, Width: {loading.width}, Moisture: {loading.humidity},COBB: {loading.cub}, BURST: {loading.burst}, Ash: {loading.ash}%, QC_id: {qc_record.id},نام مشتری: {qc_record.customer_id.name_family}\n Roll_numbers: {', '.join(str(roll) for roll in qc_record.get_roll_numbers_list())}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = BytesIO()
        qr_img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        return Response({
            'success': True,
            'qr_code': f"data:image/png;base64,{qr_base64}",
            'qr_data': qr_data
        })
    
    @action(detail=True, methods=['get'])
    def print_page_data(self, request, pk=None):
        """
        Get data for print page including QR code, roll numbers, and custom fields table.
        """
        qc_record = self.get_object()
        loading = qc_record.loading_id
        
        # Create QR data with loading specifications (normal loading data)
        qr_data = f"کنترل کیفی: GSM: {loading.grammage}, Width: {loading.width}, Moisture: {loading.humidity},COBB: {loading.cub}, BURST: {loading.burst}, Ash: {loading.ash}%, QC_id: {qc_record.id},نام مشتری: {qc_record.customer_id.name_family}\n Roll_numbers: {', '.join(str(roll) for roll in qc_record.get_roll_numbers_list())}"
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        # Create QR code image
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = BytesIO()
        qr_img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()
        
        # Get roll data with custom field mapping logic
        roll_data = qc_record.get_custom_table_data()
        
        # Get custom field display names with combined fields
        field_display_names = qc_record.get_custom_fields_display()
        processed_fields = qc_record._process_combined_fields()
        custom_fields_info = []
        
        for i, field_info in enumerate(processed_fields):
            field_name = field_info['field_name']
            display_name = field_display_names[i] if i < len(field_display_names) else field_name
            custom_fields_info.append({
                'field_name': field_name,
                'display_name': display_name
            })
        
        print(qc_record.column_order)
        return Response({
            'success': True,
            'qc_record': {
                'id': qc_record.id,
                'customer': {
                    'name_family': qc_record.customer_id.name_family,
                    'phone_number': qc_record.customer_id.phone_number,
                    'national_code': qc_record.customer_id.national_code,
                    'address': qc_record.customer_id.address,
                    'postal_code': qc_record.customer_id.postal_code,
                },
                'loading_specs': {
                    'grammage': loading.grammage,
                    'width': loading.width,
                    'humidity': loading.humidity,
                    'burst': loading.burst,
                    'cub': loading.cub,
                    'md': loading.md,
                    'cd': loading.cd,
                    'ash': loading.ash,
                    'custom': loading.custom,
                },
                'create_time': qc_record.create_time.isoformat(),
                'print_count': qc_record.print_count,
                'status': qc_record.status,
            },
            'qr_code': f"data:image/png;base64,{qr_base64}",
            'roll_numbers': qc_record.get_roll_numbers_list(),
            'roll_data': roll_data,
            'custom_fields_info': custom_fields_info,
            'column_order': qc_record.column_order if qc_record.column_order else None
        })

    @action(detail=True, methods=['post'])
    def save_column_order(self, request, pk=None):
        """
        Save the column order for the print table.
        """
        qc_record = self.get_object()
        column_order = request.data.get('column_order', [])
        
        if not isinstance(column_order, list):
            return Response({
                'success': False,
                'error': 'column_order must be a list'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate that all column names in the order exist in custom_fields_info
        processed_fields = qc_record._process_combined_fields()
        valid_field_names = [field_info['field_name'] for field_info in processed_fields]
        
        # Check if all column_order items are valid field names
        for field_name in column_order:
            if field_name not in valid_field_names:
                return Response({
                    'success': False,
                    'error': f'Invalid field name in column_order: {field_name}'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # Save the column order
        qc_record.column_order = column_order
        qc_record.save()
        
        return Response({
            'success': True,
            'column_order': qc_record.column_order
        })
    
    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        """
        Generate PDF for printing QC record.
        """
        qc_record = self.get_object()
        
        # Create PDF
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        try:
            # Register Persian font (you may need to adjust the path)
            # pdfmetrics.registerFont(TTFont('Persian', 'path/to/persian/font.ttf'))
            # p.setFont('Persian', 12)
            pass
        except:
            # Fallback to default font
            p.setFont('Helvetica', 12)
        
        # Title
        p.setFont('Helvetica-Bold', 16)
        p.drawString(50, height - 50, f"Quality Control Report - QC-{qc_record.id}")
        
        # Roll numbers (large font)
        p.setFont('Helvetica-Bold', 24)
        roll_numbers_text = f"Roll Numbers: {qc_record.get_roll_numbers_display()}"
        p.drawString(50, height - 100, roll_numbers_text)
        
        # Customer info
        p.setFont('Helvetica', 12)
        y_pos = height - 150
        p.drawString(50, y_pos, f"Customer: {qc_record.customer_id.name_family}")
        y_pos -= 20
        p.drawString(50, y_pos, f"Phone: {qc_record.customer_id.phone_number}")
        y_pos -= 20
        p.drawString(50, y_pos, f"National Code: {qc_record.customer_id.national_code}")
        
        # Loading specifications
        y_pos -= 40
        p.setFont('Helvetica-Bold', 14)
        p.drawString(50, y_pos, "Loading Specifications:")
        y_pos -= 20
        
        p.setFont('Helvetica', 12)
        loading = qc_record.loading_id
        specs = [
            f"Grammage: {loading.grammage}",
            f"Width: {loading.width}",
            f"Humidity: {loading.humidity}",
            f"Burst: {loading.burst}",
            f"CUB: {loading.cub}",
            f"MD: {loading.md}",
            f"CD: {loading.cd}",
        ]
        
        for spec in specs:
            p.drawString(70, y_pos, spec)
            y_pos -= 15
        
        # Custom paper fields table
        if qc_record.custom_items:
            y_pos -= 30
            p.setFont('Helvetica-Bold', 14)
            p.drawString(50, y_pos, "Selected Paper Properties:")
            y_pos -= 20
            
            p.setFont('Helvetica', 12)
            
            # Show custom fields for each paper record
            papers = qc_record.rollnumbers.all()
            field_display_names = qc_record.get_custom_fields_display()
            
            for i, field_name in enumerate(qc_record.custom_items):
                display_name = field_display_names[i] if i < len(field_display_names) else field_name
                p.drawString(70, y_pos, f"{display_name}:")
                y_pos -= 15
                
                # Show values for each paper
                for paper in papers:
                    field_value = getattr(paper, field_name, 'N/A')
                    value_text = f"  {paper.roll_number}: {field_value if field_value is not None else 'N/A'}"
                    p.drawString(90, y_pos, value_text)
                    y_pos -= 12
                
                y_pos -= 5  # Extra space between fields
        
        # QR Code (placeholder - you would generate actual QR code here)
        p.setFont('Helvetica', 10)
        p.drawString(400, height - 100, "QR Code")
        p.rect(400, height - 200, 100, 100)  # QR code placeholder
        
        # Footer
        p.setFont('Helvetica', 10)
        p.drawString(50, 50, f"Generated on: {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        p.drawString(50, 35, f"Print Count: {qc_record.print_count}")
        
        p.showPage()
        p.save()
        
        # Update print count and status
        qc_record.print_count += 1
        qc_record.status = 'printed'
        qc_record.save()
        
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="QC-{qc_record.id}.pdf"'
        
        return response
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Create QC record with all related data in one request.
        """
        data = request.data
        
        try:
            # Create customer if new
            customer_data = data.get('customer')
            
            if customer_data and customer_data.get('id'):
                customer = Customer.objects.get(id=customer_data['id'])
            elif customer_data:
                customer_serializer = CustomerSerializer(data=customer_data)
                if customer_serializer.is_valid():
                    customer = customer_serializer.save()
                else:
                    return Response({
                        'success': False,
                        'errors': {'customer': customer_serializer.errors}
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'success': False,
                    'error': 'Customer data is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create loading specifications
            loading_data = data.get('loading')
            
            if loading_data:
                loading_serializer = LoadingSerializer(data=loading_data)
                if loading_serializer.is_valid():
                    loading = loading_serializer.save()
                else:
                    return Response({
                        'success': False,
                        'errors': {'loading': loading_serializer.errors}
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'success': False,
                    'error': 'Loading data is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get the paper IDs (rollnumbers can be a list of IDs)
            rollnumbers_ids = data.get('rollnumbers_ids', [])
            
            # Create QC record
            qc_data = {
                'customer_id': customer.id,
                'loading_id': loading.id,
                'rollnumbers': rollnumbers_ids,  # Include rollnumbers in initial data
                'custom_items': data.get('custom_items', []),
                'print_count': data.get('print_count', 1),
                'status': 'completed'
            }
            
            if not request.user.is_authenticated:
                return Response({
                    'success': False,
                    'error': 'برای ثبت رکورد کنترل کیفی باید وارد شوید.'
                }, status=status.HTTP_401_UNAUTHORIZED)
            qc_data['user'] = request.user.id
            
            # print("DEBUG - Final QC data:", qc_data)
            # print("DEBUG - Rollnumbers IDs:", rollnumbers_ids)
            
            qc_serializer = QCRecordSerializer(data=qc_data, context={'request': request})
            if qc_serializer.is_valid():
                qc_record = qc_serializer.save()
                
                return Response({
                    'success': True,
                    'qc_record': QCRecordSerializer(qc_record, context={'request': request}).data
                }, status=status.HTTP_201_CREATED)
            else:
                # print("DEBUG - QC Record validation errors:", qc_serializer.errors)
                return Response({
                    'success': False,
                    'errors': {'qc_record': qc_serializer.errors}
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            # print("DEBUG - Exception occurred:", str(e))
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': str(e),
                'debug_data': data
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
