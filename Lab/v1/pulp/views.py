"""
Views for pulp app.
"""
from rest_framework import viewsets
from django.db.models import Q
from .models import Pulp
from .serializers import PulpSerializer, PulpListSerializer
from logs.utils import log_action


from rest_framework.permissions import AllowAny

class PulpViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Pulp model with CRUD operations.
    """
    queryset = Pulp.objects.all()
    serializer_class = PulpSerializer
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'list':
            return PulpListSerializer
        return PulpSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        """
        queryset = Pulp.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(roll_number__icontains=search)
            )
        
        # Sorting
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
                log_action(self.request.user.username, 'Pulp', 'create')
            except:
                pass
    
    def perform_update(self, serializer):
        """
        Update pulp record and log the action.
        """
        serializer.save()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Pulp', 'edit')
            except:
                pass
    
    def perform_destroy(self, instance):
        """
        Delete pulp record and log the action.
        """
        instance.delete()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Pulp', 'delete')
            except:
                pass