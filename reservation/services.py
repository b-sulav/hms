from datetime import date
from django.core.exceptions import ValidationError
from django.db.models import QuerySet
from room.models import Room
from .models import Reservation
from guest.models import Guest


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
    ).exclude(status='Cancelled')
    booked_room_ids = conflicting_reservations.values_list('room_id', flat=True)
    return suitable_rooms.exclude(id__in=booked_room_ids)


def create_reservation(guest_id: int, room_id: int, check_in: date, check_out: date) -> Reservation:
    today = date.today()
    if check_in >= check_out:
        raise ValidationError("Check-in date must be earlier than check-out date.")
    if check_in < today:
        raise ValidationError("Check-in date cannot be in the past.")
    is_booked = Reservation.objects.filter(
        room_id=room_id,
        check_in__lt=check_out,
        check_out__gt=check_in
    ).exclude(status='Cancelled').exists()
    if is_booked:
        raise ValidationError("Selected room is not available for these dates.")
    return Reservation.objects.create(
        guest_id=guest_id,
        room_id=room_id,
        check_in=check_in,
        check_out=check_out,
        status='Confirmed',
    )


def get_or_create_guest(fname: str, lname: str, phone: str, email: str) -> Guest:
    existing = Guest.objects.filter(phone=phone).first()
    if existing:
        raise ValidationError(f"Guest with phone {phone} already exists.")
    return Guest.objects.create(
        fname=fname,
        lname=lname,
        phone=phone,
        email=email,
    )


def create_reservation_with_guest(fname: str, lname: str, phone: str, email: str, room_id: int, check_in: date, check_out: date) -> Reservation:
    guest = get_or_create_guest(fname, lname, phone, email)
    return create_reservation(
        guest_id=guest.id,
        room_id=room_id,
        check_in=check_in,
        check_out=check_out,
    )


def instant_reservation(fname: str = '', lname: str = '', phone: str = '', email: str = '', room_no: str = '', check_in: str = '', check_out: str = '', status: str = 'Confirmed', guest_id: int | None = None) -> Reservation:
    """Find the specific room by room number and create guest + reservation if available.
    If guest_id is provided, use that existing guest instead of creating a new one.
    """
    if guest_id is not None:
        try:
            guest = Guest.objects.get(pk=guest_id)
        except Guest.DoesNotExist:
            raise ValidationError(f"Guest with ID {guest_id} does not exist.")
    else:
        guest = get_or_create_guest(fname, lname, phone, email)

    if isinstance(check_in, str):
        check_in = date.fromisoformat(check_in)
    if isinstance(check_out, str):
        check_out = date.fromisoformat(check_out)

    today = date.today()
    if check_in >= check_out:
        raise ValidationError("Check-in date must be earlier than check-out date.")
    if check_in < today:
        raise ValidationError("Check-in date cannot be in the past.")

    try:
        room = Room.objects.get(room_no=room_no)
    except Room.DoesNotExist:
        raise ValidationError(f"Room {room_no} does not exist.")

    conflicting = Reservation.objects.filter(
        room=room,
        check_in__lt=check_out,
        check_out__gt=check_in,
    ).exclude(status='Cancelled')
    if conflicting.exists():
        raise ValidationError(f"Room {room_no} is not available for the selected dates.")

    return Reservation.objects.create(
        guest=guest,
        room=room,
        check_in=check_in,
        check_out=check_out,
        status=status,
    )
