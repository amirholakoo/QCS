"""
URL configuration for QC (Quality Control) app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, LoadingViewSet, QCRecordViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'loading', LoadingViewSet)
router.register(r'records', QCRecordViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
