"""
Models for speed app - speed records (Roll_Number + Speed1..Speed26).
"""
from django.db import models
from django.utils import timezone


class Speed(models.Model):
    """
    Model for speed records.
    """
    Roll_Number = models.CharField(max_length=200, blank=True, null=True, verbose_name='رول شماره')

    Speed1 = models.IntegerField(blank=True, null=True, verbose_name='TOP_WIRE')
    Speed2 = models.IntegerField(blank=True, null=True, verbose_name='Top_Pressure_Screen')
    Speed3 = models.IntegerField(blank=True, null=True, verbose_name='Top_Fan')
    Speed4 = models.IntegerField(blank=True, null=True, verbose_name='Top_Pulp')
    Speed5 = models.IntegerField(blank=True, null=True, verbose_name='Top_Vacuum_Wire')
    Speed6 = models.IntegerField(blank=True, null=True, verbose_name='HeadBox_Water_Pump')

    Speed7 = models.IntegerField(blank=True, null=True, verbose_name='BOT_Wire')
    Speed8 = models.IntegerField(blank=True, null=True, verbose_name='BOT_Pressure_Screen')
    Speed9 = models.IntegerField(blank=True, null=True, verbose_name='BOT_Fan')

    Speed10 = models.IntegerField(blank=True, null=True, verbose_name='Bot_Vacum_1')
    Speed11 = models.IntegerField(blank=True, null=True, verbose_name='Bot_Vacum_2')
    Speed12 = models.IntegerField(blank=True, null=True, verbose_name='Press_1')
    Speed13 = models.IntegerField(blank=True, null=True, verbose_name='Press_2')

    Speed14 = models.IntegerField(blank=True, null=True, verbose_name='Press_3')
    Speed15 = models.IntegerField(blank=True, null=True, verbose_name='Felt_Vac_1')
    Speed16 = models.IntegerField(blank=True, null=True, verbose_name='Felt_Vac_2')

    Speed17 = models.IntegerField(blank=True, null=True, verbose_name='Dryer_1_Top')
    Speed18 = models.IntegerField(blank=True, null=True, verbose_name='Dryer_1_Bottom')
    Speed19 = models.IntegerField(blank=True, null=True, verbose_name='Dryer_2_Top')
    Speed20 = models.IntegerField(blank=True, null=True, verbose_name='Dryer_2_Bottom')

    Speed21 = models.IntegerField(blank=True, null=True, verbose_name='Size_Press')
    Speed22 = models.IntegerField(blank=True, null=True, verbose_name='Baby_Roll')
    Speed23 = models.IntegerField(blank=True, null=True, verbose_name='Post_Dryer_Top')
    Speed24 = models.IntegerField(blank=True, null=True, verbose_name='Post_Dryer_Bottom')

    Speed25 = models.IntegerField(blank=True, null=True, verbose_name='Calendar')
    Speed26 = models.IntegerField(blank=True, null=True, verbose_name='Reel')

    # Timestamps (default so API create works; editable so admin can override)
    created_at = models.DateTimeField(default=timezone.now, editable=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(default=timezone.now, editable=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'سرعت'
        verbose_name_plural = 'سرعت‌ها'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Speed {self.id} - {self.Roll_Number or '-'}"
