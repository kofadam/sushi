from django.contrib import admin
from .models import MonthConfig, TeamMonthCapacity, ShiftPreference, ShiftAssignment


class TeamMonthCapacityInline(admin.TabularInline):
    model = TeamMonthCapacity
    extra = 0


@admin.register(MonthConfig)
class MonthConfigAdmin(admin.ModelAdmin):
    list_display = ["__str__", "is_open_for_submissions", "is_published"]
    inlines = [TeamMonthCapacityInline]


@admin.register(ShiftPreference)
class ShiftPreferenceAdmin(admin.ModelAdmin):
    list_display = ["employee", "date", "created_at"]
    list_filter = ["month_config", "date"]


@admin.register(ShiftAssignment)
class ShiftAssignmentAdmin(admin.ModelAdmin):
    list_display = ["employee", "date", "team", "assigned_by"]
    list_filter = ["month_config", "team", "date"]
