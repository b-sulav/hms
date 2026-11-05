import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('guest', '0001_initial'),
        ('room', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Reservation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('check_in', models.DateField()),
                ('check_out', models.DateField()),
                ('status', models.CharField(choices=[('Checked In', 'Active'), ('Confirmed', 'Pending'), ('Checked Out', 'Completed'), ('Cancelled', 'Cancelled')], default='Confirmed')),
                ('notes', models.TextField(blank=True, help_text='Special requests or notes for this reservation.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('guest', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to='guest.guest')),
                ('room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reservations', to='room.room')),
            ],
            options={
                'ordering': ['-check_in'],
                'indexes': [models.Index(fields=['room', 'check_in', 'check_out'], name='reservation_room_id_9ad1b3_idx'), models.Index(fields=['check_in', 'check_out'], name='reservation_check_i_925118_idx'), models.Index(fields=['status'], name='reservation_status_af75b6_idx')],
            },
        ),
    ]
