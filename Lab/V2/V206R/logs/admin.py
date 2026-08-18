"""
Admin configuration for logs app.
"""
from django.contrib import admin
from .models import LogEntry


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    """
    Admin interface for LogEntry model (read-only).
    """
    list_display = ['username', 'model_name', 'action_type', 'timestamp']
    list_filter = ['action_type', 'model_name', 'timestamp']
    search_fields = ['username', 'model_name']
    ordering = ['-timestamp']
    
    # Make it read-only
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False