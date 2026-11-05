from datetime import date
from django.shortcuts import render, get_object_or_404
from .models import Room, RoomType
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from auth_app.permissions import IsLimitedStaff
from .serializers import RoomSerializer, RoomTypeSerializer

class RoomAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def get(self, request):
        rooms = Room.objects.all()
        serializer = RoomSerializer(rooms, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomDetailAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def get(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        serializer = RoomSerializer(room)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        is_auto = request.data.get('status') == 'Auto'
        data = dict(request.data)
        if is_auto:
            data.pop('status', None)
        serializer = RoomSerializer(room, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if is_auto:
                today = date.today()
                has_checked_in = room.reservations.filter(status='Checked In').exists()
                has_confirmed_today = room.reservations.filter(status='Confirmed', check_in=today).exists()
                if has_checked_in:
                    new_status = Room.Status.Occupied
                elif has_confirmed_today:
                    new_status = Room.Status.Reserved
                else:
                    new_status = Room.Status.Available
                room.status = new_status
                room.save(update_fields=['status'])
            serializer = RoomSerializer(room)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        room = get_object_or_404(Room, pk=pk)
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class RoomTypeAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def get(self, request):
        types = RoomType.objects.all()
        serializer = RoomTypeSerializer(types, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = RoomTypeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomTypeDetailAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def get(self, request, pk):
        room_type = get_object_or_404(RoomType, pk=pk)
        serializer = RoomTypeSerializer(room_type)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        room_type = get_object_or_404(RoomType, pk=pk)
        serializer = RoomTypeSerializer(room_type, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        room_type = get_object_or_404(RoomType, pk=pk)
        room_type.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)