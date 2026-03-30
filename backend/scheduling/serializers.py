from rest_framework import serializers
from .models import MonthConfig, TeamMonthCapacity, ShiftPreference, ShiftAssignment, SpecialDay
from core.models import Team
from core.serializers import TeamSerializer


class TeamMonthCapacitySerializer(serializers.ModelSerializer):
    team_detail = TeamSerializer(source="team", read_only=True)

    class Meta:
        model = TeamMonthCapacity
        fields = ["id", "team", "team_detail", "seats_per_day"]


class MonthConfigSerializer(serializers.ModelSerializer):
    team_capacities = TeamMonthCapacitySerializer(many=True, read_only=True)

    class Meta:
        model = MonthConfig
        fields = [
            "id", "year", "month",
            "is_open_for_submissions", "is_published",
            "notes", "team_capacities",
            "created_at", "updated_at",
        ]


class MonthConfigCreateSerializer(serializers.ModelSerializer):
    team_seats = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=False,
        help_text="List of {team_id, seats_per_day}"
    )

    class Meta:
        model = MonthConfig
        fields = ["year", "month", "notes", "is_open_for_submissions", "team_seats"]

    def create(self, validated_data):
        team_seats = validated_data.pop("team_seats", [])
        config = MonthConfig.objects.create(
            created_by=self.context["request"].user,
            **validated_data,
        )
        for ts in team_seats:
            TeamMonthCapacity.objects.create(
                month_config=config,
                team_id=ts["team_id"],
                seats_per_day=ts["seats_per_day"],
            )
        return config


class ShiftPreferenceSerializer(serializers.ModelSerializer):
    preferred_team_ids = serializers.PrimaryKeyRelatedField(
        source="preferred_teams", many=True,
        queryset=Team.objects.all(),
        required=False,
    )
    employee_name = serializers.CharField(source="employee.get_full_name", read_only=True)

    class Meta:
        model = ShiftPreference
        fields = [
            "id", "employee", "employee_name",
            "date", "preferred_team_ids", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["employee"]


class BulkPreferenceSerializer(serializers.Serializer):
    """Submit preferences for multiple dates at once."""
    month_config_id = serializers.IntegerField()
    preferences = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {date, preferred_team_ids: [], notes: ''}"
    )


class ShiftAssignmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.get_full_name", read_only=True)
    team_detail = TeamSerializer(source="team", read_only=True)

    class Meta:
        model = ShiftAssignment
        fields = [
            "id", "employee", "employee_name",
            "date", "team", "team_detail",
            "assigned_by", "created_at", "updated_at",
        ]
        read_only_fields = ["assigned_by"]


class BulkAssignmentSerializer(serializers.Serializer):
    """Assign multiple employees at once."""
    month_config_id = serializers.IntegerField()
    assignments = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {employee_id, date, team_id}"
    )


class SpecialDaySerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True, default="")
    day_type_display = serializers.CharField(source="get_day_type_display", read_only=True)

    class Meta:
        model = SpecialDay
        fields = [
            "id", "date", "day_type", "day_type_display",
            "note", "end_time", "capacity_percent",
            "created_by", "created_by_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_by"]
