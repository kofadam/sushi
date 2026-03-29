from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import User, Role, Permission, Team
from .serializers import (
    UserListSerializer, UserDetailSerializer, MeSerializer,
    RoleSerializer, PermissionSerializer, TeamSerializer,
)
from .permissions import IsManager


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return current user's profile with permissions."""
    serializer = MeSerializer(request.user)
    return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.filter(is_active=True).select_related("role").prefetch_related("qualified_teams")
    permission_classes = [IsManager]

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        return UserDetailSerializer

    @action(detail=True, methods=["patch"])
    def set_role(self, request, pk=None):
        user = self.get_object()
        role_id = request.data.get("role_id")
        try:
            role = Role.objects.get(id=role_id)
        except Role.DoesNotExist:
            return Response({"error": "תפקיד לא נמצא"}, status=status.HTTP_404_NOT_FOUND)
        user.role = role
        user.save(update_fields=["role"])
        return Response(UserDetailSerializer(user).data)

    @action(detail=True, methods=["patch"])
    def set_teams(self, request, pk=None):
        user = self.get_object()
        team_ids = request.data.get("team_ids", [])
        teams = Team.objects.filter(id__in=team_ids, is_active=True)
        user.qualified_teams.set(teams)
        return Response(UserDetailSerializer(user).data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.prefetch_related("permissions").all()
    serializer_class = RoleSerializer
    permission_classes = [IsManager]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsManager()]
