from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('speed', '0004_remove_speed_speed27_remove_speed_speed28_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='speed',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
    ]
