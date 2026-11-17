from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from thermal.views import PointsData
from thermal.views import change_roll_sensor
urlpatterns = [
    path('admin/', admin.site.urls),
    # path('thermal_sensor/', thermal_check),
    path('view/', include('thermal.urls')),
    path('personnel/', include('thermal.urls')),
    path("api/data/", PointsData, name="points_data"),
    path("", change_roll_sensor, name="change_roll_sensor"),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)