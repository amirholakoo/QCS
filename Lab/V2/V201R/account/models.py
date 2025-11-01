"""
Account models for simple authentication system.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


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
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip() or self.username