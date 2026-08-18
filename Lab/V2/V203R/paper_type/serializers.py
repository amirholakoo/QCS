"""
Serializers for paper_type app.
"""
from rest_framework import serializers
from .models import PaperType


class PaperTypeSerializer(serializers.ModelSerializer):
    """
    Serializer for PaperType model.
    """
    class Meta:
        model = PaperType
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated']

