from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from room.models import Room
from .models import Reservation
from .services import check_availability

class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'

    def save(self, **kwargs):
        try:
            return super().save(**kwargs)
        except DjangoValidationError as exc:
            message_dict = getattr(exc, 'message_dict', None)
            if message_dict:
                raise serializers.ValidationError(message_dict)
            messages = getattr(exc, 'messages', None)
            if messages:
                raise serializers.ValidationError(list(messages))
            raise serializers.ValidationError(str(exc))


class CheckAvailabilityInputSerializer(serializers.Serializer):
    num_guests = serializers.IntegerField(min_value=1)
    check_in = serializers.DateField()
    check_out = serializers.DateField()

class CheckAvailabilityOutputSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    capacity = serializers.IntegerField(source='room_type.capacity', read_only=True)

    class Meta:
        model = Room
        fields = ['id', 'room_no', 'status', 'room_type', 'room_type_name', 'capacity']