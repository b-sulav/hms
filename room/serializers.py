from .models import Room, RoomType
from django.db import models

class RoomSerializer(models.Model):
    class meta:
        model = Room
        fields = '__all__'

class RoomTypeSerializer(models.Model):
    class meta:
        model = RoomType
        fields = '__all__'