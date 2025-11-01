"""
App configuration for paper app.
"""
from django.apps import AppConfig


class PaperConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'paper'
    verbose_name = 'کاغذ'