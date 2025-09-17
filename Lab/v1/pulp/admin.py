"""
Admin configuration for pulp app.
"""
from django.contrib import admin
from .models import Pulp


@admin.register(Pulp)
class PulpAdmin(admin.ModelAdmin):
    """
    Admin interface for Pulp model.
    """
    list_display = [
        'id', 'roll_number', 'lower_sampling_time', 
        'lower_headbox_freeness', 'upper_headbox_consistency', 'created_at'
    ]
    list_filter = ['created_at']
    search_fields = ['roll_number']
    ordering = ['-created_at']
    
    fieldsets = (
        ('اطلاعات پایه', {
            'fields': ('roll_number', 'lower_sampling_time')
        }),
        ('آزمایش‌های بخش پایین', {
            'fields': ('downpulpcount', 'lower_headbox_freeness', 'lower_ph', 'lower_pulp_temperature', 'lower_water_filter')
        }),
        ('آزمایش‌های بخش بالا', {
            'fields': ('upper_headbox_consistency', 'upper_headbox_freeness', 'upper_ph', 
                      'upper_pulp_temperature', 'upper_water_filter')
        }),
        ('آزمایش‌های غلظت', {
            'fields': ('pond8_consistency', 'curtain_consistency', 'thickener_consistency')
        }),
    )
    
    readonly_fields = ['created_at', 'last_updated']