from django.contrib import admin
from .models import Customer, Loading, QCRecord


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name_family', 'national_code', 'phone_number', 'is_delete', 'created_at')
    list_filter = ('is_delete', 'created_at')
    list_editable = ('is_delete',)
    search_fields = ('name_family', 'national_code', 'phone_number')
    ordering = ('-created_at',)


@admin.register(Loading)
class LoadingAdmin(admin.ModelAdmin):
    list_display = ('id', 'grammage', 'width', 'humidity', 'burst', 'cub', 'md', 'cd', 'is_delete', 'created_at')
    list_filter = ('is_delete', 'created_at')
    list_editable = ('is_delete',)
    ordering = ('-created_at',)


@admin.register(QCRecord)
class QCRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_roll_numbers_display', 'customer_id', 'user', 'status', 'print_count', 'is_delete', 'create_time')
    list_filter = ('status', 'is_delete', 'create_time', 'user')
    list_editable = ('is_delete',)
    search_fields = ('rollnumbers__roll_number', 'customer_id__name_family', 'user__first_name', 'user__last_name')
    ordering = ('-create_time',)
    readonly_fields = ('create_time', 'last_update', 'display_id')
    #readonly_fields = ( 'display_id',)
    filter_horizontal = ('rollnumbers',)
    
    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('display_id', 'rollnumbers', 'customer_id', 'loading_id', 'user', 'status')
        }),
        ('تنظیمات چاپ', {
            'fields': ('custom_items', 'print_count')
        }),
        ('وضعیت', {
            'fields': ('is_delete',)
        }),
        ('زمان‌ها', {
            'fields': ('create_time', 'last_update'),
            'classes': ('collapse',)
        }),
    )
    
    def display_id(self, obj):
        return obj.pk if obj else '-'
    display_id.short_description = 'ID'

    def get_roll_numbers_display(self, obj):
        return obj.get_roll_numbers_display()
    get_roll_numbers_display.short_description = 'شماره رول‌ها'
