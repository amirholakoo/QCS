"""
App configuration for pulp app.
"""
from django.apps import AppConfig


class PulpConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'pulp'
    verbose_name = 'خمیر کاغذ'