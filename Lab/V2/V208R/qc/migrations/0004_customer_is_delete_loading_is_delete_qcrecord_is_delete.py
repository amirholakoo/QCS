from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('qc', '0003_qcrecord_column_order_alter_loading_ash'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
        migrations.AddField(
            model_name='loading',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
        migrations.AddField(
            model_name='qcrecord',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
    ]
