from django.urls import path
from . import views

urlpatterns = [
    path('chart-data/', views.chart_data_api, name='chart_data_api'),
    path('clear-chart-data/', views.clear_chart_data, name='clear_chart_data'),
    path('debug-chart-data/', views.debug_chart_data, name='debug_chart_data'),
    path('technical-report-data/', views.technical_report_data_api, name='technical_report_data_api'),
]
