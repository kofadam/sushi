from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import (
    Announcement, Poll, PollOption, PollVote, DailyTask, DailyTaskCompletion,
)
from .serializers import (
    AnnouncementSerializer,
    PollSerializer, PollCreateSerializer, PollVoteSerializer,
    DailyTaskSerializer,
)
from core.permissions import HasPermCode


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer

    def get_queryset(self):
        from django.db.models import Q

        now = timezone.now()
        return (
            Announcement.objects.filter(is_active=True)
            .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            .select_related("author", "team")
        )

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [HasPermCode("manage_announcements")]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class PollViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Poll.objects.filter(is_active=True).prefetch_related(
            "options__votes"
        ).select_related("author", "team")

    def get_serializer_class(self):
        if self.action == "create":
            return PollCreateSerializer
        return PollSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve", "vote"]:
            return [IsAuthenticated()]
        return [HasPermCode("manage_polls")]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        poll = self.get_object()
        ser = PollVoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        option_ids = ser.validated_data["option_ids"]

        if not poll.allow_multiple and len(option_ids) > 1:
            return Response(
                {"error": "ניתן לבחור תשובה אחת בלבד"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clear existing votes for this user on this poll
        PollVote.objects.filter(option__poll=poll, voter=request.user).delete()

        # Cast new votes
        for oid in option_ids:
            try:
                option = poll.options.get(id=oid)
            except PollOption.DoesNotExist:
                continue
            PollVote.objects.create(option=option, voter=request.user)

        return Response(PollSerializer(poll, context={"request": request}).data)


class DailyTaskViewSet(viewsets.ModelViewSet):
    serializer_class = DailyTaskSerializer

    def get_queryset(self):
        qs = DailyTask.objects.select_related("created_by", "team").prefetch_related(
            "completions__completed_by"
        )
        date_filter = self.request.query_params.get("date")
        if date_filter:
            qs = qs.filter(date=date_filter)
        team_filter = self.request.query_params.get("team")
        if team_filter:
            qs = qs.filter(team_id=team_filter)
        return qs

    def get_permissions(self):
        if self.action in ["list", "retrieve", "complete"]:
            return [IsAuthenticated()]
        return [HasPermCode("manage_tasks")]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        task = self.get_object()
        notes = request.data.get("notes", "")
        DailyTaskCompletion.objects.update_or_create(
            task=task,
            completed_by=request.user,
            defaults={"notes": notes},
        )
        return Response(
            DailyTaskSerializer(task, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def uncomplete(self, request, pk=None):
        task = self.get_object()
        DailyTaskCompletion.objects.filter(
            task=task, completed_by=request.user
        ).delete()
        return Response(
            DailyTaskSerializer(task, context={"request": request}).data
        )
