# sensor/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('temperature/', views.get_temperature_data),
]

