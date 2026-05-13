from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitor', '0002_alter_virtualmachine_last_seen'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='virtualmachine',
            name='webmin_url',
        ),
        migrations.AddField(
            model_name='virtualmachine',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
    ]
