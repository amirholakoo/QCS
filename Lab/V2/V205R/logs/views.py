"""
Views for logs app.
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import LogEntry
from .serializers import LogEntrySerializer


class LogEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for LogEntry model (read-only).
    """
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        """
        queryset = LogEntry.objects.all()
        
        # Search functionality - more comprehensive search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(model_name__icontains=search) |
                Q(action_type__icontains=search)
            )
        
        # Filter by action type
        action_type = self.request.query_params.get('action_type', None)
        if action_type:
            queryset = queryset.filter(action_type=action_type)
        
        # Filter by model name
        model_name = self.request.query_params.get('model_name', None)
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        
        # Filter by username
        username = self.request.query_params.get('username', None)
        if username:
            queryset = queryset.filter(username__icontains=username)
        
        # Date range filtering
        date_from = self.request.query_params.get('date_from', None)
        if date_from:
            try:
                from datetime import datetime
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__date__gte=date_from_obj.date())
            except ValueError:
                pass
        
        date_to = self.request.query_params.get('date_to', None)
        if date_to:
            try:
                from datetime import datetime
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__date__lte=date_to_obj.date())
            except ValueError:
                pass
        
        # Sorting
        sort_by = self.request.query_params.get('sort_by', '-timestamp')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        
        return queryset