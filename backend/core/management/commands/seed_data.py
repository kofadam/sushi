from django.core.management.base import BaseCommand
from core.models import Permission, Role, Team, User


PERMISSIONS = [
    # Scheduling
    ("manage_schedule", "ניהול משמרות", "ניהול לוח משמרות — שיבוץ עובדים", "scheduling"),
    ("view_all_preferences", "צפייה בבקשות כולם", "צפייה בבקשות משמרות של כל העובדים", "scheduling"),
    # Portal
    ("manage_announcements", "ניהול הודעות", "פרסום ועריכת הודעות היום", "portal"),
    ("manage_polls", "ניהול סקרים", "יצירה וניהול סקרים", "portal"),
    ("manage_tasks", "ניהול משימות", "יצירה וניהול משימות יומיות", "portal"),
    # Admin
    ("manage_all", "ניהול מערכת", "גישה מלאה לכל הגדרות המערכת", "admin"),
    ("manage_users", "ניהול משתמשים", "ניהול עובדים — תפקידים, צוותות, הרשאות", "admin"),
    ("manage_roles", "ניהול תפקידים", "עריכת תפקידים והרשאות", "admin"),
]

ROLES = [
    ("manager", "מנהלת", "ניהול מלא של המערכת", True, 100, "__all__"),
    ("team_lead", "אחראי משמרת", "ניהול יומי — הודעות, סקרים, משימות", False, 75,
     ["manage_announcements", "manage_polls", "manage_tasks", "view_all_preferences"]),
    ("senior_tech", "טכנאי בכיר", "טכנאי עם הרשאות מורחבות", False, 50,
     ["manage_tasks", "view_all_preferences"]),
    ("tech", "טכנאי", "טכנאי תמיכה", True, 25, []),
]

TEAMS = [
    ("cell_phone", "תמיכת סלולר", "תמיכה טכנית במכשירים סלולריים", "#3B82F6", 1),
    ("network", "תמיכת רשת", "תמיכה טכנית ברשתות תקשורת", "#10B981", 2),
    ("os", "תמיכת מערכות הפעלה", "תמיכה טכנית במערכות הפעלה", "#F59E0B", 3),
]


class Command(BaseCommand):
    help = "Seed default permissions, roles, teams, and demo users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-demo-users",
            action="store_true",
            help="Also create demo users for development",
        )

    def handle(self, *args, **options):
        self.stdout.write("Seeding permissions...")
        perm_objects = {}
        for codename, label, desc, category in PERMISSIONS:
            perm, created = Permission.objects.update_or_create(
                codename=codename,
                defaults={"label_he": label, "description_he": desc, "category": category},
            )
            perm_objects[codename] = perm
            status = "created" if created else "updated"
            self.stdout.write(f"  {status}: {codename} ({label})")

        self.stdout.write("\nSeeding roles...")
        for name, name_he, desc, is_default, priority, perms in ROLES:
            role, created = Role.objects.update_or_create(
                name=name,
                defaults={
                    "name_he": name_he,
                    "description_he": desc,
                    "is_default": is_default,
                    "priority": priority,
                },
            )
            if perms == "__all__":
                role.permissions.set(perm_objects.values())
            else:
                role.permissions.set([perm_objects[p] for p in perms])
            status = "created" if created else "updated"
            self.stdout.write(f"  {status}: {name} ({name_he})")

        self.stdout.write("\nSeeding teams...")
        team_objects = {}
        for name, name_he, desc, color, order in TEAMS:
            team, created = Team.objects.update_or_create(
                name=name,
                defaults={
                    "name_he": name_he,
                    "description_he": desc,
                    "color": color,
                    "display_order": order,
                },
            )
            team_objects[name] = team
            status = "created" if created else "updated"
            self.stdout.write(f"  {status}: {name} ({name_he})")

        if options["with_demo_users"]:
            self.stdout.write("\nCreating demo users...")
            manager_role = Role.objects.get(name="manager")
            tl_role = Role.objects.get(name="team_lead")
            senior_role = Role.objects.get(name="senior_tech")
            tech_role = Role.objects.get(name="tech")

            demo_users = [
                ("manager1", "שרה", "כהן", manager_role, ["cell_phone", "network", "os"]),
                ("teamlead1", "דוד", "לוי", tl_role, ["cell_phone", "network", "os"]),
                ("senior1", "יוסי", "מזרחי", senior_role, ["cell_phone", "network"]),
                ("tech1", "רונית", "אברהם", tech_role, ["cell_phone"]),
                ("tech2", "עמית", "פרץ", tech_role, ["network"]),
                ("tech3", "מיכל", "גולן", tech_role, ["os"]),
                ("tech4", "אורי", "שלום", tech_role, ["cell_phone", "network", "os"]),
            ]

            for username, first, last, role, teams in demo_users:
                user, created = User.objects.update_or_create(
                    username=username,
                    defaults={
                        "first_name": first,
                        "last_name": last,
                        "email": f"{username}@demo.local",
                        "role": role,
                        "is_active_employee": True,
                    },
                )
                if created:
                    user.set_password("demo1234")
                    user.save()
                user.qualified_teams.set([team_objects[t] for t in teams])
                status = "created" if created else "updated"
                self.stdout.write(f"  {status}: {username} ({first} {last}) — {role.name_he}")

        self.stdout.write(self.style.SUCCESS("\nSeed complete!"))
