from django.db import models


class ChartData(models.Model):
    """
    Model for storing chart data points extracted from paper and pulp models.
    """
    DATA_TYPE_CHOICES = [
        ('ph', 'pH'),
        ('moisture', 'رطوبت'),
        ('burst', 'ترکیدگی'),
        ('rct', 'RCT'),
        ('cct', 'CCT'),
        ('md', 'MD'),
        ('cd', 'CD'),
        ('gms', 'گراماژ'),
        ('cub', 'کاب'),
    ]

    date = models.CharField(max_length=10, verbose_name='تاریخ')
    type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, verbose_name='نوع داده')
    value = models.CharField(max_length=20, verbose_name='مقدار')
    roll_number = models.CharField(max_length=50, verbose_name='شماره رول')
    start_time = models.CharField(max_length=5, verbose_name='زمان شروع')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')

    class Meta:
        verbose_name = 'داده نمودار'
        verbose_name_plural = 'داده‌های نمودار'
        ordering = ['-date', '-start_time']
        unique_together = ['date', 'type', 'roll_number']

    def __str__(self):
        return f"{self.get_type_display()} - {self.date} - رول {self.roll_number}"


class PLCKey(models.Model):
    """
    Model for PLC key metadata returned in plc_keys.
    """
    external_id = models.IntegerField(verbose_name='شناسه خارجی')
    name = models.CharField(max_length=255, verbose_name='نام', blank=True, null=True)
    fa_name = models.CharField(max_length=255, verbose_name='نام فارسی')
    key = models.CharField(max_length=50, verbose_name='کلید')
    value_type = models.CharField(max_length=50, blank=True, verbose_name='نوع مقدار')
    order_index = models.IntegerField(default=0, verbose_name='ترتیب نمایش')
    description = models.TextField(blank=True, verbose_name='توضیحات')
    creation_datetime = models.FloatField(blank=True, null=True, verbose_name='زمان ایجاد (سیستم خارجی)')
    last_update = models.FloatField(blank=True, null=True, verbose_name='آخرین بروزرسانی (سیستم خارجی)')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')

    class Meta:
        verbose_name = 'کلید PLC'
        verbose_name_plural = 'کلیدهای PLC'
        ordering = ['order_index', 'fa_name']

    def __str__(self):
        return f"{self.fa_name or self.name} ({self.key})"


class RollPLCData(models.Model):
    """
    Model for roll PLC data with raw plc_setting JSON.
    """
    roll_number = models.CharField(max_length=50, unique=True, verbose_name='شماره رول')
    plc_setting = models.JSONField(verbose_name='تنظیمات PLC')
    creation_datetime = models.FloatField(blank=True, null=True, verbose_name='CreationDateTime')
    paper_breaks = models.IntegerField(blank=True, null=True, verbose_name='Paper_breaks')
    printed_length = models.FloatField(blank=True, null=True, verbose_name='Printed_length')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')

    class Meta:
        verbose_name = 'داده PLC رول'
        verbose_name_plural = 'داده‌های PLC رول'
        ordering = ['-created_at']

    def __str__(self):
        return f"PLC رول {self.roll_number}"


class PLCColumnPreference(models.Model):
    visible_keys = models.JSONField(default=list, blank=True, verbose_name='کلیدهای قابل نمایش')

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')

    class Meta:
        verbose_name = 'تنظیم ستون‌های PLC'
        verbose_name_plural = 'تنظیمات ستون‌های PLC'

    def __str__(self):
        return "تنظیمات ستون‌های PLC"
