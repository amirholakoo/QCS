"""
Admin configuration for paper app.
"""
from django.contrib import admin
from .models import Paper


@admin.register(Paper)
class PaperAdmin(admin.ModelAdmin):
    """
    Admin interface for Paper model.
    """
    list_display = [
        'roll_number', 'date', 'responsible_person_name', 
        'shift', 'paper_type', 'user', 'created_at'
    ]
    list_filter = ['shift', 'paper_type', 'calender_applied', 'created_at']
    search_fields = ['roll_number', 'responsible_person_name', 'date']
    ordering = ['-created_at']
    
    fieldsets = (
        ('اطلاعات پایه', {
            'fields': ('user', 'date', 'sampling_start_time', 'sampling_end_time', 
                      'roll_number', 'responsible_person_name', 'shift')
        }),
        ('مشخصات کاغذ', {
            'fields': ('paper_type', 'paper_size', 'real_grammage', 'humidity', 
                      'ash_percentage')
        }),
        ('دمای سیلندر', {
            'fields': ('cylinder_temperature_before_press', 'cylinder_temperature_after_press')
        }),
        ('مشخصات فیزیکی', {
            'fields': ('profile', 'density_valve', 'diluting_valve')
        }),
        ('تست‌های مقاومت', {
            'fields': ('burst_test', 'tensile_strength_md', 'tensile_strength_cd',
                      'cct1', 'cct2', 'cct3', 'cct4', 'cct5',
                      'rct1', 'rct2', 'rct3', 'rct4', 'rct5')
        }),
        ('جزئیات تولید', {
            'fields': ('tearing_time', 'calender_applied', 'machine_speed', 'material_usage')
        }),
    )
    
    readonly_fields = ['created_at', 'last_updated']