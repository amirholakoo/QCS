from django.contrib import admin
from django.urls import path,include
from .views import *

urlpatterns = [
    path('', thermal_view),
    path("savelog/", save_log_image, name="save_log"),
    path("logs/", show_log, name="show_log"),
    path("formuls/", temp_table, name="formuls"),
    path("save-input/", save_input, name="save_input"),
    path("get-saved-inputs/", get_saved_inputs, name="get_saved_inputs"),
    path("update-saved-point/", update_saved_point, name="update_saved_point"),
    path("delete-saved-point/", delete_saved_point, name="delete_saved_point"),
    path("save-probe-data/", save_probe_data, name="save_probe_data"),
    path("update-probe-config/", update_probe_configuration, name="update_probe_config"),
    path("get-probe-config/", get_probe_configuration, name="get_probe_config"),
    path("update-threshold/", update_threshold, name="update_threshold"),
    path("update-edge-threshold/", update_edge_threshold, name="update_edge_threshold"),
    path("update-auto-edge-detection/", update_auto_edge_detection, name="update_auto_edge_detection"),
    path("test/", test_view, name="test_view"),
    path("chart/", chart_view, name="chart_view"),
    path("save-roll-number/", save_roll_number, name="save_roll_number"),
    path("get-roll-status/", get_roll_status, name="get_roll_status"),
    path("chart-info-json/", chart_info_json, name="chart_info_json"),
]