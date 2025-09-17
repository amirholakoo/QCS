from django.db import models

# Create your models here.

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
    
    date = models.CharField(max_length=10, verbose_name='تاریخ')  # Jalali date format YYYY-MM-DD
    type = models.CharField(max_length=20, choices=DATA_TYPE_CHOICES, verbose_name='نوع داده')
    value = models.CharField(max_length=20, verbose_name='مقدار')  # Stored as string as requested
    roll_number = models.CharField(max_length=50, verbose_name='شماره رول')
    start_time = models.CharField(max_length=5, verbose_name='زمان شروع')  # HH:MM format
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'داده نمودار'
        verbose_name_plural = 'داده‌های نمودار'
        ordering = ['-date', '-start_time']
        # Ensure unique data points per roll, type, and date
        unique_together = ['date', 'type', 'roll_number']
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.date} - رول {self.roll_number}"

