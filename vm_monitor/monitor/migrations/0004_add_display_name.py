from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitor', '0003_replace_webmin_with_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='virtualmachine',
            name='display_name',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
