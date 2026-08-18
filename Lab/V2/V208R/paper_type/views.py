"""
Views for paper_type app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import PaperType
from .serializers import PaperTypeSerializer
from logs.utils import log_action


class PaperTypeViewSet(viewsets.ModelViewSet):
    queryset = PaperType.objects.filter(is_delete=False)
    serializer_class = PaperTypeSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = PaperType.objects.filter(is_delete=False)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(Q(name__icontains=search))
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
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'PaperType', 'delete', [{"name": "نام نوع کاغذ", "old": instance.name, "roll_number": None}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = PaperType.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'PaperType', 'restore', [{'name': 'نام نوع کاغذ', 'new': instance.name, 'roll_number': None}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
