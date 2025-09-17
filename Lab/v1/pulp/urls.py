"""
URL patterns for pulp app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'records', views.PulpViewSet)

urlpatterns = [
    path('', include(router.urls)),
]