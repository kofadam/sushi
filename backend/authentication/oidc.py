import logging
from django.conf import settings
from mozilla_django_oidc.auth import OIDCAuthenticationBackend
from core.models import Role

logger = logging.getLogger(__name__)


class SushiOIDCBackend(OIDCAuthenticationBackend):
    """
    Custom OIDC backend that:
    1. Creates/updates users from OIDC claims
    2. Maps OIDC group claims to in-app roles (initial assignment only)
    3. Respects in-app role overrides (if role was changed by manager, don't revert)
    """

    def create_user(self, claims):
        user = super().create_user(claims)
        self._update_user_from_claims(user, claims, is_new=True)
        return user

    def update_user(self, user, claims):
        self._update_user_from_claims(user, claims, is_new=False)
        return user

    def _update_user_from_claims(self, user, claims, is_new=False):
        user.first_name = claims.get("given_name", "")
        user.last_name = claims.get("family_name", "")
        user.email = claims.get("email", user.email)

        # Map OIDC groups to role only if:
        # - User is new, OR
        # - User's current role was originally set by OIDC (not overridden in-app)
        groups = claims.get(settings.OIDC_GROUPS_CLAIM, [])
        oidc_role = self._resolve_role_from_groups(groups)

        if is_new:
            user.role = oidc_role
            user.oidc_role_source = oidc_role.name if oidc_role else ""
        elif user.oidc_role_source and oidc_role:
            # Only update if the current role matches the OIDC-sourced role
            # (meaning manager hasn't overridden it)
            try:
                current_oidc_role = Role.objects.get(name=user.oidc_role_source)
                if user.role == current_oidc_role:
                    user.role = oidc_role
                    user.oidc_role_source = oidc_role.name
            except Role.DoesNotExist:
                pass

        user.save()

    def _resolve_role_from_groups(self, groups):
        """Map OIDC groups to the highest-priority matching role."""
        group_to_role = {
            settings.OIDC_MANAGER_GROUP: "manager",
            settings.OIDC_TEAM_LEAD_GROUP: "team_lead",
            settings.OIDC_SENIOR_TECH_GROUP: "senior_tech",
        }

        matched_roles = []
        for group in groups:
            role_name = group_to_role.get(group)
            if role_name:
                try:
                    matched_roles.append(Role.objects.get(name=role_name))
                except Role.DoesNotExist:
                    logger.warning(f"OIDC group '{group}' mapped to role '{role_name}' but role not found in DB")

        if matched_roles:
            return max(matched_roles, key=lambda r: r.priority)

        # Default role for users with no matching group
        return Role.objects.filter(is_default=True).first()
