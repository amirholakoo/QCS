"""
Serializers for logs app.
"""
from rest_framework import serializers
from .models import LogEntry


class LogEntrySerializer(serializers.ModelSerializer):
    """
    Serializer for LogEntry model.
    """
    modelName = serializers.CharField(source='model_name', read_only=True)
    actionType = serializers.CharField(source='action_type', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    
    class Meta:
        model = LogEntry
        fields = ['id', 'username','details', 'modelName', 'actionType', 'action_type_display', 'timestamp']
        read_only_fields = ['id', 'username', 'modelName', 'actionType', 'timestamp']