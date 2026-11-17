from django.contrib import admin
from .models import PLCKey, RollPLCData


@admin.register(PLCKey)
class PLCKeyAdmin(admin.ModelAdmin):
    list_display = ('external_id', 'key', 'fa_name', 'name', 'value_type', 'order_index')
    search_fields = ('key', 'name', 'fa_name')
    list_filter = ('value_type',)
    ordering = ('order_index', 'fa_name')


@admin.register(RollPLCData)
class RollPLCDataAdmin(admin.ModelAdmin):
    list_display = ('roll_number', 'creation_datetime', 'paper_breaks', 'printed_length', 'created_at')
    search_fields = ('roll_number',)
    ordering = ('-created_at',)
