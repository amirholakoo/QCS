"""
Serializers for material app.
"""
from rest_framework import serializers
from .models import Material


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
        return super().create(validated_data)