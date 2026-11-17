from django.contrib import admin
from django.utils.html import format_html
from .models import ProbeData, ProbeConfiguration, Sensor
import json


@admin.register(Sensor)
class SensorAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'api_endpoint', 'is_active', 'created_at', 'updated_at', 
        'config_count', 'data_count'
    ]
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['name', 'api_endpoint']
    readonly_fields = ['id', 'created_at', 'updated_at']
    ordering = ['name']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'name', 'api_endpoint', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def config_count(self, obj):
        """Show number of configurations for this sensor"""
        count = obj.configurations.count()
        return count
    config_count.short_description = 'Configs'
    config_count.admin_order_field = 'configurations__count'
    
    def data_count(self, obj):
        """Show number of probe data entries for this sensor"""
        count = obj.probe_data.count()
        return count
    data_count.short_description = 'Data Entries'
    data_count.admin_order_field = 'probe_data__count'


@admin.register(ProbeConfiguration)
class ProbeConfigurationAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'sensor', 'updated_at_jalali', 'temperature', 'humidity', 'probe_count', 
        'roll_number', 'humidity_threshold', 'edge_threshold', 'auto_edge_detection',
        'active_formula_short'
    ]
    list_filter = ['sensor', 'created_at', 'updated_at', 'probe_count', 'auto_edge_detection']
    search_fields = ['active_formula', 'sensor__name', 'sensor__api_endpoint']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'created_at_jalali', 'updated_at_jalali', 
        'formatted_probes_data', 'formatted_edge_data', 'formatted_checked_probes'
    ]
    ordering = ['-updated_at']
    raw_id_fields = ['sensor']
    
    fieldsets = (
        ('Sensor Information', {
            'fields': ('sensor',)
        }),
        ('Timestamps', {
            'fields': ('id', 'created_at', 'created_at_jalali', 'updated_at', 'updated_at_jalali')
        }),
        ('Real-time Data', {
            'fields': ('temperature', 'humidity', 'active_formula', 'roll_number')
        }),
        ('Thresholds & Settings', {
            'fields': ('humidity_threshold', 'edge_threshold', 'auto_edge_detection')
        }),
        ('Probe Configuration', {
            'fields': ('probe_count', 'checked_probes', 'formatted_checked_probes', 'probes_data', 'formatted_probes_data'),
        }),
        ('Edge Detection Data', {
            'fields': ('edge_data', 'formatted_edge_data'),
        }),
    )
    
    def updated_at_jalali(self, obj):
        return obj.get_updated_at_jalali()
    updated_at_jalali.short_description = 'Updated At (Jalali)'
    updated_at_jalali.admin_order_field = 'updated_at'
    
    def created_at_jalali(self, obj):
        return obj.get_created_at_jalali()
    created_at_jalali.short_description = 'Created At (Jalali)'
    
    def formatted_probes_data(self, obj):
        try:
            formatted_json = json.dumps(obj.get_probes_data(), indent=2, ensure_ascii=False)
            return format_html('<pre style="max-height: 300px; overflow: auto;">{}</pre>', formatted_json)
        except:
            return str(obj.probes_data)
    formatted_probes_data.short_description = 'Formatted Probe Data'
    
    def formatted_checked_probes(self, obj):
        try:
            checked = obj.get_checked_probes()
            return format_html('<code>{}</code>', checked)
        except:
            return str(obj.checked_probes)
    formatted_checked_probes.short_description = 'Checked Probes List'
    
    def active_formula_short(self, obj):
        formula = obj.active_formula if obj.active_formula else ''
        return formula[:40] + "..." if len(formula) > 40 else formula
    active_formula_short.short_description = 'Formula'
    
    def formatted_edge_data(self, obj):
        try:
            if obj.edge_data:
                formatted_json = json.dumps(obj.edge_data, indent=2)
                return format_html('<pre>{}</pre>', formatted_json)
            return 'No edge data'
        except:
            return str(obj.edge_data)
    formatted_edge_data.short_description = 'Formatted Edge Data'


@admin.register(ProbeData)
class ProbeDataAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'sensor', 'timestamp_jalali', 'temperature', 'humidity', 'probe_count', 
        'roll_number', 'active_formula_short'
    ]
    list_filter = ['sensor', 'timestamp', 'probe_count', 'roll_number']
    search_fields = ['active_formula', 'roll_number', 'sensor__name', 'sensor__api_endpoint']
    readonly_fields = ['id', 'timestamp', 'timestamp_jalali', 'formatted_probe_data']
    ordering = ['-timestamp']
    list_per_page = 50
    raw_id_fields = ['sensor']
    
    fieldsets = (
        ('Sensor Information', {
            'fields': ('sensor',)
        }),
        ('Timestamps', {
            'fields': ('id', 'timestamp', 'timestamp_jalali')
        }),
        ('Measurements', {
            'fields': ('temperature', 'humidity', 'active_formula', 'roll_number')
        }),
        ('Probe Data', {
            'fields': ('probe_count', 'probes_data', 'formatted_probe_data'),
        }),
    )
    
    def timestamp_jalali(self, obj):
        return obj.get_jalali_date()
    timestamp_jalali.short_description = 'Timestamp (Jalali)'
    timestamp_jalali.admin_order_field = 'timestamp'
    
    def formatted_probe_data(self, obj):
        try:
            formatted_json = json.dumps(obj.get_probes_data(), indent=2, ensure_ascii=False)
            return format_html('<pre style="max-height: 300px; overflow: auto;">{}</pre>', formatted_json)
        except:
            return str(obj.probes_data)
    formatted_probe_data.short_description = 'Formatted Probe Data'
    
    def active_formula_short(self, obj):
        formula = obj.active_formula if obj.active_formula else ''
        return formula[:40] + "..." if len(formula) > 40 else formula
    active_formula_short.short_description = 'Formula'
