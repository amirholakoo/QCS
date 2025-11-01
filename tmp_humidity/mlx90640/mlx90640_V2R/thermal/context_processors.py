from django.conf import settings
def global_context(request):
    return {
        'thermal_rows': settings.THERMAL_SENSOR_ROWS,
        'thermal_cols': settings.THERMAL_SENSOR_COLS,
        'thermal_display_width': settings.THERMAL_DISPLAY_WIDTH,
        'thermal_display_height': settings.THERMAL_DISPLAY_HEIGHT,
        'thermal_grid_cell_size': settings.THERMAL_GRID_CELL_SIZE,
        'thermal_sensor_total_pixels': settings.THERMAL_SENSOR_TOTAL_PIXELS,
    }