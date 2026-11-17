from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('material', '0002_material_en_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='material',
            name='is_delete',
            field=models.BooleanField(default=False, verbose_name='حذف نمایشی'),
        ),
    ]
