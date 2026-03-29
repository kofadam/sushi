from django.contrib.auth.models import AbstractUser
from django.db import models


class Permission(models.Model):
    """
    Modular permission that can be assigned to roles.
    Managed in-app by the manager via a friendly UI.
    """

    codename = models.CharField(max_length=100, unique=True)
    label_he = models.CharField("שם ההרשאה", max_length=200)
    description_he = models.CharField("תיאור", max_length=500, blank=True)
    category = models.CharField(
        max_length=50,
        choices=[
            ("scheduling", "משמרות"),
            ("portal", "פורטל"),
            ("admin", "ניהול"),
        ],
        default="portal",
    )

    class Meta:
        ordering = ["category", "codename"]
        verbose_name = "הרשאה"
        verbose_name_plural = "הרשאות"

    def __str__(self):
        return self.label_he


class Role(models.Model):
    """
    App-level role with modular permissions.
    Defaults: מנהלת, אחראי משמרת, טכנאי בכיר, טכנאי
    """

    name = models.CharField("שם התפקיד", max_length=100, unique=True)
    name_he = models.CharField("שם בעברית", max_length=100)
    description_he = models.CharField("תיאור", max_length=500, blank=True)
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")
    is_default = models.BooleanField(
        default=False,
        help_text="Role assigned to new users if no OIDC group matches",
    )
    priority = models.IntegerField(
        default=0, help_text="Higher = more senior. Used for display ordering."
    )

    class Meta:
        ordering = ["-priority"]
        verbose_name = "תפקיד"
        verbose_name_plural = "תפקידים"

    def __str__(self):
        return self.name_he


class Team(models.Model):
    """Support team (e.g., Cell Phone, Network, OS)."""

    name = models.CharField("שם הצוות", max_length=100, unique=True)
    name_he = models.CharField("שם בעברית", max_length=100)
    description_he = models.CharField("תיאור", max_length=500, blank=True)
    color = models.CharField(
        "צבע", max_length=7, default="#3B82F6", help_text="Hex color for UI"
    )
    is_active = models.BooleanField("פעיל", default=True)
    display_order = models.IntegerField("סדר תצוגה", default=0)

    class Meta:
        ordering = ["display_order"]
        verbose_name = "צוות"
        verbose_name_plural = "צוותות"

    def __str__(self):
        return self.name_he


class User(AbstractUser):
    """
    Extended user model for Sushi.
    Links to Role (in-app, overridable) and qualified Teams.
    """

    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        verbose_name="תפקיד",
    )
    qualified_teams = models.ManyToManyField(
        Team, blank=True, related_name="qualified_employees", verbose_name="צוותות מוסמכים"
    )
    employee_id = models.CharField("מספר עובד", max_length=50, blank=True)
    phone = models.CharField("טלפון", max_length=20, blank=True)
    is_active_employee = models.BooleanField("עובד פעיל", default=True)

    # OIDC-sourced role (from group claim) — for reference / initial mapping
    oidc_role_source = models.CharField(
        max_length=100,
        blank=True,
        help_text="OIDC group that initially determined this user's role",
    )

    class Meta:
        verbose_name = "משתמש"
        verbose_name_plural = "משתמשים"
        ordering = ["first_name", "last_name"]

    def __str__(self):
        return self.get_full_name() or self.username

    def has_perm_code(self, codename: str) -> bool:
        """Check if user's role grants a specific permission codename."""
        if not self.role:
            return False
        return self.role.permissions.filter(codename=codename).exists()
