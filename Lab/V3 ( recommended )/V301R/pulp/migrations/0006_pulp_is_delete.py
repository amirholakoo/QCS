from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pulp', '0005_pulp_sampling_location_names_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='pulp',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
    ]
