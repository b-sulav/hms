from django.db import models

class Reservation(models.Model):
    class Status(models.TextChoices):
        Active = 'Active'
        Pending = 'Pending'
        Completed = 'Completed'
        Cancelled = 'Cancelled'
    guest_id = models.ForeignKey('guest.Guest', on_delete=models.CASCADE)
    room_id = models.ForeignKey('room.Room', on_delete=models.CASCADE)
    check_in = models.DateField()
    check_out = models.DateField()
    status = models.CharField(choices=Status.choices, default=Status.Pending)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.guest_id.fname + ' ' + self.guest_id.lname + " | " + str(self.room_id.room_no) + ' | ' + str(self.check_in) + ' - ' + str(self.check_out)