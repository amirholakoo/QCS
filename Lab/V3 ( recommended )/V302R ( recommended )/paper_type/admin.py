"""
Admin configuration for paper_type app.
"""
from django.contrib import admin
from .models import PaperType


@admin.register(PaperType)
class PaperTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'last_updated']
    search_fields = ['name']
    ordering = ['name']
    readonly_fields = ['created_at', 'last_updated']
