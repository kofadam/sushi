import json
import os
from datetime import date

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ShiftNote, HandoffSummary
from .serializers import ShiftNoteSerializer, HandoffSummarySerializer
from core.permissions import HasPermCode


class ShiftNoteViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ShiftNote.objects.select_related("author", "team")
        date_filter = self.request.query_params.get("date")
        team_filter = self.request.query_params.get("team")
        if date_filter:
            qs = qs.filter(date=date_filter)
        if team_filter:
            qs = qs.filter(team_id=team_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class HandoffSummaryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HandoffSummarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = HandoffSummary.objects.select_related("team", "compiled_by")
        date_filter = self.request.query_params.get("date")
        team_filter = self.request.query_params.get("team")
        scope_filter = self.request.query_params.get("scope")
        if date_filter:
            qs = qs.filter(date=date_filter)
        if team_filter:
            qs = qs.filter(team_id=team_filter)
        if scope_filter:
            qs = qs.filter(scope=scope_filter)
        return qs

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Generate an AI handoff summary from today's notes."""
        target_date = request.data.get("date", date.today().isoformat())
        team_id = request.data.get("team_id")  # None = daily overview
        scope = "team" if team_id else "daily"

        # Fetch notes
        notes_qs = ShiftNote.objects.filter(date=target_date).select_related("author", "team")
        if team_id:
            notes_qs = notes_qs.filter(team_id=team_id)

        notes = list(notes_qs)
        if not notes:
            return Response(
                {"error": "אין הערות לתאריך זה"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build notes text for AI
        notes_text = []
        for n in notes:
            line = f"[{n.get_category_display()}] [{n.get_severity_display()}] "
            if n.ticket_number:
                line += f"(קריאה #{n.ticket_number}) "
            line += f"{n.description} — {n.author.get_full_name()}, {n.team.name_he}"
            notes_text.append(line)

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return Response(
                {"error": "ANTHROPIC_API_KEY not configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        scope_desc = f"צוות {notes[0].team.name_he}" if team_id else "כל הצוותות"
        prompt = f"""You are a shift handoff assistant for an Israeli helpdesk team. Generate a clear, organized handoff summary in Hebrew from the following shift notes for {scope_desc}, date {target_date}.

Shift notes:
{chr(10).join(notes_text)}

Structure the summary as:
🔴 **תקלות פתוחות** — issues still open, need follow-up
🟡 **הסלמות** — escalated items
🟢 **טופלו** — resolved during the shift
⚠️ **שים לב** — things to watch, tips for next shift

Rules:
- Hebrew only
- Be concise — one line per item
- Include ticket numbers where available
- Deduplicate similar notes
- Highlight critical items first within each section
- If a section has no items, skip it
- End with a brief one-line "מצב כללי" (overall status) assessment"""

        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            message = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            summary_text = "".join(
                block.text for block in message.content if block.type == "text"
            )
        except Exception as e:
            return Response(
                {"error": f"AI error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Save summary
        from core.models import Team
        team_obj = Team.objects.filter(id=team_id).first() if team_id else None

        summary, created = HandoffSummary.objects.update_or_create(
            date=target_date,
            team=team_obj,
            scope=scope,
            defaults={
                "compiled_by": request.user,
                "summary_text": summary_text,
                "notes_count": len(notes),
            },
        )

        return Response(HandoffSummarySerializer(summary).data)
