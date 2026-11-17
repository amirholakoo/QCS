"""
Serializers for QC (Quality Control) app.
"""
from rest_framework import serializers
from .models import Customer, Loading, QCRecord
from paper.models import Paper
from paper.serializers import PaperSerializer
from logs.utils import log_action, get_field_verbose_name


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
    
    def create(self, validated_data):
        customer = super().create(validated_data)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                details = [{
                    "name": "نام و نام خانوادگی",
                    "new": customer.name_family,
                    "roll_number": None
                }]
                log_action(request.user.username, 'Customer', 'create', details)
            except:
                pass
        return customer
    
    def update(self, instance, validated_data):
        details = []
        for key, value in validated_data.items():
            try:
                old_value = getattr(instance, key)
                if old_value != value:
                    verbose_name = get_field_verbose_name(Customer, key)
                    old_formatted = str(old_value) if old_value is not None else '-'
                    new_formatted = str(value) if value is not None else '-'
                    details.append({
                        "name": verbose_name,
                        "old": old_formatted,
                        "new": new_formatted,
                        "roll_number": None
                    })
            except:
                continue
        
        request = self.context.get('request')
        if request and request.user.is_authenticated and details:
            try:
                log_action(request.user.username, 'Customer', 'edit', details)
            except:
                pass
        
        return super().update(instance, validated_data)


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
    
    def create(self, validated_data):
        loading = super().create(validated_data)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                details = [{
                    "name": "گراماژ",
                    "new": str(loading.grammage),
                    "roll_number": None
                }]
                log_action(request.user.username, 'Loading', 'create', details)
            except:
                pass
        return loading
    
    def update(self, instance, validated_data):
        details = []
        for key, value in validated_data.items():
            try:
                old_value = getattr(instance, key)
                if old_value != value:
                    verbose_name = get_field_verbose_name(Loading, key)
                    old_formatted = str(old_value) if old_value is not None else '-'
                    new_formatted = str(value) if value is not None else '-'
                    details.append({
                        "name": verbose_name,
                        "old": old_formatted,
                        "new": new_formatted,
                        "roll_number": None
                    })
            except:
                continue
        
        request = self.context.get('request')
        if request and request.user.is_authenticated and details:
            try:
                log_action(request.user.username, 'Loading', 'edit', details)
            except:
                pass
        
        return super().update(instance, validated_data)


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
    editing_by_name = serializers.CharField(source='editing_by.get_full_name', read_only=True)
    
    class Meta:
        model = QCRecord
        fields = [
            'id', 'rollnumbers', 'customer_id', 'loading_id', 'user', 
            'custom_items', 'column_order', 'print_count', 'status', 'create_time', 'last_update',
            'editing_by', 'editing_started_at', 'edit_lock_expires_at', 'editing_by_name',
            # Nested details
            'rollnumbers_detail', 'customer_detail', 'loading_detail',
            'user_name', 'custom_fields_display', 'roll_numbers_list', 'roll_numbers_display'
        ]
        read_only_fields = ['id', 'create_time', 'last_update', 'user']
    
    def create(self, validated_data):
        # Handle ManyToMany field separately
        rollnumbers_data = validated_data.pop('rollnumbers', [])
        
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError({'user': 'برای ثبت رکورد کنترل کیفی باید وارد شوید.'})
        validated_data['user'] = request.user
        
        # Create the QC record
        qc_record = QCRecord.objects.create(**validated_data)
        
        # Add the paper records
        if rollnumbers_data:
            qc_record.rollnumbers.set(rollnumbers_data)
        
        # Log action
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                roll_numbers = qc_record.get_roll_numbers_list()
                details = [{
                    "name": "رکورد کنترل کیفی",
                    "new": f"QC-{qc_record.id} - {qc_record.customer_id.name_family}",
                    "roll_number": roll_numbers[0] if roll_numbers else None
                }]
                log_action(request.user.username, 'QCRecord', 'create', details)
            except:
                pass
        
        return qc_record
    
    def update(self, instance, validated_data):
        # Handle ManyToMany field separately
        rollnumbers_data = validated_data.pop('rollnumbers', None)
        
        # Get old roll numbers before update for comparison
        old_roll_numbers = list(instance.rollnumbers.values_list('roll_number', flat=True)) if rollnumbers_data is not None else None
        
        # Handle Loading object update if loading data is provided
        # Get from initial_data since 'loading' is not a model field
        loading_data = self.initial_data.get('loading', None)
        if loading_data:
            loading = instance.loading_id
            if loading:
                # Update the existing Loading object
                loading_serializer = LoadingSerializer(loading, data=loading_data, partial=True, context=self.context)
                if loading_serializer.is_valid():
                    loading_serializer.save()
        
        # Track changes for logging
        details = []
        for key, value in validated_data.items():
            try:
                old_value = getattr(instance, key)
                if old_value != value:
                    verbose_name = get_field_verbose_name(QCRecord, key)
                    old_formatted = str(old_value) if old_value is not None else '-'
                    new_formatted = str(value) if value is not None else '-'
                    roll_numbers = instance.get_roll_numbers_list()
                    details.append({
                        "name": verbose_name,
                        "old": old_formatted,
                        "new": new_formatted,
                        "roll_number": roll_numbers[0] if roll_numbers else None
                    })
            except:
                continue
        
        # Track rollnumbers ManyToMany field changes
        if rollnumbers_data is not None:
            # Get new roll numbers from the data
            new_roll_numbers = []
            if isinstance(rollnumbers_data, list) and len(rollnumbers_data) > 0:
                # Check if it's a list of Paper objects or IDs
                first_item = rollnumbers_data[0]
                if hasattr(first_item, 'roll_number'):
                    # It's a list of Paper objects
                    new_roll_numbers = [paper.roll_number for paper in rollnumbers_data if hasattr(paper, 'roll_number')]
                elif isinstance(first_item, (int, str)):
                    # It's a list of IDs, we need to get the papers
                    from paper.models import Paper
                    try:
                        paper_ids = [int(item) for item in rollnumbers_data if item]
                        papers = Paper.objects.filter(is_delete=False, id__in=paper_ids)
                        new_roll_numbers = [paper.roll_number for paper in papers]
                    except:
                        pass
            
            # Compare old and new roll numbers (convert to sets for comparison, ignoring order)
            old_set = set(str(r) for r in old_roll_numbers) if old_roll_numbers else set()
            new_set = set(str(r) for r in new_roll_numbers) if new_roll_numbers else set()
            
            if old_set != new_set:
                old_formatted = ', '.join(map(str, old_roll_numbers)) if old_roll_numbers else '-'
                new_formatted = ', '.join(map(str, new_roll_numbers)) if new_roll_numbers else '-'
                details.append({
                    "name": "شماره رول‌ها",
                    "old": old_formatted,
                    "new": new_formatted,
                    "roll_number": new_roll_numbers[0] if new_roll_numbers else (old_roll_numbers[0] if old_roll_numbers else None)
                })
        
        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update the paper records if provided
        if rollnumbers_data is not None:
            instance.rollnumbers.set(rollnumbers_data)
        
        # Log action
        request = self.context.get('request')
        if request and request.user.is_authenticated and details:
            try:
                log_action(request.user.username, 'QCRecord', 'edit', details)
            except:
                pass
        
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
    editing_by_name = serializers.CharField(source='editing_by.get_full_name', read_only=True)
    is_locked = serializers.SerializerMethodField()
    locked_by_current_user = serializers.SerializerMethodField()
    
    class Meta:
        model = QCRecord
        fields = [
            'id', 'roll_numbers_display', 'roll_numbers_count', 'customer_name', 
            'loading_detail', 'user_name', 'status', 'print_count', 'create_time',
            'editing_by_name', 'is_locked', 'locked_by_current_user'
        ]
    
    def get_roll_numbers_count(self, obj):
        return obj.rollnumbers.count()

    def get_is_locked(self, obj):
        from django.utils import timezone
        return bool(obj.editing_by_id and obj.edit_lock_expires_at and obj.edit_lock_expires_at > timezone.now())

    def get_locked_by_current_user(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return bool(obj.editing_by_id == request.user.id and self.get_is_locked(obj))


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
            {'field_name': 'PaperType_name', 'display_name': 'Type', 'field_type': 'text'},
            {'field_name': 'shift', 'display_name': 'شیفت', 'field_type': 'choice'},
            {'field_name': 'machine_speed', 'display_name': 'سرعت دستگاه', 'field_type': 'float'},
            {'field_name': 'calender_applied', 'display_name': 'کلندر', 'field_type': 'boolean'},
            {'field_name': 'NumberOfTears', 'display_name': 'Break', 'field_type': 'integer'},
            {'field_name': 'profile', 'display_name': 'پروفایل', 'field_type': 'choice'},
            {'field_name': 'density_valve', 'display_name': 'شیر چگالی', 'field_type': 'float'},
            {'field_name': 'diluting_valve', 'display_name': 'شیر رقیق‌ساز', 'field_type': 'float'},
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
