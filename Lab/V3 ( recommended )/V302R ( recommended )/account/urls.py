"""
URL patterns for account app.
"""
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_or_register, name='login_or_register'),
    path('logout/', views.logout_view, name='logout'),
    path('current-user/', views.current_user, name='current_user'),
    path('users/', views.list_users, name='list_users'),
    path('system-version/', views.get_system_version, name='get_system_version'),
    path('updating-status/', views.get_updating_status, name='get_updating_status'),
    path('permissions/', views.get_permissions, name='get_permissions'),
]