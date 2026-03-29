from rest_framework import serializers
from .models import User, Role, Permission, Team


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "codename", "label_he", "description_he", "category"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Permission.objects.all()
    )
    permission_details = PermissionSerializer(source="permissions", many=True, read_only=True)

    class Meta:
        model = Role
        fields = [
            "id", "name", "name_he", "description_he",
            "permissions", "permission_details",
            "is_default", "priority",
        ]


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "name_he", "description_he", "color", "is_active", "display_order"]


class UserListSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name_he", read_only=True, default=None)
    qualified_team_ids = serializers.PrimaryKeyRelatedField(
        source="qualified_teams", many=True, queryset=Team.objects.all()
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "employee_id", "phone", "role", "role_name",
            "qualified_team_ids", "is_active_employee",
        ]


class UserDetailSerializer(serializers.ModelSerializer):
    role_detail = RoleSerializer(source="role", read_only=True)
    qualified_teams_detail = TeamSerializer(source="qualified_teams", many=True, read_only=True)
    qualified_team_ids = serializers.PrimaryKeyRelatedField(
        source="qualified_teams", many=True, queryset=Team.objects.all()
    )
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "employee_id", "phone", "role", "role_detail",
            "qualified_teams_detail", "qualified_team_ids",
            "is_active_employee", "permissions",
        ]

    def get_permissions(self, obj):
        if not obj.role:
            return []
        return list(obj.role.permissions.values_list("codename", flat=True))


class MeSerializer(serializers.ModelSerializer):
    """Serializer for the current user's own profile."""
    role_detail = RoleSerializer(source="role", read_only=True)
    qualified_teams_detail = TeamSerializer(source="qualified_teams", many=True, read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "email",
            "employee_id", "phone", "role_detail",
            "qualified_teams_detail", "permissions",
        ]

    def get_permissions(self, obj):
        if not obj.role:
            return []
        return list(obj.role.permissions.values_list("codename", flat=True))
