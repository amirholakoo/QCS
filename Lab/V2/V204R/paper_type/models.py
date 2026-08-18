"""
Models for paper_type app - paper type definitions.
"""
from django.db import models


class PaperType(models.Model):
    """
    Model for paper types used in paper production.
    """
    name = models.CharField(max_length=200, unique=True, verbose_name='نام نوع کاغذ')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'نوع کاغذ'
        verbose_name_plural = 'انواع کاغذ'
        ordering = ['name']
    
    def __str__(self):
        return self.name
