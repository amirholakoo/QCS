from django.contrib import admin
from django.urls import path,include
from django.conf import settings
from django.conf.urls.static import static
from dashboard.views import Dashboard
urlpatterns = [
    path('admin/', admin.site.urls),
    path('base/', include('base.urls')),
    path('widgets/', include('AM_Calendar.urls')),
    path('accounts/', include('accounts.urls')),
    path('paper/', include('paper.urls')),
    path('material/', include('material.urls')),
    path('production/', include('production_machine.urls')),
    path('brand/', include('brand.urls')),
    path('', Dashboard),
]


admin.site.site_title = 'مدیریت'

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)