from datetime import date
from django.db import models
from django.db.models import QuerySet
from django.core.exceptions import ValidationError
from room.models import Room
from guest.models import Guest


class Reservation(models.Model):
    class Status(models.TextChoices):
        Active = 'Checked In'
        Pending = 'Confirmed'
        Completed = 'Checked Out'
        Cancelled = 'Cancelled'
    guest = models.ForeignKey(Guest, on_delete=models.CASCADE, related_name='reservations')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='reservations')
    check_in = models.DateField()
    check_out = models.DateField()
    status = models.CharField(choices=Status.choices, default=Status.Pending)
    notes = models.TextField(blank=True, help_text="Special requests or notes for this reservation.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.guest.fname} {self.guest.lname} | Room {self.room.room_no} | {self.check_in} - {self.check_out}"

    def clean(self):
        if self.check_in >= self.check_out:
            raise ValidationError("Check-in date must be earlier than check-out date.")
        if self.check_in < date.today():
            raise ValidationError("Check-in date cannot be in the past.")
        if self.guest_id and self.room_id:
            overlapping = Reservation.objects.filter(
                room=self.room,
                check_in__lt=self.check_out,
                check_out__gt=self.check_in,
            ).exclude(pk=self.pk).exclude(status='Cancelled')
            if overlapping.exists():
                raise ValidationError("Selected room is not available for these dates.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=['room', 'check_in', 'check_out']),
            models.Index(fields=['check_in', 'check_out']),
            models.Index(fields=['status']),
        ]
        ordering = ['-check_in']