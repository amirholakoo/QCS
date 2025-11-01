"""
URL configuration for paper_management project.
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/auth/', include('account.urls')),
    path('api/paper/', include('paper.urls')),
    path('api/pulp/', include('pulp.urls')),
    path('api/material/', include('material.urls')),
    path('api/logs/', include('logs.urls')),
    path('api/report/', include('report.urls')),
    
    # Serve React app for all other routes
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# Serve static files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)