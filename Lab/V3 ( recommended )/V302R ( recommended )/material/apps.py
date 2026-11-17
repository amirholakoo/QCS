"""
App configuration for material app.
"""
from django.apps import AppConfig


class MaterialConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'material'
    verbose_name = 'مواد'