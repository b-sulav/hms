from datetime import date
from django.core.exceptions import ValidationError
from django.db.models import QuerySet
from room.models import Room
from .models import Reservation
from guest.models import Guest
from guest.services import create_guest
from datetime import date


def check_availability(num_guests: int, check_in: date, check_out: date) -> QuerySet[Room]:
    today = date.today()
    if check_in >= check_out:
        raise ValidationError("Check-in date must be earlier than check-out date.")
    if check_in < today:
        raise ValidationError("Check-in date cannot be in the past.")
    suitable_rooms = Room.objects.filter(room_type__capacity__gte=num_guests)    
    conflicting_reservations = Reservation.objects.filter(
        check_in__lt=check_out,
        check_out__gt=check_in
    )
    booked_room_ids = conflicting_reservations.values_list('room_id', flat=True)
    return suitable_rooms.exclude(id__in=booked_room_ids)




# def create_reservation(guest_id: int, room_id: int, check_in: date, check_out: date) -> Reservation:
#     today = date.today()
#     if check_in >= check_out:
#         raise ValidationError("Check-in date must be earlier than check-out date.")
#     if check_in < today:
#         raise ValidationError("Check-in date cannot be in the past.")
#     is_booked = Reservation.objects.filter(
#         room_id=room_id,
#         check_in__lt=check_out,
#         check_out__gt=check_in
#     ).exists()
#     if is_booked:
#         raise ValidationError("Selected room is not available for these dates.")
#     return Reservation.objects.create(
#         guest_id=guest_id,
#         room_id=room_id,
#         check_in=check_in,
#         check_out=check_out,
#         status='Pending',
#     )

# def controller(fname: str, lname: str, phone: str, email: str, room_id: int, check_in: date, check_out: date) -> Reservation:
#     guest = create_guest(fname, lname, phone, email)
#     reservation = create_reservation(
#         guest_id=guest.id, 
#         room_id=room_id, 
#         check_in=check_in, 
#         check_out=check_out
#     )
#     return reservation