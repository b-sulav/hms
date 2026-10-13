from rest_framework import serializers
from django.db import models
from .models import Guest

class GuestSerializer(serializers.ModelSerializer):
    created_at = serializers.DateTimeField(read_only=True)
    class Meta:
        model = Guest
        fields = "__all__"