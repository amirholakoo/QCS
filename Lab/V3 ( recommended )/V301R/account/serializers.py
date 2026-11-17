"""
Serializers for account app.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for User model.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'created_at', 'allowed_pages']
        read_only_fields = ['id', 'username', 'created_at']
    
    def to_representation(self, instance):
        """
        Custom representation to handle cases where allowed_pages field might not exist in DB yet.
        Empty array [] is treated as None (full access) for consistency.
        """
        data = super().to_representation(instance)
        # Handle allowed_pages field - use getattr to safely access it in case migration hasn't run yet
        try:
            allowed_pages = getattr(instance, 'allowed_pages', None)
            # Convert empty array to None for consistency (empty = full access)
            if allowed_pages is None or (isinstance(allowed_pages, list) and len(allowed_pages) == 0):
                data['allowed_pages'] = None
            else:
                data['allowed_pages'] = allowed_pages
        except (AttributeError, KeyError):
            # Field doesn't exist in database yet (migration not run) - default to full access
            data['allowed_pages'] = None
        return data


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login/register functionality.
    Allows login even without names - all users can login.
    """
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')