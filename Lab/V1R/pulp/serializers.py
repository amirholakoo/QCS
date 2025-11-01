"""
Serializers for pulp app.
"""
from rest_framework import serializers
from .models import Pulp

class PulpSerializer(serializers.ModelSerializer):
    """
    Serializer for Pulp model.
    """
    class Meta:
        model = Pulp
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated']

class PulpListSerializer(serializers.ModelSerializer):
    """
    Serializer for Pulp list view with all fields.
    """
    class Meta:
        model = Pulp
        fields = [
            'id', 'roll_number', 'lower_sampling_time', 'downpulpcount', 'downpulpfreenes',
            'lower_headbox_freeness', 'lower_ph', 'lower_pulp_temperature', 'lower_water_filter',
            'upper_headbox_consistency', 'upper_headbox_freeness', 'upper_ph', 'upper_pulp_temperature',
            'upper_water_filter', 'pond8_consistency', 'curtain_consistency', 'thickener_consistency',
            'created_at', 'last_updated'
        ]