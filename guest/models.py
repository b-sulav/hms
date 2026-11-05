from django.db import models
from django.core.exceptions import ValidationError

class Guest(models.Model):
    fname = models.CharField(max_length=50)
    lname = models.CharField(max_length=50)
    phone = models.CharField(max_length=20, blank=False, unique=True)
    email = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.fname + ' ' + self.lname

    def clean(self):
        if not self.fname or not self.lname:
            raise ValidationError("Guest must have both first and last name.")

