"""
Admin configuration for paper app.
"""
from django.contrib import admin
from .models import Paper, ProductionMachine, PM_Setting


@admin.register(Paper)
class PaperAdmin(admin.ModelAdmin):
    """
    Admin interface for Paper model.
    """
    list_display = [
        'roll_number', 'date', 'responsible_person_name',
        'shift', 'PaperType', 'user', 'is_delete', 'created_at'
    ]
    list_filter = ['shift', 'PaperType', 'calender_applied', 'is_delete', 'created_at']
    search_fields = ['roll_number', 'responsible_person_name', 'date']
    ordering = ['-created_at']
    
    fieldsets = (
        ('اطلاعات پایه', {
            'fields': ('user', 'date', 'sampling_start_time', 'sampling_end_time', 
                      'roll_number', 'responsible_person_name', 'shift')
        }),
        ('مشخصات کاغذ', {
            'fields': ('PaperType', 'paper_size', 'real_grammage', 'humidity', 
                      'ash_percentage')
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
        ('وضعیت', {
            'fields': ('is_delete',)
        }),
    )
    
    readonly_fields = ['created_at', 'last_updated']


@admin.register(ProductionMachine)
class ProductionMachineAdmin(admin.ModelAdmin):
    """
    Admin interface for ProductionMachine model.
    """
    list_display = ['title', 'is_delete', 'created_at', 'last_updated']
    list_filter = ['is_delete']
    search_fields = ['title']
    ordering = ['title']
    readonly_fields = ['created_at', 'last_updated']


@admin.register(PM_Setting)
class PM_SettingAdmin(admin.ModelAdmin):
    """
    Admin interface for PM_Setting model.
    """
    list_display = ['paper', 'production_machine', 'bottom', 'top', 'created_at', 'last_updated']
    list_filter = ['production_machine', 'created_at']
    search_fields = ['paper__roll_number', 'production_machine__title']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'last_updated']