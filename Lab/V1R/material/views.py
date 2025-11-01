"""
Views for material app.
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
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
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """
        Filter queryset based on query parameters.
        """
        queryset = Material.objects.all()
        
        # Search functionality
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(material_name__icontains=search) |
                Q(description__icontains=search)
            )
        
        # Sorting
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
        
        material = serializer.save(user=user)
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Material', 'create')
            except:
                pass
    
    def perform_update(self, serializer):
        """
        Update material and log the action.
        """
        serializer.save()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Material', 'edit')
            except:
                pass
    
    def perform_destroy(self, instance):
        """
        Delete material and log the action.
        """
        instance.delete()
        
        # Log action if user is authenticated
        if self.request.user.is_authenticated:
            try:
                log_action(self.request.user.username, 'Material', 'delete')
            except:
                pass