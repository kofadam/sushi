import json
from django.conf import settings
from django.contrib.auth import login, logout
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET
from core.models import User


@csrf_exempt
@require_POST
def dev_login(request):
    """
    Development-only mock login. Disabled when DEBUG=False.
    Plain Django view (not DRF) for reliable session cookie handling.
    """
    if not settings.DEBUG:
        return JsonResponse({"error": "Not available in production"}, status=403)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    username = data.get("username")
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return JsonResponse({"status": "ok", "username": user.username})


@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"status": "ok"})


@require_GET
def auth_status(request):
    if request.user.is_authenticated:
        return JsonResponse({
            "authenticated": True,
            "username": request.user.username,
            "name": request.user.get_full_name(),
        })
    return JsonResponse({"authenticated": False})
