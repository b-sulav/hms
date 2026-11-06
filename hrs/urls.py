from django.contrib import admin
from django.urls import path, include
# from rest_framework.authtoken.views import ObtainAuthToken

# Import view classes from each app
from auth_app.views import LoginView, LogoutView, CurrentUserView
from reservation.views import CheckAvailabilityAPIView, ReservationAPIView, ReservationDetailAPIView, CreateReservationWithGuestAPIView
from guest.views import GuestAPIView, GuestDetailAPIView
from room.views import RoomAPIView, RoomDetailAPIView, RoomTypeAPIView, RoomTypeDetailAPIView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', LoginView.as_view(), name='api-login'),
    path('api/auth/logout/', LogoutView.as_view(), name='api-logout'),
    path('api/auth/me/', CurrentUserView.as_view(), name='api-current-user'),
    path('api/reservation/check-availability/', CheckAvailabilityAPIView.as_view()),
    path('api/reservation/create-with-guest/', CreateReservationWithGuestAPIView.as_view()),
    path('api/reservation/', ReservationAPIView.as_view()),
    path('api/reservation/<int:pk>/', ReservationDetailAPIView.as_view()),
    path('api/guest/', GuestAPIView.as_view()),
    path('api/guest/<int:pk>/', GuestDetailAPIView.as_view()),
    path('api/room/', RoomAPIView.as_view()),
    path('api/room/<int:pk>/', RoomDetailAPIView.as_view()),
    path('api/room/types/', RoomTypeAPIView.as_view()),
    path('api/room/types/<int:pk>/', RoomTypeDetailAPIView.as_view()),
]