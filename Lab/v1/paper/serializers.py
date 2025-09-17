"""
Serializers for paper app.
"""
from rest_framework import serializers
from .models import Paper
from django.contrib.auth import get_user_model

User = get_user_model()

class PaperSerializer(serializers.ModelSerializer):
    """
    Serializer for Paper model.
    """
    user_display = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Paper
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated', 'user']
    

    
    def validate_shift(self, value):
        """
        Validate shift field - allow None and empty string.
        """
        if value is None or value == '':
            return ''
        return value
    
    def validate_paper_type(self, value):
        """
        Validate paper_type field - allow None and empty string.
        """
        if value is None or value == '':
            return ''
        return value
    

    
    # Temporarily remove roll number validation to fix update issue
    # def validate_roll_number(self, value):
    #     """
    #     Validate roll number uniqueness.
    #     """
    #     # Get the current instance if this is an update
    #     instance = getattr(self, 'instance', None)
    #     
    #     # Check if roll number exists, excluding current instance
    #     if instance:
    #         # This is an update, exclude current instance
    #         if Paper.objects.filter(roll_number=value).exclude(pk=instance.pk).exists():
    #             raise serializers.ValidationError("این شماره رول قبلاً استفاده شده است.")
    #     else:
    #         # This is a create
    #         if Paper.objects.filter(roll_number=value).exists():
    #                 raise serializers.ValidationError("این شماره رول قبلاً استفاده شده است.")
    #     return value
    
    def create(self, validated_data):
        """
        Create paper record with current user.
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['user'] = request.user
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
                validated_data['user'] = user
            except Exception:
                # If there's any issue, create a default user
                user = User.objects.create(
                    username='default_user',
                    first_name='کاربر',
                    last_name='پیش‌فرض'
                )
                validated_data['user'] = user
        
        # Handle type conversions for numeric fields
        numeric_fields = [
            'paper_size', 'NumberOfTears', 'real_grammage', 'humidity', 
            'ash_percentage', 'cub', 'cylinder_temperature_before_press', 'cylinder_temperature_after_press', 'density_valve', 
            'diluting_valve', 'tensile_strength_md', 'tensile_strength_cd',
            'cct1', 'cct2', 'cct3', 'cct4', 'cct5',
            'rct1', 'rct2', 'rct3', 'rct4', 'rct5', 'machine_speed'
        ]
        
        for field in numeric_fields:
            if field in validated_data:
                value = validated_data[field]
                if value is None or value == '':
                    validated_data[field] = None
                elif isinstance(value, str) and value.strip():
                    try:
                        # Try to convert to float first, then int if it's a whole number
                        float_val = float(value)
                        if float_val.is_integer():
                            validated_data[field] = int(float_val)
                        else:
                            validated_data[field] = float_val
                    except (ValueError, TypeError):
                        validated_data[field] = None
                elif isinstance(value, (int, float)):
                    validated_data[field] = value
                else:
                    validated_data[field] = None
        
        # Handle boolean field
        if 'calender_applied' in validated_data:
            value = validated_data['calender_applied']
            if isinstance(value, str):
                validated_data['calender_applied'] = value.lower() in ['true', '1', 'yes']
            elif value is None:
                validated_data['calender_applied'] = False
            else:
                validated_data['calender_applied'] = bool(value)
        
        print(f"Processed data for create: {validated_data}")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """
        Update paper record.
        """
        # Check for None values that should be empty strings
        for field in ['shift', 'paper_type']:
            if field in validated_data and validated_data[field] is None:
                validated_data[field] = ''
        
        # Remove user field from validated_data if it exists, as it's read-only
        validated_data.pop('user', None)
        
        # Handle type conversions for numeric fields
        numeric_fields = [
            'paper_size', 'NumberOfTears', 'real_grammage', 'humidity', 
            'ash_percentage', 'cub', 'cylinder_temperature_before_press', 'cylinder_temperature_after_press', 'density_valve', 
            'diluting_valve', 'tensile_strength_md', 'tensile_strength_cd',
            'cct1', 'cct2', 'cct3', 'cct4', 'cct5',
            'rct1', 'rct2', 'rct3', 'rct4', 'rct5', 'machine_speed'
        ]
        
        for field in numeric_fields:
            if field in validated_data:
                value = validated_data[field]
                if value is None or value == '':
                    validated_data[field] = None
                elif isinstance(value, str) and value.strip():
                    try:
                        # Try to convert to float first, then int if it's a whole number
                        float_val = float(value)
                        if float_val.is_integer():
                            validated_data[field] = int(float_val)
                        else:
                            validated_data[field] = float_val
                    except (ValueError, TypeError):
                        validated_data[field] = None
                elif isinstance(value, (int, float)):
                    validated_data[field] = value
                else:
                    validated_data[field] = None
        
        # Handle boolean field
        if 'calender_applied' in validated_data:
            value = validated_data['calender_applied']
            if isinstance(value, str):
                validated_data['calender_applied'] = value.lower() in ['true', '1', 'yes']
            elif value is None:
                validated_data['calender_applied'] = False
            else:
                validated_data['calender_applied'] = bool(value)
        
        return super().update(instance, validated_data)


class PaperListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for paper list view.
    """
    user_display = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Paper
        fields = [
            'id', 'roll_number', 'date', 'sampling_start_time', 'sampling_end_time',
            'responsible_person_name', 'shift', 'paper_type', 'paper_size', 'NumberOfTears',
            'real_grammage', 'humidity', 'ash_percentage', 'cub', 'cylinder_temperature_before_press',
            'cylinder_temperature_after_press', 'profile', 'density_valve', 'diluting_valve',
            'burst_test', 'tensile_strength_md', 'tensile_strength_cd', 'cct1', 'cct2', 'cct3',
            'cct4', 'cct5', 'rct1', 'rct2', 'rct3', 'rct4', 'rct5', 'tearing_time',
            'calender_applied', 'machine_speed', 'material_usage', 'user_display',
            'created_at', 'last_updated'
        ]