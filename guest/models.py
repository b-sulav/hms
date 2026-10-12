from django.db import models

class Guest(models.Model):
    fname = models.CharField(max_length=50)
    lname = models.CharField(max_length=50)
    phone = models.CharField(max_length=10, blank=False)
    email = models.EmailField(max_length=100)
    
    def __str__(self):
        return self.fname + ' ' + self.lname

