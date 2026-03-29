from django.db import models
from django.conf import settings
from core.models import Team


class Announcement(models.Model):
    """MOTD / הודעת היום — posted by team leads or managers."""

    title = models.CharField("כותרת", max_length=200)
    body = models.TextField("תוכן")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="announcements"
    )
    team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="צוות",
        help_text="Leave blank for all teams",
    )
    is_pinned = models.BooleanField("נעוץ", default=False)
    is_active = models.BooleanField("פעיל", default=True)
    expires_at = models.DateTimeField("תוקף", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_pinned", "-created_at"]
        verbose_name = "הודעה"
        verbose_name_plural = "הודעות"

    def __str__(self):
        return self.title


class Poll(models.Model):
    """Simple poll for team engagement."""

    question = models.CharField("שאלה", max_length=500)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="polls"
    )
    team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="צוות",
    )
    is_active = models.BooleanField("פעיל", default=True)
    allow_multiple = models.BooleanField("בחירה מרובה", default=False)
    expires_at = models.DateTimeField("תוקף", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "סקר"
        verbose_name_plural = "סקרים"

    def __str__(self):
        return self.question


class PollOption(models.Model):
    """An option within a poll."""

    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    text = models.CharField("תשובה", max_length=200)
    display_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["display_order"]

    def __str__(self):
        return self.text


class PollVote(models.Model):
    """A user's vote on a poll option."""

    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name="votes")
    voter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="poll_votes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["option", "voter"]
        verbose_name = "הצבעה"


class DailyTask(models.Model):
    """Daily task checklist item."""

    title = models.CharField("משימה", max_length=300)
    description = models.TextField("פירוט", blank=True)
    team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="צוות",
    )
    date = models.DateField("תאריך")
    is_recurring = models.BooleanField("משימה חוזרת", default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_tasks"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date", "created_at"]
        verbose_name = "משימה יומית"
        verbose_name_plural = "משימות יומיות"

    def __str__(self):
        return self.title


class DailyTaskCompletion(models.Model):
    """Tracks who completed a daily task."""

    task = models.ForeignKey(DailyTask, on_delete=models.CASCADE, related_name="completions")
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="completed_tasks"
    )
    completed_at = models.DateTimeField(auto_now_add=True)
    notes = models.CharField("הערות", max_length=200, blank=True)

    class Meta:
        unique_together = ["task", "completed_by"]
        verbose_name = "ביצוע משימה"
