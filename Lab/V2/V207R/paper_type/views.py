"""
Views for paper_type app.
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import PaperType
from .serializers import PaperTypeSerializer
from logs.utils import log_action


class PaperTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for PaperType model with CRUD operations.
    """
    queryset = PaperType.objects.all()
    serializer_class = PaperTypeSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        """
        queryset = PaperType.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
            )
        
        # Sorting
        sort_by = self.request.query_params.get('sort_by', 'name')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Create paper type and log the action.
        """
        paper_type = serializer.save()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                details = [{
                    "name": "نام نوع کاغذ",
                    "new": paper_type.name,
                    "roll_number": None
                }]
                log_action(self.request.user.username, 'PaperType', 'create', details)
            except:
                pass
    
    def perform_update(self, serializer):
        """
        Update paper type and log the action.
        Logging is handled in serializer.
        """
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Delete paper type and log the action.
        """
        paper_type_name = instance.name
        instance.delete()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                details = [{
                    "name": "نام نوع کاغذ",
                    "old": paper_type_name,
                    "roll_number": None
                }]
                log_action(self.request.user.username, 'PaperType', 'delete', details)
            except:
                pass
