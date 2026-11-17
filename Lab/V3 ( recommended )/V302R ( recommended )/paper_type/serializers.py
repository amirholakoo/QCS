"""
Serializers for paper_type app.
"""
from rest_framework import serializers
from .models import PaperType
from logs.utils import log_action, get_field_verbose_name


class PaperTypeSerializer(serializers.ModelSerializer):
    """
    Serializer for PaperType model.
    """
    class Meta:
        model = PaperType
        fields = '__all__'
        read_only_fields = ['created_at', 'last_updated']
    
    def create(self, validated_data):
        paper_type = super().create(validated_data)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                details = [{
                    "name": "نام نوع کاغذ",
                    "new": paper_type.name,
                    "roll_number": None
                }]
                log_action(request.user.username, 'PaperType', 'create', details)
            except:
                pass
        return paper_type
    
    def update(self, instance, validated_data):
        details = []
        for key, value in validated_data.items():
            try:
                old_value = getattr(instance, key)
                if old_value != value:
                    verbose_name = get_field_verbose_name(PaperType, key)
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
                log_action(request.user.username, 'PaperType', 'edit', details)
            except:
                pass
        
        return super().update(instance, validated_data)

