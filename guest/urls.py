from django.urls import path 
from .views import GuestAPIView, GuestDetailAPIView

urlpatterns = [
    path('', GuestAPIView.as_view()),
    path('<int:pk>/', GuestDetailAPIView.as_view())
]