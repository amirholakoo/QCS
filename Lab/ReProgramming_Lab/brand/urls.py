from django.urls import path,include
from .views import *
urlpatterns = [
    path('add_new_brand/', add_new_brand, name="add_new_brand"),
    path("all/",GetAllBrand)
]