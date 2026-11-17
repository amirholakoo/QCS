from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('qc', '0004_customer_is_delete_loading_is_delete_qcrecord_is_delete'),
    ]

    operations = [
        migrations.AddField(
            model_name='qcrecord',
            name='editing_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='qc_edit_locks', to=settings.AUTH_USER_MODEL, verbose_name='کاربر در حال ویرایش'),
        ),
        migrations.AddField(
            model_name='qcrecord',
            name='editing_started_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان شروع ویرایش'),
        ),
        migrations.AddField(
            model_name='qcrecord',
            name='edit_lock_expires_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='زمان انقضای قفل ویرایش'),
        ),
    ]
