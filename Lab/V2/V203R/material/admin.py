"""
Admin configuration for material app.
"""
from django.contrib import admin
from .models import Material


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    """
    Admin interface for Material model.
    """
    list_display = ['material_name', 'user', 'created_at', 'last_updated']
    list_filter = ['created_at', 'user']
    search_fields = ['material_name', 'description']
    ordering = ['material_name']
    
    fieldsets = (
        ('اطلاعات ماده', {
            'fields': ('user', 'material_name', 'description')
        }),
    )
    
    readonly_fields = ['created_at', 'last_updated']