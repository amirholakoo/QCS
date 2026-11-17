from django.urls import path,include
from .views import *

urlpatterns = [
    path('', Index),
    path('current_date/', get_current_date)
    # path('login/',views.Login,name="baselogin")
]