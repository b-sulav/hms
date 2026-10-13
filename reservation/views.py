# reservation/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import CheckAvailabilityInputSerializer, CheckAvailabilityOutputSerializer
from room.serializers import RoomSerializer
from .services import check_availability

class CheckAvailabilityAPIView(APIView):
    def post(self, request):
        serializer = CheckAvailabilityInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        available_rooms = check_availability(**serializer.validated_data)
        return Response(CheckAvailabilityOutputSerializer(available_rooms, many=True).data, status=status.HTTP_200_OK)
