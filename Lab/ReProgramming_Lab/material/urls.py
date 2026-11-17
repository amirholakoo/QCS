from django.urls import path,include
from .views import *
urlpatterns = [
    path('add_new_material/', add_new_material, name="add_new_material"),
    path("all/",GetAllMaterial)
]