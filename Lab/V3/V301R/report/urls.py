from django.urls import path
from . import views

urlpatterns = [
    path('chart-data/', views.chart_data_api, name='chart_data_api'),
    path('clear-chart-data/', views.clear_chart_data, name='clear_chart_data'),
    path('debug-chart-data/', views.debug_chart_data, name='debug_chart_data'),
    path('technical-report-data/', views.technical_report_data_api, name='technical_report_data_api'),
    path('dashboard-stats/', views.dashboard_stats_api, name='dashboard_stats_api'),
    path('complete-report-export-csv/', views.complete_report_export_csv, name='complete_report_export_xlsx'),
    path('sync-plc-data/', views.sync_plc_data_api, name='sync_plc_data_api'),
    path('plc-keys/', views.plc_keys_api, name='plc_keys_api'),
    path('plc-keys/reorder/', views.plc_keys_reorder_api, name='plc_keys_reorder_api'),
    path('roll-plc-data/', views.roll_plc_data_api, name='roll_plc_data_api'),
    path('plc-column-preference/', views.plc_column_preference_api, name='plc_column_preference_api'),
]
