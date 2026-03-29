from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import me_view, UserViewSet, RoleViewSet, PermissionViewSet, TeamViewSet
from scheduling.views import MonthConfigViewSet, ShiftPreferenceViewSet, ShiftAssignmentViewSet
from portal.views import AnnouncementViewSet, PollViewSet, DailyTaskViewSet
from authentication.views import dev_login, logout_view, auth_status

router = DefaultRouter()
router.register(r"users", UserViewSet)
router.register(r"roles", RoleViewSet)
router.register(r"permissions", PermissionViewSet)
router.register(r"teams", TeamViewSet)
router.register(r"months", MonthConfigViewSet)
router.register(r"preferences", ShiftPreferenceViewSet, basename="preferences")
router.register(r"assignments", ShiftAssignmentViewSet, basename="assignments")
router.register(r"announcements", AnnouncementViewSet, basename="announcements")
router.register(r"polls", PollViewSet, basename="polls")
router.register(r"tasks", DailyTaskViewSet, basename="tasks")

urlpatterns = [
    path("admin/", admin.site.urls),
    # API
    path("api/", include(router.urls)),
    path("api/me/", me_view, name="me"),
    # Auth
    path("api/auth/status/", auth_status, name="auth-status"),
    path("api/auth/dev-login/", dev_login, name="dev-login"),
    path("api/auth/logout/", logout_view, name="logout"),
    # OIDC (mozilla-django-oidc)
    path("oidc/", include("mozilla_django_oidc.urls")),
]
