from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.authentication import SessionAuthentication, TokenAuthentication
from django.core.exceptions import ValidationError as DjangoValidationError
from auth_app.permissions import IsLimitedStaff
from .serializers import CheckAvailabilityInputSerializer, CheckAvailabilityOutputSerializer, ReservationSerializer
from .services import check_availability, create_reservation_with_guest, instant_reservation
from django.shortcuts import get_object_or_404
from .models import Reservation


class ReservationAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def get(self, request):
        reservations = Reservation.objects.all()
        
        status_filter = request.query_params.get('status')
        if status_filter:
            reservations = reservations.filter(status=status_filter)
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')
        if check_in and check_out:
            reservations = reservations.filter(check_in__gte=check_in, check_out__lte=check_out)
        serializer = ReservationSerializer(reservations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ReservationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReservationDetailAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def get(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        serializer = ReservationSerializer(reservation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        serializer = ReservationSerializer(reservation, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        reservation = get_object_or_404(Reservation, pk=pk)
        reservation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CheckAvailabilityAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def post(self, request):
        serializer = CheckAvailabilityInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            available_rooms = check_availability(**serializer.validated_data)
        except DjangoValidationError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(CheckAvailabilityOutputSerializer(available_rooms, many=True).data, status=status.HTTP_200_OK)


class CreateReservationWithGuestAPIView(APIView):
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, IsLimitedStaff]

    def post(self, request):
        try:
            room_no = request.data.get('room_no')
            guest_id = request.data.get('guest_id')
            if room_no and guest_id:
                try:
                    guest_id_int = int(guest_id)
                except (TypeError, ValueError):
                    return Response({'error': 'Invalid guest ID.'}, status=status.HTTP_400_BAD_REQUEST)
                if guest_id_int <= 0:
                    return Response({'error': 'Invalid guest ID.'}, status=status.HTTP_400_BAD_REQUEST)
                reservation = instant_reservation(
                    room_no=room_no,
                    check_in=request.data.get('check_in'),
                    check_out=request.data.get('check_out'),
                    status=request.data.get('status', 'Confirmed'),
                    guest_id=guest_id_int,
                )
            elif room_no:
                fname = request.data.get('fname', '').strip()
                lname = request.data.get('lname', '').strip()
                phone = request.data.get('phone', '').strip()
                email = request.data.get('email', '').strip()
                if not fname or not lname:
                    return Response({'error': 'First name and last name are required for new guests.'}, status=status.HTTP_400_BAD_REQUEST)
                reservation = instant_reservation(
                    fname=fname,
                    lname=lname,
                    phone=phone,
                    email=email,
                    room_no=room_no,
                    check_in=request.data.get('check_in'),
                    check_out=request.data.get('check_out'),
                    status=request.data.get('status', 'Confirmed'),
                )
            else:
                reservation = create_reservation_with_guest(
                    fname=request.data.get('fname', ''),
                    lname=request.data.get('lname', ''),
                    phone=request.data.get('phone', ''),
                    email=request.data.get('email', ''),
                    room_id=request.data.get('room_id'),
                    check_in=request.data.get('check_in'),
                    check_out=request.data.get('check_out'),
                )
            serializer = ReservationSerializer(reservation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            message = str(e)
            if hasattr(e, 'messages') and e.messages:
                message = list(e.messages)[0]
            elif hasattr(e, 'message_dict') and e.message_dict:
                first_key = next(iter(e.message_dict))
                message = str(e.message_dict[first_key][0]) if e.message_dict[first_key] else str(e)
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
