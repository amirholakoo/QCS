# Generated manually for ProbeData model

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='ProbeData',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('humidity', models.FloatField()),
                ('temperature', models.FloatField()),
                ('active_formula', models.TextField()),
                ('probe_count', models.IntegerField()),
                ('probes_data', models.JSONField()),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
    ]