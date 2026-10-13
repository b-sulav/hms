# reservation/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CheckAvailabilityInputSerializer, CheckAvailabilityOutputSerializer, ReservationSerializer
from .services import check_availability
from django.shortcuts import get_object_or_404
from .models import Reservation

class ReservationAPIView(APIView):
    def get(self, request):
        reservations = Reservation.objects.all()
        serializer = ReservationSerializer(reservations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ReservationDetailAPIView(APIView):
    def get(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        serializer = ReservationSerializer(reservation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        serializer = ReservationSerializer(reservation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        reservation = get_object_or_404(Guest, pk=pk)
        reservation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CheckAvailabilityAPIView(APIView):
    def post(self, request):
        serializer = CheckAvailabilityInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        available_rooms = check_availability(**serializer.validated_data)
        return Response(CheckAvailabilityOutputSerializer(available_rooms, many=True).data, status=status.HTTP_200_OK)
