from .models import Room, RoomType
from rest_framework import serializers

class RoomSerializer(serializers.ModelSerializer):
    room_type_name = serializers.CharField(source='room_type.name', read_only=True)
    class Meta:
        model = Room
        fields = ['id', 'room_no', 'status', 'room_type', 'room_type_name']

    def validate(self, attrs):
        if self.instance and 'status' in attrs and attrs['status'] != Room.Status.Maintenance:
            raise serializers.ValidationError(
                {"status": "Status can only be manually set to Maintenance."}
            )
        return attrs

class RoomTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomType
        fields = '__all__'

    def validate(self, attrs):
        if self.instance is None or 'capacity' in attrs:
            capacity = attrs.get('capacity', getattr(self.instance, 'capacity', None))
            if capacity is not None and capacity < 1:
                raise serializers.ValidationError({"capacity": "Capacity must be at least 1."})
        if self.instance is None or 'price' in attrs:
            price = attrs.get('price', getattr(self.instance, 'price', None))
            if price is not None and price < 0:
                raise serializers.ValidationError({"price": "Price cannot be negative."})
        return attrs