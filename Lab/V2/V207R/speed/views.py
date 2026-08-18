"""
Views for speed app.
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Speed
from .serializers import SpeedSerializer
from logs.utils import log_action


class SpeedViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Speed model with CRUD operations.
    """
    queryset = Speed.objects.all()
    serializer_class = SpeedSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Speed.objects.all()
        search = self.request.query_params.get('search', None)
        if search:
            q = Q(Roll_Number__icontains=search)
            try:
                n = int(search)
                for i in range(1, 29):
                    q = q | Q(**{f'Speed{i}': n})
            except ValueError:
                pass
            queryset = queryset.filter(q)
        sort_by = self.request.query_params.get('sort_by', '-created_at')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        return queryset

    def perform_destroy(self, instance):
        roll = instance.Roll_Number
        info = str(instance)
        instance.delete()
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Speed', 'delete', [{
                    "name": "سرعت",
                    "old": info,
                    "roll_number": roll
                }])
            except Exception:
                pass
