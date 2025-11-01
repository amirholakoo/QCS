from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from thermal.views import PointsData

urlpatterns = [
    path('admin/', admin.site.urls),
    # path('thermal_sensor/', thermal_check),
    path('view/', include('thermal.urls')),
    path('personnel/', include('thermal.urls')),
    path("", PointsData, name="points_data"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)