from django.contrib import admin
from django.urls import path,include
from .views import *

urlpatterns = [
    path('', thermal_view),
    path("savelog/", save_log_image, name="save_log"),
    path("logs/", show_log, name="show_log"),
    path("formuls/", temp_table, name="formuls"),
    path("save-input/", save_input, name="save_input"),
    path("save-probe-data/", save_probe_data, name="save_probe_data"),
    path("update-probe-config/", update_probe_configuration, name="update_probe_config"),
    path("get-probe-config/", get_probe_configuration, name="get_probe_config"),
    path("test/", test_view, name="test_view"),
    path("chart/", chart_view, name="chart_view"),
]