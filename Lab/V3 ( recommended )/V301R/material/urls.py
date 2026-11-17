"""
URL patterns for material app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'records', views.MaterialViewSet)

urlpatterns = [
    path('', include(router.urls)),
]