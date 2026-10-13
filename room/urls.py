from django.urls import path
from .views import RoomAPIView, RoomTypeAPIView

urlpatterns = [
    path('create/', RoomAPIView.as_view()),
    path('type/create/', RoomTypeAPIView.as_view()),
]