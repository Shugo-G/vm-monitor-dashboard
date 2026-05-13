from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitor', '0004_add_display_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='virtualmachine',
            name='machine_id',
            field=models.CharField(blank=True, max_length=64, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='virtualmachine',
            name='hostname',
            field=models.CharField(max_length=255),
        ),
    ]
