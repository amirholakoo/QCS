"""
Models for pulp app - pulp sampling records.
"""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Pulp(models.Model):
    """
    Model for pulp sampling records.
    """
    # Optional roll number reference
    roll_number = models.IntegerField(blank=True, null=True, verbose_name='شماره رول')
    
    # Lower section tests
    lower_sampling_time = models.CharField(max_length=5, blank=True, verbose_name='زمان نمونه‌گیری پایین')  # HH:MM
    downpulpcount = models.FloatField(blank=True, null=True, verbose_name='کانس خمیر پایین')
    downpulpfreenes = models.FloatField(blank=True, null=True, verbose_name='فرینس خمیر پایین')
    lower_headbox_freeness = models.FloatField(blank=True, null=True, verbose_name='فرینس خمیر پایین')
    lower_ph = models.FloatField(blank=True, null=True, verbose_name='pH پایین')
    lower_pulp_temperature = models.FloatField(blank=True, null=True, verbose_name='دمای خمیر پایین')
    lower_water_filter = models.FloatField(blank=True, null=True, verbose_name='فیلتر آب پایین')
    
    # Upper section tests
    upper_headbox_consistency = models.FloatField(blank=True, null=True, verbose_name='غلظت هدباکس بالا')
    upper_headbox_freeness = models.FloatField(blank=True, null=True, verbose_name='آزادی هدباکس بالا')
    upper_ph = models.FloatField(blank=True, null=True, verbose_name='pH بالا')
    upper_pulp_temperature = models.FloatField(blank=True, null=True, verbose_name='دمای خمیر بالا')
    upper_water_filter = models.FloatField(blank=True, null=True, verbose_name='فیلتر آب بالا')
    
    # Other consistency tests
    pond8_consistency = models.FloatField(blank=True, null=True, verbose_name='غلظت استخر ۸')
    curtain_consistency = models.FloatField(blank=True, null=True, verbose_name='غلظت پرده')
    thickener_consistency = models.FloatField(blank=True, null=True, verbose_name='غلظت غلیظ‌کن')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'نمونه خمیر'
        verbose_name_plural = 'نمونه‌های خمیر'
        ordering = ['-created_at']
    
    def __str__(self):
        if self.roll_number:
            return f"نمونه خمیر رول {self.roll_number}"
        return f"نمونه خمیر {self.id}"