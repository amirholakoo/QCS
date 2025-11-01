from django.contrib import admin
from django.utils.html import format_html
from .models import ProbeData, ProbeConfiguration


@admin.register(ProbeConfiguration)
class ProbeConfigurationAdmin(admin.ModelAdmin):
    list_display = ['updated_at_jalali', 'probe_count', 'active_formula_short']
    list_filter = ['created_at', 'updated_at', 'probe_count']
    search_fields = ['active_formula']
    readonly_fields = ['created_at', 'updated_at', 'created_at_jalali', 'updated_at_jalali', 'formatted_probes_data']
    ordering = ['-updated_at']  # Most recent first
    
    fieldsets = (
        (None, {
            'fields': ('created_at', 'created_at_jalali', 'updated_at', 'updated_at_jalali', 'active_formula')
        }),
        ('Probe Configuration', {
            'fields': ('probe_count', 'probes_data', 'formatted_probes_data'),
        }),
    )
    
    def updated_at_jalali(self, obj):
        """Display Jalali updated_at in admin list"""
        return obj.get_updated_at_jalali()
    updated_at_jalali.short_description = 'Updated At (Jalali)'
    updated_at_jalali.admin_order_field = 'updated_at'
    
    def created_at_jalali(self, obj):
        """Display Jalali created_at in admin"""
        return obj.get_created_at_jalali()
    created_at_jalali.short_description = 'Created At (Jalali)'
    
    def formatted_probes_data(self, obj):
        """Display formatted probe configuration data in admin"""
        import json
        try:
            formatted_json = json.dumps(obj.get_probes_data(), indent=2)
            return format_html('<pre>{}</pre>', formatted_json)
        except:
            return str(obj.probes_data)
    formatted_probes_data.short_description = 'Formatted Probe Configuration'
    
    def active_formula_short(self, obj):
        """Display shortened active formula"""
        formula = obj.active_formula
        return formula[:50] + "..." if len(formula) > 50 else formula
    active_formula_short.short_description = 'Active Formula'


@admin.register(ProbeData)
class ProbeDataAdmin(admin.ModelAdmin):
    list_display = ['timestamp_jalali', 'probe_count', 'temperature', 'humidity', 'active_formula_short']
    list_filter = ['timestamp', 'probe_count']
    search_fields = ['active_formula']
    readonly_fields = ['timestamp', 'timestamp_jalali', 'formatted_probe_data']
    ordering = ['-timestamp']  # Most recent first
    
    fieldsets = (
        (None, {
            'fields': ('timestamp', 'timestamp_jalali', 'temperature', 'humidity', 'active_formula')
        }),
        ('Probe Data', {
            'fields': ('probe_count', 'probes_data', 'formatted_probe_data'),
        }),
    )
    
    def timestamp_jalali(self, obj):
        """Display Jalali timestamp in admin list"""
        return obj.get_jalali_date()
    timestamp_jalali.short_description = 'Timestamp (Jalali)'
    timestamp_jalali.admin_order_field = 'timestamp'
    
    def formatted_probe_data(self, obj):
        """Display formatted probe data in admin"""
        import json
        try:
            formatted_json = json.dumps(obj.get_probes_data(), indent=2)
            return format_html('<pre>{}</pre>', formatted_json)
        except:
            return str(obj.probes_data)
    formatted_probe_data.short_description = 'Formatted Probe Data'
    
    def active_formula_short(self, obj):
        """Display shortened active formula"""
        formula = obj.active_formula
        return formula[:50] + "..." if len(formula) > 50 else formula
    active_formula_short.short_description = 'Active Formula'