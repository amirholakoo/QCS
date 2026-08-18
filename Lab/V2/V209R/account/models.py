"""
Account models for simple authentication system.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class SystemSettings(models.Model):
    """
    System-wide settings model.
    Stores system version and other global settings.
    """
    version = models.CharField(max_length=20, default='V2.3', verbose_name='نسخه سیستم')
    update_details = models.TextField(blank=True, null=True, verbose_name='جزئیات آپدیت')
    is_updating = models.BooleanField(default=False, verbose_name='در حال به‌روزرسانی')
    updating_timer_seconds = models.PositiveIntegerField(default=0, verbose_name='تایمر (ثانیه)')
    updating_message = models.TextField(blank=True, null=True, verbose_name='پیام به‌روزرسانی')
    
    class Meta:
        verbose_name = 'تنظیمات سیستم'
        verbose_name_plural = 'تنظیمات سیستم'
    
    def __str__(self):
        return f'System Settings (Version: {self.version})'
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the single SystemSettings instance."""
        obj, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'version': 'V2.3',
                'is_updating': False,
                'updating_timer_seconds': 0,
            }
        )
        return obj


class CustomUser(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    Stores first name and last name for simple authentication.
    """
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    
    # Override username to be generated automatically
    username = models.CharField(max_length=150, unique=True)
    
    # Remove password requirement
    password = models.CharField(max_length=128, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Page access control: list of allowed page names (AppSection values)
    # If None or empty, user has access to all pages
    allowed_pages = models.JSONField(
        default=None,
        blank=True,
        null=True,
        help_text='لیست صفحات مجاز برای کاربر. اگر خالی باشد، دسترسی به همه صفحات دارد.',
        verbose_name='صفحات مجاز'
    )
    
    def save(self, *args, **kwargs):
        """
        Generate username from first_name and last_name if not provided.
        """
        if not self.username:
            self.username = self.generate_username()
        super().save(*args, **kwargs)
    
    def generate_username(self):
        """
        Generate username from first_name and last_name.
        This method is now only used when saving new users, not for login checks.
        """
        first = self.first_name.strip().lower().replace(' ', '')
        last = self.last_name.strip().lower().replace(' ', '')
        
        if first and last:
            base_username = f"{first}_{last}"
        elif first:
            base_username = first
        elif last:
            base_username = last
        else:
            base_username = f"user_{self.pk or 'new'}"
        
        # Ensure uniqueness
        username = base_username
        counter = 1
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1
        
        return username
    
    def has_page_access(self, page_name):
        """
        Check if user has access to a specific page.
        Returns True if allowed_pages is None/empty (full access) or page is in allowed_pages.
        """
        if not self.allowed_pages or len(self.allowed_pages) == 0:
            return True
        return page_name in self.allowed_pages
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username