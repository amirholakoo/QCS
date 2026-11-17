"""
Views for material app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from paper_management.permissions import DjangoModelPermissionsWithView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db.models import Q
from .models import Material
from .serializers import MaterialSerializer
from logs.utils import log_action


class MaterialViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Material model with CRUD operations.
    """
    queryset = Material.objects.filter(is_delete=False)
    serializer_class = MaterialSerializer
    permission_classes = [DjangoModelPermissionsWithView]
    
    def get_queryset(self):
        queryset = Material.objects.filter(is_delete=False)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(material_name__icontains=search) |
                Q(description__icontains=search)
            )
        sort_by = self.request.query_params.get('sort_by', 'material_name')
        if sort_by:
            queryset = queryset.order_by(sort_by)
        return queryset
    
    def perform_create(self, serializer):
        """
        Create material and log the action.
        """
        # Get the first user if no authenticated user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if self.request.user.is_authenticated:
            user = self.request.user
        else:
            # Get the first available user or create a default one
            try:
                user = User.objects.first()
                if not user:
                    user = User.objects.create(
                        username='default_user',
                        first_name='کاربر',
                        last_name='پیش‌فرض'
                    )
            except Exception:
                # If there's any issue, create a default user
                user = User.objects.create(
                    username='default_user',
                    first_name='کاربر',
                    last_name='پیش‌فرض'
                )
        
        # Logging is handled in serializer
        serializer.save(user=user)
    
    def perform_update(self, serializer):
        """
        Update material and log the action.
        """
        # Logging is handled in serializer
        serializer.save()
    
    def perform_destroy(self, instance):
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Material', 'delete', [{"name": "نام ماده", "old": instance.material_name, "roll_number": None}])
            except Exception:
                pass
        instance.is_delete = True
        instance.save(update_fields=['is_delete', 'last_updated'])

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        instance = Material.objects.filter(pk=pk).first()
        if not instance:
            return Response({'detail': 'رکورد یافت نشد.'}, status=status.HTTP_404_NOT_FOUND)
        if not instance.is_delete:
            return Response({'detail': 'رکورد حذف نشده است.'}, status=status.HTTP_400_BAD_REQUEST)
        instance.is_delete = False
        instance.save(update_fields=['is_delete', 'last_updated'])
        if request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Material', 'restore', [{'name': 'نام ماده', 'new': instance.material_name, 'roll_number': None}])
            except Exception:
                pass
        serializer = self.get_serializer(instance)
        return Response(serializer.data)