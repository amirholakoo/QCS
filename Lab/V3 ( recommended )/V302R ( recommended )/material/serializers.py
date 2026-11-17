"""
Serializers for material app.
"""
from rest_framework import serializers
from .models import Material
from logs.utils import log_action, get_field_verbose_name


class MaterialSerializer(serializers.ModelSerializer):
    """
    Serializer for Material model.
    """
    user_display = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated', 'user']
    
    def get_user_display(self, obj):
        """Get user display name."""
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        return "نامشخص"
    
    def create(self, validated_data):
        """
        Create material with current user.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['user'] = request.user
        else:
            # Get the first available user or create a default one
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                user = User.objects.first()
                if not user:
                    user = User.objects.create(
                        username='default_user',
                        first_name='کاربر',
                        last_name='پیش‌فرض'
                    )
                validated_data['user'] = user
            except Exception:
                # If there's any issue, create a default user
                user = User.objects.create(
                    username='default_user',
                    first_name='کاربر',
                    last_name='پیش‌فرض'
                )
                validated_data['user'] = user
        
        material = super().create(validated_data)
        
        # Log action if user is authenticated
        if request and request.user.is_authenticated:
            try:
                details = [{
                    "name": "نام ماده",
                    "new": material.material_name,
                    "roll_number": None
                }]
                log_action(request.user.username, 'Material', 'create', details)
            except:
                pass
        
        return material
    
    def update(self, instance, validated_data):
        """
        Update material and log changes.
        """
        details = []
        for key, value in validated_data.items():
            try:
                old_value = getattr(instance, key)
                if old_value != value:
                    # Get verbose name for the field
                    verbose_name = get_field_verbose_name(Material, key)
                    
                    old_formatted = str(old_value) if old_value is not None else '-'
                    new_formatted = str(value) if value is not None else '-'
                    
                    details.append({
                        "name": verbose_name,
                        "old": old_formatted,
                        "new": new_formatted,
                        "roll_number": None
                    })
            except Exception as e:
                # Skip fields that can't be accessed or compared
                continue
        
        request = self.context.get('request')
        if request and request.user.is_authenticated and details:
            try:
                log_action(request.user.username, 'Material', 'edit', details)
            except:
                pass
        
        return super().update(instance, validated_data)