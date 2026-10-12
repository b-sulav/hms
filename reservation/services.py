from .models import Reservation
from room.models import Room, RoomType
from django.core.exceptions import ValidationError
from datetime import date

global today_date

def check_availability(num_guests: int, check_in: date, check_out: date) -> list[Room]:
    today_date = date.today()
    if check_in >= check_out or check_out <= check_in:
        raise ValidationError("Check-in must be less than Check-out")
    if check_out <= check_in:
        raise ValidationError("Check-out must be greater than Check-in")
    if check_in < today_date:
        raise ValidationError("Check-in date cannot be in the past")
    suitable_rooms = Room.objects.filter(room_type__capacity__gte=num_guests)
    conflicting_reservations = Reservation.objects.filter(
        check_in__lt=check_out,
        check_out__gt=check_in
    )
    booked_room_ids = conflicting_reservations.values_list('room_id', flat=True)
    available_rooms = suitable_rooms.exclude(id__in=booked_room_ids)
    if available_rooms:
        return available_rooms
    else:
        return "No Rooms Available"


def create_reservation(guest_id: int, room_id: int, check_in: date, check_out: date) -> Reservation: 
    today_date = date.today()
    if check_in >= check_out or check_out <= check_in:
        raise ValidationError("Check-in must be less than Check-out")
    if check_out <= check_in:
        raise ValidationError("Check-out must be greater than Check-in")
    if check_in < today_date:
        raise ValidationError("Check-in date cannot be in the past")
    reservation = Reservation.objects.create(
        guest_id=guest_id,
        room_id=room_id,
        check_in=check_in,
        check_out=check_out,
        status='Pending',
    )
    return 'Reservation Completed'

