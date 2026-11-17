"""
Serializers for speed app.
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Speed
from logs.utils import log_action, get_field_verbose_name


class SpeedSerializer(serializers.ModelSerializer):
    """
    Serializer for Speed model.
    """
    class Meta:
        model = Speed
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated']

    def create(self, validated_data):
        speed = super().create(validated_data)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                log_action(request.user.username, 'Speed', 'create', [{
                    "name": "سرعت",
                    "new": str(speed),
                    "roll_number": speed.Roll_Number
                }])
            except Exception:
                pass
        return speed

    def update(self, instance, validated_data):
        details = []
        for key, value in validated_data.items():
            try:
                old_value = getattr(instance, key)
                if old_value != value:
                    verbose_name = get_field_verbose_name(Speed, key)
                    details.append({
                        "name": verbose_name,
                        "old": str(old_value) if old_value is not None else '-',
                        "new": str(value) if value is not None else '-',
                        "roll_number": getattr(instance, 'Roll_Number', None)
                    })
            except Exception:
                continue
        request = self.context.get('request')
        if request and request.user.is_authenticated and details:
            try:
                log_action(request.user.username, 'Speed', 'edit', details)
            except Exception:
                pass
        instance.last_updated = timezone.now()
        return super().update(instance, validated_data)
