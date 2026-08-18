"""
Views for speed app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from paper_management.permissions import DjangoModelPermissionsWithView
from django.db.models import Q
from django.utils import timezone
from .models import Speed
from .serializers import SpeedSerializer
from logs.utils import log_action


class SpeedViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Speed model with CRUD operations.
    """
    queryset = Speed.objects.filter(is_delete=False)
    serializer_class = SpeedSerializer
    permission_classes = [DjangoModelPermissionsWithView]

    def get_queryset(self):
        queryset = Speed.objects.filter(is_delete=False)
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
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Speed', 'delete', [{"name": "سرعت", "old": info, "roll_number": roll}])
            except Exception:
                pass
        instance.is_delete = True
        instance.last_updated = timezone.now()
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore soft-deleted speed record."""
        instance = Speed.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.last_updated = timezone.now()
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Speed', 'restore', [{'name': 'سرعت', 'new': str(instance), 'roll_number': instance.Roll_Number}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
