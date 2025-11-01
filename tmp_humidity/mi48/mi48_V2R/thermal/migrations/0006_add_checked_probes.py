# Generated manually to add checked_probes field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('thermal', '0005_alter_probeconfiguration_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='probeconfiguration',
            name='checked_probes',
            field=models.JSONField(default=list, help_text='Store list of checked probe IDs like [1,2,3,4,5]'),
        ),
    ]

