# Generated migration file

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('paper', '0003_paper_cub'),
    ]

    operations = [
        migrations.AddField(
            model_name='paper',
            name='ProductionLine',
            field=models.IntegerField(choices=[(2, 'PM2'), (3, 'PM3'), (4, 'PM4')], default=2, verbose_name='خط تولید'),
        ),
    ]

