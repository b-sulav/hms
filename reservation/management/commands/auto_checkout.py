"""Auto checkout reservations whose check_out date is today."""
from datetime import date

from django.core.management.base import BaseCommand
from django.db.models import Q

from reservation.models import Reservation
from room.models import Room


class Command(BaseCommand):
    help = "Auto-checkout reservations whose check_out date is today."

    def handle(self, *args, **options):
        today = date.today()
        qs = Reservation.objects.filter(
            Q(status="Checked In") | Q(status="Confirmed"),
            check_out=today,
        )
        room_ids = list(qs.values_list("room_id", flat=True))
        count = qs.update(status="Checked Out")
        for reservation in qs:
            self.stdout.write(
                f"Checked out reservation {reservation.id} | "
                f"Room {reservation.room.room_no} | "
                f"{reservation.guest.fname} {reservation.guest.lname}"
            )
        for room in Room.objects.filter(id__in=room_ids):
            has_checked_in = room.reservations.filter(status="Checked In").exists()
            has_confirmed = room.reservations.filter(status="Confirmed").exists()
            if has_checked_in:
                new_status = Room.Status.Occupied
            elif has_confirmed:
                new_status = Room.Status.Reserved
            else:
                new_status = Room.Status.Available
            if room.status != new_status and room.status != Room.Status.Maintenance:
                room.status = new_status
                room.save(update_fields=["status"])
        self.stdout.write(self.style.SUCCESS(f"Auto-checked out {count} reservation(s)."))
