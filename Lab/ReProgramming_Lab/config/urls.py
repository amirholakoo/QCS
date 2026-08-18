from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
from dashboard.views import Dashboard
urlpatterns = [
    path('admin/', admin.site.urls),
    path('widgets/', include('AM_Calendar.urls')),
    path('accounts/', include('accounts.urls')),
    path('', Dashboard)
]


admin.site.site_title = 'مدیریت'

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)