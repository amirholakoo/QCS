from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('paper_type', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='papertype',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
    ]
