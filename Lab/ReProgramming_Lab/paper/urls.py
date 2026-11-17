from django.urls import path,include
from .views import *
urlpatterns = [
    path('add_new_paper',AddNewPaper,name="add_new_paper"),
    path('add_new_paper_type/', AddNewPaperType, name="add_new_paper_type"),
    path('paper_type/all/', GetAllPaperType),
    path('person_name/all/', GetAllPaperPersonName),
    path('roll/all', GetAllRolls),
    path('roll/get_roll/', GetRoll),
]