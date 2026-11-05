from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import date
from .models import Reservation, Room


@receiver([post_save, post_delete], sender=Reservation)
def update_room_status_from_reservations(sender, instance, **kwargs):
    """Keep Room.status in sync with active reservations.
    
    A room is:
    - Occupied if it has any Checked In reservation for today
    - Reserved if it has any Confirmed reservation for today
    - Available otherwise
    """
    room = instance.room
    today = date.today()

    has_checked_in_today = room.reservations.filter(
        status='Checked In',
        check_in=today,
    ).exists()

    has_confirmed_today = room.reservations.filter(
        status='Confirmed',
        check_in=today,
    ).exists()

    if has_checked_in_today:
        new_status = Room.Status.Occupied
    elif has_confirmed_today:
        new_status = Room.Status.Reserved
    else:
        new_status = Room.Status.Available

    if room.status != new_status and room.status != Room.Status.Maintenance:
        room.status = new_status
        room.save(update_fields=['status'])
