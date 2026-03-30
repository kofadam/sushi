from django.db import models
from django.conf import settings
from core.models import Team


class MonthConfig(models.Model):
    """
    Configuration for a specific month's scheduling.
    Manager sets seat counts per team and controls submission window.
    """

    year = models.IntegerField("שנה")
    month = models.IntegerField("חודש")  # 1-12

    is_open_for_submissions = models.BooleanField("פתוח להגשת בקשות", default=False)
    is_published = models.BooleanField("לוח פורסם", default=False)

    notes = models.TextField("הערות", blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="created_month_configs"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["year", "month"]
        ordering = ["-year", "-month"]
        verbose_name = "תצורת חודש"
        verbose_name_plural = "תצורות חודשים"

    def __str__(self):
        return f"{self.month:02d}/{self.year}"


class TeamMonthCapacity(models.Model):
    """How many seats a team has per day for a given month."""

    month_config = models.ForeignKey(
        MonthConfig, on_delete=models.CASCADE, related_name="team_capacities"
    )
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    seats_per_day = models.IntegerField("מקומות ליום", default=10)

    class Meta:
        unique_together = ["month_config", "team"]
        verbose_name = "קיבולת צוות לחודש"

    def __str__(self):
        return f"{self.team.name_he} - {self.seats_per_day} מקומות"


class ShiftPreference(models.Model):
    """
    A tech's preference for a specific date.
    They mark which days they're available and optionally which team they prefer.
    """

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shift_preferences"
    )
    month_config = models.ForeignKey(
        MonthConfig, on_delete=models.CASCADE, related_name="preferences"
    )
    date = models.DateField("תאריך")
    preferred_teams = models.ManyToManyField(
        Team, blank=True, related_name="preferred_by",
        verbose_name="צוותות מועדפים",
    )
    notes = models.CharField("הערות", max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["employee", "date"]
        ordering = ["date"]
        verbose_name = "בקשת משמרת"
        verbose_name_plural = "בקשות משמרות"

    def __str__(self):
        return f"{self.employee} - {self.date}"


class ShiftAssignment(models.Model):
    """
    Final assignment: employee is assigned to a specific team on a specific date.
    Created by the manager (or auto-assign in future).
    """

    employee = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shift_assignments"
    )
    month_config = models.ForeignKey(
        MonthConfig, on_delete=models.CASCADE, related_name="assignments"
    )
    date = models.DateField("תאריך")
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="assignments_made"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["employee", "date"]
        ordering = ["date", "team"]
        verbose_name = "שיבוץ"
        verbose_name_plural = "שיבוצים"

    def __str__(self):
        return f"{self.employee} → {self.team.name_he} ({self.date})"


class SpecialDay(models.Model):
    """
    A day with special scheduling rules — holiday, half day, or reduced capacity.
    Managed by the manager via the Special Days page.
    """

    DAY_TYPES = [
        ("off", "יום חופש"),
        ("half", "חצי יום"),
        ("reduced", "קיבולת מופחתת"),
    ]

    date = models.DateField("תאריך", unique=True)
    day_type = models.CharField("סוג", max_length=10, choices=DAY_TYPES)
    note = models.CharField("הערה", max_length=300, blank=True, help_text="סיבה או תיאור")
    end_time = models.TimeField(
        "שעת סיום", null=True, blank=True,
        help_text="לחצי יום — שעת סיום העבודה (למשל 13:00)",
    )
    capacity_percent = models.IntegerField(
        "אחוז קיבולת", default=100,
        help_text="100 = רגיל, 50 = חצי מהמקומות, 0 = סגור",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="created_special_days",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["date"]
        verbose_name = "יום מיוחד"
        verbose_name_plural = "ימים מיוחדים"

    def __str__(self):
        return f"{self.get_day_type_display()} — {self.date} ({self.note})"
