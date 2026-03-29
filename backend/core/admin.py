from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Role, Permission, Team


@admin.register(User)
class SushiUserAdmin(UserAdmin):
    list_display = ["username", "first_name", "last_name", "role", "is_active_employee"]
    list_filter = ["role", "is_active_employee", "qualified_teams"]
    fieldsets = UserAdmin.fieldsets + (
        ("Sushi", {
            "fields": ("role", "qualified_teams", "employee_id", "phone", "is_active_employee"),
        }),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ["name_he", "priority", "is_default"]
    filter_horizontal = ["permissions"]


@admin.register(Permission)
class PermissionAdmin(admin.ModelAdmin):
    list_display = ["codename", "label_he", "category"]
    list_filter = ["category"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["name_he", "color", "is_active", "display_order"]
