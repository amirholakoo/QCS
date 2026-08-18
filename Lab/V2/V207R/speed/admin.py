"""
Admin configuration for speed app.
"""
from django.contrib import admin
from .models import Speed


@admin.register(Speed)
class SpeedAdmin(admin.ModelAdmin):
    list_display = ['id', 'Roll_Number', 'created_at', 'last_updated']
    list_filter = ['created_at']
    search_fields = ['Roll_Number']
    ordering = ['-created_at']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('Roll_Number',)
        }),
        ('سرعت‌ها ۱–۶', {
            'fields': ('Speed1', 'Speed2', 'Speed3', 'Speed4', 'Speed5', 'Speed6')
        }),
        ('سرعت‌ها ۷–۱۲', {
            'fields': ('Speed7', 'Speed8', 'Speed9', 'Speed10', 'Speed11', 'Speed12')
        }),
        ('سرعت‌ها ۱۳–۱۸', {
            'fields': ('Speed13', 'Speed14', 'Speed15', 'Speed16', 'Speed17', 'Speed18')
        }),
        ('سرعت‌ها ۱۹–۲۴', {
            'fields': ('Speed19', 'Speed20', 'Speed21', 'Speed22', 'Speed23', 'Speed24')
        }),
        ('سرعت‌ها ۲۵–۲۶', {
            'fields': ('Speed25', 'Speed26')
        }),
        ('زمان', {
            'fields': ('created_at', 'last_updated')
        }),
    )
