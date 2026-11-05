from django.apps import AppConfig


class ReservationConfig(AppConfig):
    name = 'reservation'

    def ready(self):
        from . import signals 
        
