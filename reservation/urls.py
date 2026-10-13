from django.urls import path
from .views import CheckAvailabilityAPIView

urlpatterns = [
    path('check-availability/', CheckAvailabilityAPIView.as_view()) 
]
