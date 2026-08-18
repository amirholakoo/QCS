"""
Models for logs app - system activity logging.
"""
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class LogEntry(models.Model):
    """
    Model for logging system activities.
    """
    ACTION_CHOICES = [
        ('create', 'ایجاد'),
        ('edit', 'ویرایش'),
        ('delete', 'حذف'),
    ]
    
    username = models.CharField(max_length=150, verbose_name='نام کاربری')
    model_name = models.CharField(max_length=100, verbose_name='نام مدل')
    action_type = models.CharField(max_length=10, choices=ACTION_CHOICES, verbose_name='نوع عملیات')
    details = models.JSONField( verbose_name='جزئیات',blank=True,null=True)
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name='زمان')
    
    class Meta:
        verbose_name = 'ورودی لاگ'
        verbose_name_plural = 'ورودی‌های لاگ'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.username} - {self.get_action_type_display()} {self.model_name} - {self.timestamp}"