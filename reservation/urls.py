from django.urls import path
from .views import CheckAvailabilityAPIView, ReservationAPIView, ReservationDetailAPIView

urlpatterns = [
    path('check-availability/', CheckAvailabilityAPIView.as_view()),
    path('', ReservationAPIView.as_view()),
    path('<int:pk>/', ReservationDetailAPIView.as_view()),
]
