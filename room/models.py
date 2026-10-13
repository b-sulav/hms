from django.db import models

    
class RoomType(models.Model):
    name = models.CharField(max_length=10, unique=True)
    capacity = models.IntegerField()
    price = models.FloatField(max_length=7)
    def __str__(self):
        return self.name

class Room(models.Model):
    class Status(models.TextChoices):
        Available = 'Available'
        Occupied = 'Occupied'
        Maintainance = 'Maintainance'
    room_no = models.IntegerField(unique=True)
    status = models.CharField(choices=Status.choices, default=Status.Available)
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, blank=True, null=True)

    def __str__(self):
        return str(self.room_no) + ' - ' + str(self.room_type)



