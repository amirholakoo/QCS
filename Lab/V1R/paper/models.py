"""
Models for paper app - paper production records.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator

User = get_user_model()


class Paper(models.Model):
    """
    Model for paper production records.
    """
    SHIFT_CHOICES = [
        ('day', 'روزانه'),
        ('night', 'شبانه'),
    ]
    
    PAPER_TYPE_CHOICES = [
        ('test_liner', 'تست لاینر'),
        ('float', 'فلوت'),
        ('white_top_test_liner', 'تست لاینر سفید'),
    ]
    
    PROFILE_CHOICES = [
        ('1', '+۱g-'),
        ('2', '+۲g-'),
        ('3', '+۳g-'),
        ('4', '+۴g-'),
        ('5', 'بیشتر از 5 گرم نوسان سر تا سر کاغذ'),
    ]
    
    # Required fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='کاربر')
    date = models.CharField(max_length=10, verbose_name='تاریخ')  # Shamsi format YYYY-MM-DD
    sampling_start_time = models.CharField(max_length=5, verbose_name='زمان شروع نمونه‌گیری')  # HH:MM
    sampling_end_time = models.CharField(max_length=5, verbose_name='زمان پایان نمونه‌گیری')  # HH:MM
    roll_number = models.CharField(max_length=50, verbose_name='شماره رول')
    responsible_person_name = models.CharField(max_length=200, verbose_name='نام مسئول')
    
    # Optional fields
    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES, blank=True, null=True, verbose_name='شیفت')
    paper_type = models.CharField(max_length=30, choices=PAPER_TYPE_CHOICES, blank=True, null=True, verbose_name='نوع کاغذ')
    paper_size = models.IntegerField(blank=True, null=True, verbose_name='اندازه کاغذ')
    NumberOfTears = models.IntegerField(blank=True, null=True, verbose_name='تعداد پارگی')
    real_grammage = models.FloatField(blank=True, null=True, verbose_name='گراماژ واقعی')
    humidity = models.FloatField(blank=True, null=True, verbose_name='رطوبت')
    ash_percentage = models.FloatField(blank=True, null=True, verbose_name='درصد خاکستر')
    cub = models.FloatField(blank=True, null=True, verbose_name='کاب')
    
    # Physical specs
    profile = models.CharField(max_length=10, choices=PROFILE_CHOICES, blank=True, null=True, verbose_name='پروفایل')
    density_valve = models.FloatField(blank=True, null=True, verbose_name='شیر چگالی')
    diluting_valve = models.FloatField(blank=True, null=True, verbose_name='شیر رقیق‌ساز')
    
    # Temperature measurements
    cylinder_temperature_before_press = models.FloatField(blank=True, null=True, verbose_name='دمای سیلندر قبل از سایز پرس')
    cylinder_temperature_after_press = models.FloatField(blank=True, null=True, verbose_name='دمای سیلندر بعد از سایز پرس')
    
    # Resistance tests
    burst_test = models.TextField(blank=True, verbose_name='تست ترکیدگی')
    tensile_strength_md = models.FloatField(blank=True, null=True, verbose_name='مقاومت کششی MD')
    tensile_strength_cd = models.FloatField(blank=True, null=True, verbose_name='مقاومت کششی CD')
    
    # CCT tests
    cct1 = models.FloatField(blank=True, null=True, verbose_name='CCT 1')
    cct2 = models.FloatField(blank=True, null=True, verbose_name='CCT 2')
    cct3 = models.FloatField(blank=True, null=True, verbose_name='CCT 3')
    cct4 = models.FloatField(blank=True, null=True, verbose_name='CCT 4')
    cct5 = models.FloatField(blank=True, null=True, verbose_name='CCT 5')
    
    # RCT tests
    rct1 = models.FloatField(blank=True, null=True, verbose_name='RCT 1')
    rct2 = models.FloatField(blank=True, null=True, verbose_name='RCT 2')
    rct3 = models.FloatField(blank=True, null=True, verbose_name='RCT 3')
    rct4 = models.FloatField(blank=True, null=True, verbose_name='RCT 4')
    rct5 = models.FloatField(blank=True, null=True, verbose_name='RCT 5')
    
    # Production details
    tearing_time = models.TextField(blank=True, verbose_name='زمان پارگی')  # Changed to TextField for more flexibility
    calender_applied = models.BooleanField(default=False, verbose_name='کلندر اعمال شده')
    machine_speed = models.FloatField(blank=True, null=True, verbose_name='سرعت دستگاه')
    
    # Material usage - stored as JSON string with structure {"id":{"val":amount,"brand":"brand_name","text":"description"},...}
    material_usage = models.TextField(blank=True, verbose_name='مصرف مواد')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'رکورد کاغذ'
        verbose_name_plural = 'رکوردهای کاغذ'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"رول {self.roll_number} - {self.date}"
    
