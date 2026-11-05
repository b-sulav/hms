import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='RoomType',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=10, unique=True)),
                ('capacity', models.IntegerField()),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='Room',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('room_no', models.CharField(max_length=10, unique=True)),
                ('status', models.CharField(choices=[('Available', 'Available'), ('Occupied', 'Occupied'), ('Maintenance', 'Maintenance')], default='Available')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('room_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='room.roomtype')),
            ],
            options={
                'indexes': [models.Index(fields=['room_no'], name='room_room_room_no_745b1e_idx'), models.Index(fields=['status'], name='room_room_status_6f53d2_idx')],
            },
        ),
    ]
