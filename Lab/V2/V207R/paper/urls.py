"""
URL patterns for paper app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'records', views.PaperViewSet)
router.register(r'production-machines', views.ProductionMachineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]