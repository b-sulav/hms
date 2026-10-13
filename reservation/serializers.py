from rest_framework import serializers
from django.db import models
from .services import check_availability
from .models import Reservation

class ReservationSerializer(serializers.ModelSerializer):
    class meta:
        model = Reservation
        fields = '__all__'

class CheckAvailabilityInputSerializer(serializers.Serializer):
    num_guests = serializers.IntegerField(min_value=1)
    check_in = serializers.DateField()
    check_out = serializers.DateField()

class CheckAvailabilityOutputSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)