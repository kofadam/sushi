from django.contrib import admin
from .models import Announcement, Poll, PollOption, PollVote, DailyTask, DailyTaskCompletion


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 2


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "team", "is_pinned", "is_active", "created_at"]


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ["question", "author", "is_active", "created_at"]
    inlines = [PollOptionInline]


@admin.register(DailyTask)
class DailyTaskAdmin(admin.ModelAdmin):
    list_display = ["title", "team", "date", "created_by"]
    list_filter = ["team", "date"]
