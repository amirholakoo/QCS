"""
Serializers for pulp app.
"""
from rest_framework import serializers
from .models import Pulp, pulp_Sampling_Location_names, pulp_Sampling_Location_vals


class PulpSamplingLocationValSerializer(serializers.ModelSerializer):
    """
    Serializer for pulp sampling location values.
    """
    class Meta:
        model = pulp_Sampling_Location_vals
        fields = ['id', 'title', 'value']
        read_only_fields = ['id']


class PulpSerializer(serializers.ModelSerializer):
    """
    Serializer for Pulp model.
    """
    sampling_locations = PulpSamplingLocationValSerializer(many=True, required=False, read_only=True)
    sampling_location_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Pulp
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated']
    
    def create(self, validated_data):
        sampling_location_data = validated_data.pop('sampling_location_data', [])
        pulp = Pulp.objects.create(**validated_data)
        
        # Create sampling location values and names
        for item in sampling_location_data:
            title = item.get('title', '').strip()
            value = item.get('value', '').strip()
            
            if title:
                # Get or create the location name
                location_name, _ = pulp_Sampling_Location_names.objects.get_or_create(title=title)
                
                # Create the value record
                pulp_Sampling_Location_vals.objects.create(
                    pulp=pulp,
                    title=title,
                    value=value
                )
        
        return pulp
    
    def update(self, instance, validated_data):
        sampling_location_data = validated_data.pop('sampling_location_data', None)
        
        # Update pulp fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update sampling locations if provided
        if sampling_location_data is not None:
            # Delete existing sampling locations
            instance.sampling_locations.all().delete()
            
            # Create new sampling locations
            for item in sampling_location_data:
                title = item.get('title', '').strip()
                value = item.get('value', '').strip()
                
                if title:
                    # Get or create the location name
                    location_name, _ = pulp_Sampling_Location_names.objects.get_or_create(title=title)
                    
                    # Create the value record
                    pulp_Sampling_Location_vals.objects.create(
                        pulp=instance,
                        title=title,
                        value=value
                    )
        
        return instance

class PulpListSerializer(serializers.ModelSerializer):
    """
    Serializer for Pulp list view with all fields.
    """
    sampling_locations = PulpSamplingLocationValSerializer(many=True, read_only=True)
    
    class Meta:
        model = Pulp
        fields = [
            'id', 'roll_number', 'ProductionLine', 'lower_sampling_time', 'downpulpcount',
            'lower_headbox_freeness', 'lower_ph', 'lower_pulp_temperature', 'lower_water_filter',
            'upper_headbox_consistency', 'upper_headbox_freeness', 'upper_ph', 'upper_pulp_temperature',
            'upper_water_filter', 'pond8_consistency', 'curtain_consistency', 'thickener_consistency',
            'sampling_locations', 'created_at', 'last_updated'
        ]