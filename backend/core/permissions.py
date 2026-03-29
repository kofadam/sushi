from rest_framework.permissions import BasePermission


class HasPermCode(BasePermission):
    """
    DRF permission class that checks the user's in-app role permissions.
    Usage: permission_classes = [HasPermCode('manage_shifts')]
    """

    def __init__(self, codename: str):
        self.codename = codename

    def __call__(self):
        return self

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_perm_code(self.codename)


class IsManager(BasePermission):
    """Shortcut: user has the 'manage_all' permission."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.has_perm_code("manage_all")
