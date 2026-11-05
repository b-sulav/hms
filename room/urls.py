from django.urls import path
from .views import RoomAPIView, RoomTypeAPIView, RoomDetailAPIView, RoomTypeDetailAPIView

urlpatterns = [
    path('', RoomAPIView.as_view()),
    path('<int:pk>/', RoomDetailAPIView.as_view()),
    path('types/', RoomTypeAPIView.as_view()),
    path('types/<int:pk>/', RoomTypeDetailAPIView.as_view()),
]