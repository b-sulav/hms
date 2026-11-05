from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class RoomType(models.Model):
    name = models.CharField(max_length=10, unique=True)
    capacity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def clean(self):
        if self.capacity < 1:
            raise ValidationError("Capacity must be at least 1.")
        if self.price < 0:
            raise ValidationError("Price cannot be negative.")


class Room(models.Model):
    class Status(models.TextChoices):
        Available = 'Available'
        Reserved = 'Reserved'
        Occupied = 'Occupied'
        Maintenance = 'Maintenance'
    room_no = models.CharField(max_length=10, unique=True)
    status = models.CharField(choices=Status.choices, default=Status.Available)
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['room_no']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.room_no} - {self.room_type}"
