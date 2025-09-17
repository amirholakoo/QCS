"""
Views for paper app.
"""
import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Paper
from .serializers import PaperSerializer, PaperListSerializer
from logs.utils import log_action


class PaperViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Paper model with CRUD operations.
    """
    queryset = Paper.objects.all()
    serializer_class = PaperSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'list':
            return PaperListSerializer
        return PaperSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        """
        queryset = Paper.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(roll_number__icontains=search) |
                Q(responsible_person_name__icontains=search) |
                Q(date__icontains=search)
            )
        
        # Filter by shift
        shift = self.request.query_params.get('shift', None)
        if shift:
            queryset = queryset.filter(shift=shift)
        
        # Filter by paper type
        paper_type = self.request.query_params.get('paper_type', None)
        if paper_type:
            queryset = queryset.filter(paper_type=paper_type)
        
        # Sorting
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Create paper record and log the action.
        """
        paper = serializer.save()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Paper', 'create')
            except:
                pass
    
    def perform_update(self, serializer):
        """
        Update paper record and log the action.
        """
        # Save the updated instance
        updated_paper = serializer.save()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Paper', 'edit')
            except:
                pass
    
    def perform_destroy(self, instance):
        """
        Delete paper record and log the action.
        """
        instance.delete()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Paper', 'delete')
            except:
                pass
    
    @action(detail=False, methods=['get'])
    def suggestions(self, request):
        """
        Get suggestions for autocomplete fields.
        """
        # Get unique values for suggestions with case-insensitive deduplication
        responsible_persons_raw = Paper.objects.values_list('responsible_person_name', flat=True).distinct()
        paper_types_raw = Paper.objects.values_list('paper_type', flat=True).distinct()
        shifts_raw = Paper.objects.values_list('shift', flat=True).distinct()
        material_usage_raw = Paper.objects.values_list('material_usage', flat=True).distinct()
        temp_before_press_raw = Paper.objects.values_list('cylinder_temperature_before_press', flat=True).distinct()
        temp_after_press_raw = Paper.objects.values_list('cylinder_temperature_after_press', flat=True).distinct()
        machine_speed_raw = Paper.objects.values_list('machine_speed', flat=True).distinct()
        
        # Filter out empty values and normalize for deduplication
        responsible_persons_clean = []
        paper_types_clean = []
        shifts_clean = []
        material_usage_suggestions = {}
        temp_before_press_clean = []
        temp_after_press_clean = []
        machine_speed_clean = []
        
        # Deduplicate responsible person names
        seen_names = set()
        for name in responsible_persons_raw:
            if name and name.strip():  # Check if name exists and is not just whitespace
                normalized_name = name.strip()  # Remove leading/trailing whitespace
                if normalized_name.lower() not in seen_names:  # Case-insensitive check
                    seen_names.add(normalized_name.lower())
                    responsible_persons_clean.append(normalized_name)
        
        # Deduplicate paper types
        seen_types = set()
        for paper_type in paper_types_raw:
            if paper_type and paper_type.strip():
                normalized_type = paper_type.strip()
                if normalized_type.lower() not in seen_types:
                    seen_types.add(normalized_type.lower())
                    paper_types_clean.append(normalized_type)
        
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
        paper_types_clean.sort()
        shifts_clean.sort()
        temp_before_press_clean.sort()
        temp_after_press_clean.sort()
        machine_speed_clean.sort()
        
        return Response({
            'responsible_person_names': responsible_persons_clean,
            'paper_types': paper_types_clean,
            'shifts': shifts_clean,
            'temp_before_press_suggestions': temp_before_press_clean,
            'temp_after_press_suggestions': temp_after_press_clean,
            'machine_speed_suggestions': machine_speed_clean,
            'material_usage_suggestions': material_usage_suggestions,
        })