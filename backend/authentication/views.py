from django.conf import settings
from django.contrib.auth import login, logout
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from core.models import User


@api_view(["POST"])
@permission_classes([AllowAny])
def dev_login(request):
    """
    Development-only mock login. Disabled when DEBUG=False.
    POST {username: "..."} to login as that user.
    """
    if not settings.DEBUG:
        return Response({"error": "Not available in production"}, status=403)

    username = request.data.get("username")
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return Response({"status": "ok", "username": user.username})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([AllowAny])
def auth_status(request):
    if request.user.is_authenticated:
        return Response({
            "authenticated": True,
            "username": request.user.username,
            "name": request.user.get_full_name(),
        })
    return Response({"authenticated": False})
