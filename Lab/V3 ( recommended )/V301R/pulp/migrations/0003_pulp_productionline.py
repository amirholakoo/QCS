# Generated migration file

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pulp', '0002_alter_pulp_downpulpcount'),
    ]

    operations = [
        migrations.AddField(
            model_name='pulp',
            name='ProductionLine',
            field=models.IntegerField(blank=True, choices=[(0, 'مشترک'), (2, 'PM2'), (3, 'PM3'), (4, 'PM4')], null=True, verbose_name='خط تولید'),
        ),
    ]

