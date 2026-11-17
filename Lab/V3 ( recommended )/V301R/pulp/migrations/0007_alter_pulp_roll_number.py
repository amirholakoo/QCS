from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pulp', '0006_pulp_is_delete'),
    ]

    operations = [
        migrations.AlterField(
            model_name='pulp',
            name='roll_number',
            field=models.CharField(blank=True, max_length=50, null=True, verbose_name='شماره رول'),
        ),
    ]
