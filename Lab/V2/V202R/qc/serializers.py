"""
Serializers for QC (Quality Control) app.
"""
from rest_framework import serializers
from .models import Customer, Loading, QCRecord
from paper.models import Paper
from paper.serializers import PaperSerializer


class CustomerSerializer(serializers.ModelSerializer):
    """
    Serializer for Customer model.
    """
    class Meta:
        model = Customer
        fields = [
            'id', 'name_family', 'national_code', 'phone_number', 
            'address', 'postal_code', 'created_at', 'last_updated'
        ]
        read_only_fields = ['id', 'created_at', 'last_updated']


class LoadingSerializer(serializers.ModelSerializer):
    """
    Serializer for Loading model.
    """
    class Meta:
        model = Loading
        fields = [
            'id', 'grammage', 'width', 'humidity', 'burst', 
            'cub', 'md', 'cd', 'ash', 'custom', 'created_at', 'last_updated'
        ]
        read_only_fields = ['id', 'created_at', 'last_updated']


class QCRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for QCRecord model.
    """
    # Nested serializers for detailed view
    rollnumbers_detail = PaperSerializer(source='rollnumbers', many=True, read_only=True)
    customer_detail = CustomerSerializer(source='customer_id', read_only=True)
    loading_detail = LoadingSerializer(source='loading_id', read_only=True)
    
    # User details
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    # Display fields
    custom_fields_display = serializers.ListField(source='get_custom_fields_display', read_only=True)
    roll_numbers_list = serializers.ListField(source='get_roll_numbers_list', read_only=True)
    roll_numbers_display = serializers.CharField(source='get_roll_numbers_display', read_only=True)
    
    class Meta:
        model = QCRecord
        fields = [
            'id', 'rollnumbers', 'customer_id', 'loading_id', 'user', 
            'custom_items', 'column_order', 'print_count', 'status', 'create_time', 'last_update',
            # Nested details
            'rollnumbers_detail', 'customer_detail', 'loading_detail',
            'user_name', 'custom_fields_display', 'roll_numbers_list', 'roll_numbers_display'
        ]
        read_only_fields = ['id', 'create_time', 'last_update', 'user']
    
    def create(self, validated_data):
        # Handle ManyToMany field separately
        rollnumbers_data = validated_data.pop('rollnumbers', [])
        
        # Set the user from the request if not already provided
        if 'user' not in validated_data:
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                validated_data['user'] = request.user
            else:
                # For testing purposes, use first available user
                from django.contrib.auth import get_user_model
                User = get_user_model()
                default_user = User.objects.first()
                if default_user:
                    validated_data['user'] = default_user
        
        # Create the QC record
        qc_record = QCRecord.objects.create(**validated_data)
        
        # Add the paper records
        if rollnumbers_data:
            qc_record.rollnumbers.set(rollnumbers_data)
        
        return qc_record
    
    def update(self, instance, validated_data):
        # Handle ManyToMany field separately
        rollnumbers_data = validated_data.pop('rollnumbers', None)
        
        # Handle Loading object update if loading data is provided
        # Get from initial_data since 'loading' is not a model field
        loading_data = self.initial_data.get('loading', None)
        if loading_data:
            loading = instance.loading_id
            if loading:
                # Update the existing Loading object
                loading_serializer = LoadingSerializer(loading, data=loading_data, partial=True)
                if loading_serializer.is_valid():
                    loading_serializer.save()
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update the paper records if provided
        if rollnumbers_data is not None:
            instance.rollnumbers.set(rollnumbers_data)
        
        return instance


class QCRecordListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for QC record list view.
    """
    roll_numbers_display = serializers.CharField(source='get_roll_numbers_display', read_only=True)
    roll_numbers_count = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source='customer_id.name_family', read_only=True)
    loading_detail = LoadingSerializer(source='loading_id', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = QCRecord
        fields = [
            'id', 'roll_numbers_display', 'roll_numbers_count', 'customer_name', 
            'loading_detail', 'user_name', 'status', 'print_count', 'create_time'
        ]
    
    def get_roll_numbers_count(self, obj):
        return obj.rollnumbers.count()


class PaperFieldsSerializer(serializers.Serializer):
    """
    Serializer to return available paper fields for custom selection.
    """
    field_name = serializers.CharField()
    display_name = serializers.CharField()
    field_type = serializers.CharField()
    
    @classmethod
    def get_available_fields(cls):
        """
        Return list of available paper fields that can be selected for QC records.
        """
        fields = [
            {'field_name': 'real_grammage', 'display_name': 'گراماژ', 'field_type': 'float'},
            {'field_name': 'humidity', 'display_name': 'رطوبت', 'field_type': 'float'},
            {'field_name': 'ash_percentage', 'display_name': 'Ash', 'field_type': 'float'},
            {'field_name': 'cub', 'display_name': 'COBB', 'field_type': 'float'},
            {'field_name': 'burst_test', 'display_name': 'Burst', 'field_type': 'text'},
            {'field_name': 'tensile_strength_md', 'display_name': 'MD', 'field_type': 'float'},
            {'field_name': 'tensile_strength_cd', 'display_name': 'CD', 'field_type': 'float'},
            {'field_name': 'paper_size', 'display_name': 'Width', 'field_type': 'integer'},
            {'field_name': 'paper_type', 'display_name': 'Type', 'field_type': 'choice'},
            {'field_name': 'shift', 'display_name': 'شیفت', 'field_type': 'choice'},
            {'field_name': 'machine_speed', 'display_name': 'سرعت دستگاه', 'field_type': 'float'},
            {'field_name': 'calender_applied', 'display_name': 'کلندر', 'field_type': 'boolean'},
            {'field_name': 'NumberOfTears', 'display_name': 'Break', 'field_type': 'integer'},
            {'field_name': 'profile', 'display_name': 'پروفایل', 'field_type': 'choice'},
            {'field_name': 'density_valve', 'display_name': 'شیر چگالی', 'field_type': 'float'},
            {'field_name': 'diluting_valve', 'display_name': 'شیر رقیق‌ساز', 'field_type': 'float'},
            {'field_name': 'cylinder_temperature_before_press', 'display_name': 'دمای سیلندر قبل از سایز پرس', 'field_type': 'float'},
            {'field_name': 'cylinder_temperature_after_press', 'display_name': 'دمای سیلندر بعد از سایز پرس', 'field_type': 'float'},
            {'field_name': 'cct1', 'display_name': 'CCT 1', 'field_type': 'float'},
            {'field_name': 'cct2', 'display_name': 'CCT 2', 'field_type': 'float'},
            {'field_name': 'cct3', 'display_name': 'CCT 3', 'field_type': 'float'},
            {'field_name': 'cct4', 'display_name': 'CCT 4', 'field_type': 'float'},
            {'field_name': 'cct5', 'display_name': 'CCT 5', 'field_type': 'float'},
            {'field_name': 'rct1', 'display_name': 'RCT 1', 'field_type': 'float'},
            {'field_name': 'rct2', 'display_name': 'RCT 2', 'field_type': 'float'},
            {'field_name': 'rct3', 'display_name': 'RCT 3', 'field_type': 'float'},
            {'field_name': 'rct4', 'display_name': 'RCT 4', 'field_type': 'float'},
            {'field_name': 'rct5', 'display_name': 'RCT 5', 'field_type': 'float'},
            {'field_name': 'tearing_time', 'display_name': 'زمان پارگی', 'field_type': 'text'},
        ]
        return fields
