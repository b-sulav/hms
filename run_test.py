import os
import sys
from datetime import date, timedelta
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hrs.settings')
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
import django
django.setup()

# Import models from correct modules
from reservation.models import Reservation, Guest, Room
from room.models import RoomType

def create_room_type():
    # Ensure a room type exists
    room_type, created = RoomType.objects.get_or_create(
        name='Standard',
        capacity=2,
        price=Decimal('100.00')
    )
    return room_type

def create_room():
    rt = create_room_type()
    room, created = Room.objects.get_or_create(
        room_no='101',
        defaults={'status': Room.Status.Available, 'room_type': rt}
    )
    return room

def create_guest():
    guest, created = Guest.objects.get_or_create(
        fname='Test',
        lname='User',
        phone='1234567890',
        email='test@example.com'
    )
    return guest

def create_reservation(check_in_date, check_out_date, status):
    guest = create_guest()
    room = create_room()
    reservation = Reservation.objects.create(
        guest=guest,
        room=room,
        check_in=check_in_date,
        check_out=check_out_date,
        status=status
    )
    return reservation

def auto_checkout():
    # Find reservations whose check_out date is today and status is pending
    today = date.today()
    reservations = Reservation.objects.filter(check_out=today, status=Reservation.Status.Pending)
    for reservation in reservations:
        reservation.status = Reservation.Status.Completed  # Completed = Checked Out
        reservation.save()

class SimpleTest:
    def test_reservation_creation(self):
        reservation = create_reservation(date.today() + timedelta(days=1), date.today() + timedelta(days=2), Reservation.Status.Pending)
        # Verify fields
        assert reservation.check_in == date.today() + timedelta(days=1)
        assert reservation.check_out == date.today() + timedelta(days=2)
        expected_str = f"{reservation.guest.fname} {reservation.guest.lname} | Room {reservation.room.room_no} | {reservation.check_in} - {reservation.check_out}"
        assert str(reservation) == expected_str

    def test_auto_checkout(self):
        # Create a reservation with checkout date today and status Pending
        today_reservation = create_reservation(date.today() + timedelta(days=1), date.today() + timedelta(days=2), Reservation.Status.Pending)
        assert today_reservation.check_out == date.today() + timedelta(days=2)
        assert today_reservation.status == Reservation.Status.Pending
        # Run auto checkout
        auto_checkout()
        today_reservation.refresh_from_db()
        # Verify status changed to Completed
        assert today_reservation.status == Reservation.Status.Completed

if __name__ == '__main__':
    test_instance = SimpleTest()
    test_instance.test_reservation_creation()
    test_instance.test_auto_checkout()
    print("All tests passed.")