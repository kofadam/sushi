from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from rest_framework.routers import DefaultRouter
from core.views import me_view, UserViewSet, RoleViewSet, PermissionViewSet, TeamViewSet
from scheduling.views import MonthConfigViewSet, ShiftPreferenceViewSet, ShiftAssignmentViewSet, SpecialDayViewSet
from portal.views import AnnouncementViewSet, PollViewSet, DailyTaskViewSet
from authentication.views import dev_login, logout_view, auth_status
from scheduling.ai_views import ai_insights
from handoff.views import ShiftNoteViewSet, HandoffSummaryViewSet

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
router.register(r"special-days", SpecialDayViewSet, basename="special-days")
router.register(r"shift-notes", ShiftNoteViewSet, basename="shift-notes")
router.register(r"handoff-summaries", HandoffSummaryViewSet, basename="handoff-summaries")

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
    # AI
    path("api/ai/insights/", ai_insights, name="ai-insights"),
]

# SPA catch-all: serve index.html for any non-API, non-static route
# This lets React Router handle client-side routing
from pathlib import Path
from django.http import HttpResponse

_index_html = None

def spa_view(request):
    global _index_html
    index_path = Path(settings.BASE_DIR) / "frontend_dist" / "index.html"
    if _index_html is None:
        if index_path.exists():
            _index_html = index_path.read_text()
        else:
            _index_html = "<h1>Frontend not built</h1><p>Run npm build in frontend/</p>"
    return HttpResponse(_index_html, content_type="text/html")

urlpatterns += [
    re_path(r"^(?!api/|admin/|oidc/|static/).*$", spa_view),
]
