from rest_framework import permissions


class IsLimitedStaff(permissions.BasePermission):
    """
    Permission class for limited staff users.
    
    - Superusers and staff NOT in the Limited/Maintenance groups have full access
    - Users in the Limited Staff group have restricted access:
      * Can view rooms, room types, guests, reservations
      * Can add/edit guests and reservations
      * Can check in guests
      * CANNOT add/edit/delete rooms or room types
      * CANNOT delete guests or reservations
    - Users in the Maintenance Staff group have the same access as Limited Staff,
      PLUS they can change room status to Maintenance via PATCH/PUT
    """
    LIMITED_STAFF_GROUP = "Limited Staff"
    MAINTENANCE_STAFF_GROUP = "Maintenance Staff"

    URL_MODEL_MAP = {
        'room': ('room', 'room'),
        'room/types': ('room', 'roomtype'),
        'guest': ('guest', 'guest'),
        'reservation': ('reservation', 'reservation'),
    }

    METHOD_PERM_MAP = {
        'GET': 'view',
        'POST': 'add',
        'PUT': 'change',
        'PATCH': 'change',
        'DELETE': 'delete',
        'HEAD': 'view',
        'OPTIONS': 'view',
    }

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if (request.user.is_superuser or request.user.is_staff) and \
           not request.user.groups.filter(name__in=[self.LIMITED_STAFF_GROUP, self.MAINTENANCE_STAFF_GROUP]).exists():
            return True

        if request.user.groups.filter(name=self.LIMITED_STAFF_GROUP).exists():
            return self._check_limited_permissions(request, view)

        if request.user.groups.filter(name=self.MAINTENANCE_STAFF_GROUP).exists():
            return self._check_maintenance_permissions(request, view)

        return False

    def _check_limited_permissions(self, request, view):
        path = request.path

        app_label = None
        model_name = None
        for pattern, (app, model) in self.URL_MODEL_MAP.items():
            if f'/{pattern}/' in path or path.endswith(f'/{pattern}'):
                app_label = app
                model_name = model
                break

        if model_name is None:
            return True

        required_perm_prefix = self.METHOD_PERM_MAP.get(request.method)
        if required_perm_prefix is None:
            return True

        perm_codename = f'{required_perm_prefix}_{model_name}'
        return request.user.has_perm(f'{app_label}.{perm_codename}')

    def _check_maintenance_permissions(self, request, view):
        path = request.path

        app_label = None
        model_name = None
        for pattern, (app, model) in self.URL_MODEL_MAP.items():
            if f'/{pattern}/' in path or path.endswith(f'/{pattern}'):
                app_label = app
                model_name = model
                break

        if model_name is None:
            return True

        if model_name == 'room' and request.method in ('PATCH', 'PUT'):
            data_keys = set(request.data.keys()) if hasattr(request, 'data') else set()
            if data_keys.issubset({'status'}):
                return True

        return self._check_limited_permissions(request, view)
