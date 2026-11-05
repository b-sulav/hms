from django.urls import path
from .views import LoginView, LogoutView, CurrentUserView

urlpatterns = [
    path('login/', LoginView.as_view(), name='api-login'),
    path('logout/', LogoutView.as_view(), name='api-logout'),
    path('me/', CurrentUserView.as_view(), name='api-current-user'),
]
