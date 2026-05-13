from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitor', '0005_add_machine_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='virtualmachine',
            name='machine_id',
            field=models.CharField(blank=True, max_length=64, null=True),
        ),
    ]
