import calendar
from datetime import date
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from .models import MonthConfig, TeamMonthCapacity, ShiftPreference, ShiftAssignment, SpecialDay
from .serializers import (
    MonthConfigSerializer, MonthConfigCreateSerializer,
    TeamMonthCapacitySerializer,
    ShiftPreferenceSerializer, BulkPreferenceSerializer,
    ShiftAssignmentSerializer, BulkAssignmentSerializer,
    SpecialDaySerializer,
)
from core.models import Team, User
from core.permissions import HasPermCode, IsManager


class MonthConfigViewSet(viewsets.ModelViewSet):
    queryset = MonthConfig.objects.prefetch_related("team_capacities__team").all()

    def get_serializer_class(self):
        if self.action in ["create", "partial_update", "update"]:
            return MonthConfigCreateSerializer
        return MonthConfigSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [HasPermCode("manage_schedule")]

    @action(detail=True, methods=["patch"])
    def set_capacities(self, request, pk=None):
        """Set team capacities for a month. Expects: [{team_id, seats_per_day}]"""
        config = self.get_object()
        team_seats = request.data.get("team_seats", [])
        for ts in team_seats:
            TeamMonthCapacity.objects.update_or_create(
                month_config=config,
                team_id=ts["team_id"],
                defaults={"seats_per_day": ts["seats_per_day"]},
            )
        config.refresh_from_db()
        return Response(MonthConfigSerializer(config).data)

    @action(detail=True, methods=["get"])
    def working_days(self, request, pk=None):
        """Return list of working days (Sun-Thu) for this month."""
        config = self.get_object()
        days = []
        num_days = calendar.monthrange(config.year, config.month)[1]
        for day in range(1, num_days + 1):
            d = date(config.year, config.month, day)
            # Sunday=6, Monday=0, ..., Thursday=3 in Python
            # We need Sun-Thu: weekday() 6,0,1,2,3
            if d.weekday() in (6, 0, 1, 2, 3):
                days.append(d.isoformat())
        return Response({"working_days": days})

    @action(detail=True, methods=["get"])
    def dashboard(self, request, pk=None):
        """
        Manager dashboard data for a month:
        - Per day per team: how many assigned vs capacity
        - Per day: who submitted preferences, who's assigned
        """
        config = self.get_object()
        num_days = calendar.monthrange(config.year, config.month)[1]

        capacities = {
            tc.team_id: tc.seats_per_day
            for tc in config.team_capacities.all()
        }

        teams = list(Team.objects.filter(is_active=True).values("id", "name_he", "color"))
        working_days = []
        for day in range(1, num_days + 1):
            d = date(config.year, config.month, day)
            if d.weekday() in (6, 0, 1, 2, 3):
                working_days.append(d.isoformat())

        # Preferences grouped by date
        preferences = (
            ShiftPreference.objects
            .filter(month_config=config)
            .select_related("employee")
            .prefetch_related("preferred_teams", "employee__qualified_teams")
        )
        prefs_by_date = {}
        for pref in preferences:
            ds = pref.date.isoformat()
            if ds not in prefs_by_date:
                prefs_by_date[ds] = []
            prefs_by_date[ds].append({
                "employee_id": pref.employee_id,
                "employee_name": pref.employee.get_full_name(),
                "preferred_team_ids": list(pref.preferred_teams.values_list("id", flat=True)),
                "qualified_team_ids": list(pref.employee.qualified_teams.values_list("id", flat=True)),
                "notes": pref.notes,
            })

        # Assignments grouped by date
        assignments = (
            ShiftAssignment.objects
            .filter(month_config=config)
            .select_related("employee", "team")
        )
        assigns_by_date = {}
        for a in assignments:
            ds = a.date.isoformat()
            if ds not in assigns_by_date:
                assigns_by_date[ds] = []
            assigns_by_date[ds].append({
                "id": a.id,
                "employee_id": a.employee_id,
                "employee_name": a.employee.get_full_name(),
                "team_id": a.team_id,
                "team_name": a.team.name_he,
            })

        # Special days for this month
        special_days = {}
        for sd in SpecialDay.objects.filter(
            date__year=config.year, date__month=config.month
        ):
            special_days[sd.date.isoformat()] = {
                "id": sd.id,
                "day_type": sd.day_type,
                "day_type_display": sd.get_day_type_display(),
                "note": sd.note,
                "end_time": sd.end_time.strftime("%H:%M") if sd.end_time else None,
                "capacity_percent": sd.capacity_percent,
            }

        return Response({
            "month_config": MonthConfigSerializer(config).data,
            "teams": teams,
            "capacities": capacities,
            "working_days": working_days,
            "preferences_by_date": prefs_by_date,
            "assignments_by_date": assigns_by_date,
            "special_days": special_days,
        })

    @action(detail=True, methods=["get"])
    def reports(self, request, pk=None):
        """
        Aggregated report data for a month:
        - Per day per team: requests, assigned, capacity, fill rate
        - Alerts for understaffed days
        - Request vs capacity comparison
        - Techs who haven't submitted preferences
        """
        config = self.get_object()
        num_days = calendar.monthrange(config.year, config.month)[1]

        capacities = {
            tc.team_id: tc.seats_per_day
            for tc in config.team_capacities.all()
        }

        teams_qs = Team.objects.filter(is_active=True)
        teams = list(teams_qs.values("id", "name_he", "color"))

        # Working days (Sun-Thu)
        working_days = []
        for day in range(1, num_days + 1):
            d = date(config.year, config.month, day)
            if d.weekday() in (6, 0, 1, 2, 3):
                working_days.append(d.isoformat())

        # Special days
        special_days_map = {}
        for sd in SpecialDay.objects.filter(
            date__year=config.year, date__month=config.month
        ):
            special_days_map[sd.date.isoformat()] = {
                "day_type": sd.day_type,
                "note": sd.note,
                "capacity_percent": sd.capacity_percent,
            }

        # Preferences
        preferences = (
            ShiftPreference.objects
            .filter(month_config=config)
            .select_related("employee")
            .prefetch_related("preferred_teams")
        )
        prefs_by_date = {}
        prefs_by_team_date = {}
        all_requesters = set()
        for pref in preferences:
            ds = pref.date.isoformat()
            all_requesters.add(pref.employee_id)
            if ds not in prefs_by_date:
                prefs_by_date[ds] = 0
            prefs_by_date[ds] += 1
            for t in pref.preferred_teams.all():
                key = f"{ds}_{t.id}"
                prefs_by_team_date[key] = prefs_by_team_date.get(key, 0) + 1

        # Assignments
        assignments = (
            ShiftAssignment.objects
            .filter(month_config=config)
            .select_related("team")
        )
        assigns_by_date = {}
        assigns_by_team_date = {}
        for a in assignments:
            ds = a.date.isoformat()
            if ds not in assigns_by_date:
                assigns_by_date[ds] = 0
            assigns_by_date[ds] += 1
            key = f"{ds}_{a.team_id}"
            assigns_by_team_date[key] = assigns_by_team_date.get(key, 0) + 1

        # Build daily coverage data
        daily_coverage = []
        alerts = []
        total_capacity = sum(capacities.values())

        for ds in working_days:
            sd = special_days_map.get(ds)
            if sd and sd["day_type"] == "off":
                continue

            cap_modifier = 1.0
            if sd and sd["day_type"] == "reduced":
                cap_modifier = sd["capacity_percent"] / 100.0

            day_data = {
                "date": ds,
                "special": sd,
                "total_requests": prefs_by_date.get(ds, 0),
                "total_assigned": assigns_by_date.get(ds, 0),
                "total_capacity": int(total_capacity * cap_modifier),
                "teams": [],
            }

            for t in teams:
                tid = t["id"]
                key = f"{ds}_{tid}"
                cap = int((capacities.get(tid, 0)) * cap_modifier)
                assigned = assigns_by_team_date.get(key, 0)
                requested = prefs_by_team_date.get(key, 0)
                fill_pct = round(assigned / cap * 100) if cap > 0 else 0

                day_data["teams"].append({
                    "team_id": tid,
                    "team_name": t["name_he"],
                    "color": t["color"],
                    "capacity": cap,
                    "assigned": assigned,
                    "requested": requested,
                    "fill_percent": fill_pct,
                })

                # Alerts
                if cap > 0 and assigned == 0 and ds >= date.today().isoformat():
                    alerts.append({
                        "type": "no_coverage",
                        "severity": "high",
                        "date": ds,
                        "team": t["name_he"],
                        "message": f"{t['name_he']} ביום {ds} — 0 משובצים מתוך {cap}",
                    })
                elif cap > 0 and fill_pct < 50 and ds >= date.today().isoformat():
                    alerts.append({
                        "type": "low_coverage",
                        "severity": "medium",
                        "date": ds,
                        "team": t["name_he"],
                        "message": f"{t['name_he']} ביום {ds} — {assigned}/{cap} ({fill_pct}%)",
                    })

            daily_coverage.append(day_data)

        # Request vs capacity per team (aggregate for the month)
        team_summary = []
        for t in teams:
            tid = t["id"]
            total_req = sum(
                prefs_by_team_date.get(f"{ds}_{tid}", 0) for ds in working_days
            )
            total_assign = sum(
                assigns_by_team_date.get(f"{ds}_{tid}", 0) for ds in working_days
            )
            total_cap = (capacities.get(tid, 0)) * len(working_days)
            team_summary.append({
                "team_id": tid,
                "team_name": t["name_he"],
                "color": t["color"],
                "total_requests": total_req,
                "total_assigned": total_assign,
                "total_capacity": total_cap,
                "fill_percent": round(total_assign / total_cap * 100) if total_cap > 0 else 0,
            })

        # Techs who haven't submitted preferences
        from core.models import User
        active_techs = User.objects.filter(
            is_active=True, is_active_employee=True
        ).exclude(role__permissions__codename="manage_schedule")
        missing_prefs = []
        for tech in active_techs:
            if tech.id not in all_requesters:
                missing_prefs.append({
                    "id": tech.id,
                    "name": tech.get_full_name(),
                })

        return Response({
            "month_config": MonthConfigSerializer(config).data,
            "teams": teams,
            "daily_coverage": daily_coverage,
            "alerts": sorted(alerts, key=lambda a: (a["date"], a["severity"])),
            "team_summary": team_summary,
            "missing_preferences": missing_prefs,
            "total_working_days": len([d for d in working_days if d not in special_days_map or special_days_map[d]["day_type"] != "off"]),
        })


class ShiftPreferenceViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftPreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ShiftPreference.objects.select_related("employee").prefetch_related("preferred_teams")
        # Managers/those with view_preferences perm see all; others see only their own
        if user.has_perm_code("view_all_preferences"):
            month_id = self.request.query_params.get("month_config")
            if month_id:
                qs = qs.filter(month_config_id=month_id)
            return qs
        return qs.filter(employee=user)

    def perform_create(self, serializer):
        serializer.save(employee=self.request.user)

    @action(detail=False, methods=["post"])
    def bulk_submit(self, request):
        """Submit preferences for multiple dates at once."""
        ser = BulkPreferenceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        config_id = ser.validated_data["month_config_id"]
        try:
            config = MonthConfig.objects.get(id=config_id, is_open_for_submissions=True)
        except MonthConfig.DoesNotExist:
            return Response(
                {"error": "החודש לא פתוח להגשת בקשות"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created = []
        for pref_data in ser.validated_data["preferences"]:
            pref, _ = ShiftPreference.objects.update_or_create(
                employee=request.user,
                month_config=config,
                date=pref_data["date"],
                defaults={"notes": pref_data.get("notes", "")},
            )
            team_ids = pref_data.get("preferred_team_ids", [])
            if team_ids:
                pref.preferred_teams.set(team_ids)
            created.append(pref)

        return Response(
            ShiftPreferenceSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["delete"])
    def clear_month(self, request):
        """Clear all of current user's preferences for a month."""
        month_id = request.query_params.get("month_config")
        if not month_id:
            return Response({"error": "month_config is required"}, status=400)
        deleted, _ = ShiftPreference.objects.filter(
            employee=request.user, month_config_id=month_id
        ).delete()
        return Response({"deleted": deleted})


class ShiftAssignmentViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftAssignmentSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "my_schedule"]:
            return [IsAuthenticated()]
        return [HasPermCode("manage_schedule")]

    def get_queryset(self):
        user = self.request.user
        qs = ShiftAssignment.objects.select_related("employee", "team")
        month_id = self.request.query_params.get("month_config")
        if month_id:
            qs = qs.filter(month_config_id=month_id)
        date_filter = self.request.query_params.get("date")
        if date_filter:
            qs = qs.filter(date=date_filter)
        # Non-managers see only their own unless published
        if not user.has_perm_code("manage_schedule"):
            qs = qs.filter(
                Q(employee=user) | Q(month_config__is_published=True)
            )
        return qs

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)

    @action(detail=False, methods=["post"])
    def bulk_assign(self, request):
        """Assign multiple employees to shifts at once."""
        ser = BulkAssignmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        config_id = ser.validated_data["month_config_id"]
        try:
            config = MonthConfig.objects.get(id=config_id)
        except MonthConfig.DoesNotExist:
            return Response({"error": "חודש לא נמצא"}, status=404)

        created = []
        for a_data in ser.validated_data["assignments"]:
            assignment, _ = ShiftAssignment.objects.update_or_create(
                employee_id=a_data["employee_id"],
                month_config=config,
                date=a_data["date"],
                defaults={
                    "team_id": a_data["team_id"],
                    "assigned_by": request.user,
                },
            )
            created.append(assignment)

        return Response(
            ShiftAssignmentSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"])
    def my_schedule(self, request):
        """Get current user's assignments."""
        month_id = request.query_params.get("month_config")
        qs = ShiftAssignment.objects.filter(employee=request.user).select_related("team")
        if month_id:
            qs = qs.filter(month_config_id=month_id)
        return Response(ShiftAssignmentSerializer(qs, many=True).data)

class SpecialDayViewSet(viewsets.ModelViewSet):
    """Manage special days — holidays, half days, reduced capacity."""
    serializer_class = SpecialDaySerializer
    queryset = SpecialDay.objects.all()

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [HasPermCode("manage_schedule")]

    def get_queryset(self):
        qs = SpecialDay.objects.select_related("created_by")
        # Optional date range filter
        year = self.request.query_params.get("year")
        month = self.request.query_params.get("month")
        if year and month:
            qs = qs.filter(date__year=year, date__month=month)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
