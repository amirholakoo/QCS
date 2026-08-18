"""
Models for paper app - paper production records.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from paper_type.models import PaperType as PaperTypeModel

User = get_user_model()


class Paper(models.Model):
    """
    Model for paper production records.
    """
    SHIFT_CHOICES = [
        ('day', 'روزانه'),
        ('night', 'شبانه'),
    ]
    
    PROFILE_CHOICES = [
        ('1', '+۱g-'),
        ('2', '+۲g-'),
        ('3', '+۳g-'),
        ('4', '+۴g-'),
        ('5', 'بیشتر از 5 گرم نوسان سر تا سر کاغذ'),
    ]
    
    PRODUCTION_LINE_CHOICES = [
        (2, 'PM2'),
        (3, 'PM3'),
        (4, 'PM4'),
    ]
    
    # Required fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='کاربر')
    date = models.CharField(max_length=10, verbose_name='تاریخ')  # Shamsi format YYYY-MM-DD
    sampling_start_time = models.CharField(max_length=5, verbose_name='زمان شروع نمونه‌گیری')  # HH:MM
    sampling_end_time = models.CharField(max_length=5, verbose_name='زمان پایان نمونه‌گیری')  # HH:MM
    ProductionLine = models.IntegerField(choices=PRODUCTION_LINE_CHOICES, default=2, verbose_name='خط تولید')
    roll_number = models.CharField(max_length=50, verbose_name='شماره رول')
    responsible_person_name = models.CharField(max_length=200, verbose_name='نام مسئول')
    
    # Optional fields
    shift = models.CharField(max_length=10, choices=SHIFT_CHOICES, blank=True, null=True, verbose_name='شیفت')
    PaperType = models.ForeignKey(PaperTypeModel, on_delete=models.PROTECT, blank=True, null=True, related_name='papers', verbose_name='نوع کاغذ')
    paper_size = models.IntegerField(blank=True, null=True, verbose_name='عرض کاغذ')
    NumberOfTears = models.IntegerField(blank=True, null=True, verbose_name='تعداد پارگی')
    real_grammage = models.FloatField(blank=True, null=True, verbose_name='گراماژ')
    humidity = models.FloatField(blank=True, null=True, verbose_name='رطوبت')
    ash_percentage = models.FloatField(blank=True, null=True, verbose_name='Ash')
    cub = models.FloatField(blank=True, null=True, verbose_name='CUB')
    
    # Physical specs
    profile = models.CharField(max_length=10, choices=PROFILE_CHOICES, blank=True, null=True, verbose_name='پروفایل')
    density_valve = models.FloatField(blank=True, null=True, verbose_name='شیر غلظت')
    diluting_valve = models.FloatField(blank=True, null=True, verbose_name='شیر رقیق‌ساز')
    density_valve2 = models.FloatField(blank=True, null=True, verbose_name='غلظت سنج 2')
    diluting_valve2 = models.FloatField(blank=True, null=True, verbose_name='رقیق کننده غلظت سنج 2')
    density_valve3 = models.FloatField(blank=True, null=True, verbose_name='غلظت سنج 3')
    diluting_valve3 = models.FloatField(blank=True, null=True, verbose_name='رقیق کننده غلظت سنج 3')
    density_valve4 = models.FloatField(blank=True, null=True, verbose_name='غلظت سنج 4')
    diluting_valve4 = models.FloatField(blank=True, null=True, verbose_name='رقیق کننده غلظت سنج 4')
    density_valve5 = models.FloatField(blank=True, null=True, verbose_name='غلظت سنج 5')
    diluting_valve5 = models.FloatField(blank=True, null=True, verbose_name='رقیق کننده غلظت سنج 5')
    
    # Resistance tests
    burst_test = models.TextField(blank=True, verbose_name='Burst')
    tensile_strength_md = models.FloatField(blank=True, null=True, verbose_name='MD')
    tensile_strength_cd = models.FloatField(blank=True, null=True, verbose_name='CD')
    
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
    ProductionDowntime = models.CharField(max_length=50,blank=True, verbose_name='زمان وقفه در تولید ( دقیقه )')
    CauseOfTearing = models.CharField(max_length=250,blank=True, verbose_name='علت پارگی/توقف')
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


class ProductionMachine(models.Model):
    """
    Model for production machines.
    """
    title = models.CharField(max_length=200, verbose_name='عنوان')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'ماشین تولید'
        verbose_name_plural = 'ماشین‌های تولید'
        ordering = ['title']
    
    def __str__(self):
        return self.title


class PM_Setting(models.Model):
    """
    Model for production machine settings related to paper records.
    """
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='pm_settings', verbose_name='رکورد کاغذ')
    production_machine = models.ForeignKey(ProductionMachine, on_delete=models.CASCADE, related_name='pm_settings', verbose_name='ماشین تولید')
    bottom = models.CharField(max_length=200, blank=True, verbose_name='شیر خمیر هدباکس پایین')
    top = models.CharField(max_length=200, blank=True, verbose_name='شیر خمیر هدباکس بالا')
    cylinder_temperature_before_press = models.FloatField(blank=True, null=True, verbose_name='دمای سیلندر قبل از سایز پرس')
    cylinder_temperature_after_press = models.FloatField(blank=True, null=True, verbose_name='دمای سیلندر بعد از سایز پرس')
    paper_temperature_before_starch = models.FloatField(blank=True, null=True, verbose_name='دمای کاغذ قبل از نشاسته')
    paper_temperature_before_pop_reel = models.FloatField(blank=True, null=True, verbose_name='دمای کاغذ قبل از پوپ ریل')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'تنظیمات ماشین تولید'
        verbose_name_plural = 'تنظیمات ماشین‌های تولید'
        ordering = ['production_machine__title']
        unique_together = ['paper', 'production_machine']
    
    def __str__(self):
        return f"{self.paper.roll_number} - {self.production_machine.title}"
