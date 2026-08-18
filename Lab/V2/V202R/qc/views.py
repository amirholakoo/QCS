"""
Views for QC (Quality Control) app.
"""
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from paper.models import Paper
from .models import Customer, Loading, QCRecord
from .serializers import (
    CustomerSerializer, LoadingSerializer, QCRecordSerializer, 
    QCRecordListSerializer, PaperFieldsSerializer
)
import qrcode
from io import BytesIO
import base64
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import json


class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Customer model.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [AllowAny]  # Temporarily changed for testing
    
    def get_queryset(self):
        queryset = Customer.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name_family__icontains=search) |
                Q(national_code__icontains=search) |
                Q(phone_number__icontains=search)
            )
        return queryset.order_by('-created_at')


class LoadingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Loading model.
    """
    queryset = Loading.objects.all()
    serializer_class = LoadingSerializer
    permission_classes = [AllowAny]  # Temporarily changed for testing


class QCRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for QCRecord model.
    """
    queryset = QCRecord.objects.all()
    permission_classes = [AllowAny]  # Temporarily changed for testing
    
    def update(self, request, *args, **kwargs):
        """
        Override update to add debug logging.
        """
        print(f"DEBUG - Update request data: {request.data}")
        try:
            response = super().update(request, *args, **kwargs)
            print(f"DEBUG - Update successful: {response.data}")
            return response
        except Exception as e:
            print(f"DEBUG - Update failed: {str(e)}")
            raise
    
    def partial_update(self, request, *args, **kwargs):
        """
        Override partial_update to add debug logging.
        """
        print(f"DEBUG - Partial update request data: {request.data}")
        try:
            response = super().partial_update(request, *args, **kwargs)
            print(f"DEBUG - Partial update successful: {response.data}")
            return response
        except Exception as e:
            print(f"DEBUG - Partial update failed: {str(e)}")
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
        queryset = QCRecord.objects.select_related(
            'customer_id', 'loading_id', 'user'
        ).prefetch_related('rollnumbers').all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        # Filter by user
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
        
        papers = Paper.objects.all()
        
        # Apply search filter if provided
        if search_query:
            papers = papers.filter(roll_number__icontains=search_query)
        else:
            papers = papers.filter(created_at__gte=since)
        
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
            
            # Handle user assignment for AllowAny permission
            if request.user.is_authenticated:
                qc_data['user'] = request.user.id
            else:
                # For testing with AllowAny, use the first user or create a default
                from django.contrib.auth import get_user_model
                User = get_user_model()
                default_user = User.objects.first()
                if default_user:
                    qc_data['user'] = default_user.id
                else:
                    return Response({
                        'success': False,
                        'error': 'No user available for QC record creation'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            print("DEBUG - Final QC data:", qc_data)
            print("DEBUG - Rollnumbers IDs:", rollnumbers_ids)
            
            qc_serializer = QCRecordSerializer(data=qc_data, context={'request': request})
            if qc_serializer.is_valid():
                qc_record = qc_serializer.save()
                
                return Response({
                    'success': True,
                    'qc_record': QCRecordSerializer(qc_record, context={'request': request}).data
                }, status=status.HTTP_201_CREATED)
            else:
                print("DEBUG - QC Record validation errors:", qc_serializer.errors)
                return Response({
                    'success': False,
                    'errors': {'qc_record': qc_serializer.errors}
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            print("DEBUG - Exception occurred:", str(e))
            import traceback
            traceback.print_exc()
            return Response({
                'success': False,
                'error': str(e),
                'debug_data': data
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
