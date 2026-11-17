from django.urls import path,include
from .views import *
urlpatterns = [
    path('add_new_production_machine/', add_new_ProductionMachine, name="add_new_production_machine"),
    path('all/', GetAllProductionMachine)
]