# Generated for soft-delete (display-only delete)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('paper', '0015_pm_setting_details'),
    ]

    operations = [
        migrations.AddField(
            model_name='paper',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
        migrations.AddField(
            model_name='productionmachine',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
    ]
