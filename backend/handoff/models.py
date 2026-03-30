from django.db import models
from django.conf import settings
from core.models import Team


class ShiftNote(models.Model):
    """
    A quick note added by a tech during their shift.
    Designed for minimal effort — tap category, type one line, done.
    """

    CATEGORY_CHOICES = [
        ("open", "תקלה פתוחה"),
        ("escalation", "הסלמה"),
        ("resolved", "טופל"),
        ("heads_up", "שים לב"),
        ("info", "מידע כללי"),
    ]

    SEVERITY_CHOICES = [
        ("low", "נמוך"),
        ("medium", "בינוני"),
        ("high", "גבוה"),
    ]

    date = models.DateField("תאריך")
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="shift_notes", verbose_name="צוות"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="shift_notes", verbose_name="כותב"
    )
    category = models.CharField("קטגוריה", max_length=20, choices=CATEGORY_CHOICES)
    severity = models.CharField("חומרה", max_length=10, choices=SEVERITY_CHOICES, default="medium")
    ticket_number = models.CharField("מספר קריאה", max_length=50, blank=True)
    description = models.TextField("תיאור", max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "הערת משמרת"
        verbose_name_plural = "הערות משמרת"

    def __str__(self):
        return f"{self.get_category_display()} — {self.description[:50]}"


class HandoffSummary(models.Model):
    """
    AI-generated handoff summary compiled from shift notes.
    Can be per-team or a combined daily overview.
    """

    SCOPE_CHOICES = [
        ("team", "צוות"),
        ("daily", "יומי"),
    ]

    date = models.DateField("תאריך")
    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, null=True, blank=True,
        related_name="handoff_summaries", verbose_name="צוות",
        help_text="Null for daily overview scope",
    )
    scope = models.CharField("סוג", max_length=10, choices=SCOPE_CHOICES)
    compiled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="compiled_summaries", verbose_name="סוכם ע״י"
    )
    summary_text = models.TextField("סיכום AI", blank=True)
    notes_count = models.IntegerField("מספר הערות", default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "team"]
        unique_together = ["date", "team", "scope"]
        verbose_name = "סיכום משמרת"
        verbose_name_plural = "סיכומי משמרות"

    def __str__(self):
        scope_label = self.team.name_he if self.team else "יומי"
        return f"סיכום {scope_label} — {self.date}"
