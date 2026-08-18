"""
Models for material app - materials used in production.
"""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Material(models.Model):
    """
    Model for materials used in paper production.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name='کاربر ایجادکننده')
    material_name = models.CharField(max_length=200, verbose_name='نام ماده')
    description = models.TextField(blank=True, verbose_name='توضیحات')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='تاریخ ایجاد')
    last_updated = models.DateTimeField(auto_now=True, verbose_name='آخرین بروزرسانی')
    
    class Meta:
        verbose_name = 'ماده'
        verbose_name_plural = 'مواد'
        ordering = ['material_name']
        unique_together = ['user', 'material_name']  # Prevent duplicate materials per user
    
    def __str__(self):
        return self.material_name