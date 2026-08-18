"""
Admin configuration for account app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth import get_user_model
from .models import SystemSettings

User = get_user_model()

# Unregister the default User admin if it exists
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    """
    Admin interface for CustomUser model.
    """
    list_display = ['username', 'first_name', 'last_name', 'created_at', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['username', 'first_name', 'last_name']
    ordering = ['-created_at']
    
    fieldsets = (
        (None, {'fields': ('username',)}),
        ('اطلاعات شخصی', {'fields': ('first_name', 'last_name')}),
        ('مجوزها', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('دسترسی به صفحات', {'fields': ('allowed_pages',), 'description': 'لیست صفحات مجاز. اگر خالی باشد، دسترسی به همه صفحات دارد. مقادیر ممکن: dashboard, paper, pulp, settings, speed, complete-report, technical-report, qc, logs'}),
        ('تاریخ‌ها', {'fields': ('created_at', 'last_login')}),
    )
    
    readonly_fields = ['created_at', 'last_login']


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    """
    Admin interface for SystemSettings model.
    """
    list_display = ['version']
    fields = ['version', 'update_details']
    
    def has_add_permission(self, request):
        # Only allow one instance
        return not SystemSettings.objects.exists()
    
    def has_delete_permission(self, request, obj=None):
        # Don't allow deletion
        return False