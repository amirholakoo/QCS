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
        fields = ['id', 'username', 'first_name', 'last_name', 'created_at']
        read_only_fields = ['id', 'username', 'created_at']


class LoginSerializer(serializers.Serializer):
    """
    Serializer for login/register functionality.
    """
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    
    def validate(self, data):
        """
        Validate that at least one name is provided.
        """
        if not data.get('first_name') and not data.get('last_name'):
            raise serializers.ValidationError(
                "حداقل نام یا نام خانوادگی باید وارد شود."
            )
        return data