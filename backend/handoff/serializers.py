from rest_framework import serializers
from .models import ShiftNote, HandoffSummary


class ShiftNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    team_name = serializers.CharField(source="team.name_he", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    severity_display = serializers.CharField(source="get_severity_display", read_only=True)

    class Meta:
        model = ShiftNote
        fields = [
            "id", "date", "team", "team_name",
            "author", "author_name",
            "category", "category_display",
            "severity", "severity_display",
            "ticket_number", "description",
            "created_at",
        ]
        read_only_fields = ["author"]


class HandoffSummarySerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name_he", read_only=True, default="כל הצוותות")
    compiled_by_name = serializers.CharField(source="compiled_by.get_full_name", read_only=True, default="")

    class Meta:
        model = HandoffSummary
        fields = [
            "id", "date", "team", "team_name",
            "scope", "compiled_by", "compiled_by_name",
            "summary_text", "notes_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["compiled_by", "summary_text", "notes_count"]
