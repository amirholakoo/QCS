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
]