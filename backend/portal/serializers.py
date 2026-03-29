from rest_framework import serializers
from .models import (
    Announcement, Poll, PollOption, PollVote, DailyTask, DailyTaskCompletion,
)


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id", "title", "body", "author", "author_name",
            "team", "is_pinned", "is_active", "expires_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["author"]


class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ["id", "text", "display_order", "vote_count"]

    def get_vote_count(self, obj):
        return obj.votes.count()


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    my_votes = serializers.SerializerMethodField()
    total_voters = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = [
            "id", "question", "author", "author_name",
            "team", "is_active", "allow_multiple", "expires_at",
            "options", "my_votes", "total_voters", "created_at",
        ]
        read_only_fields = ["author"]

    def get_my_votes(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []
        return list(
            PollVote.objects.filter(
                option__poll=obj, voter=request.user
            ).values_list("option_id", flat=True)
        )

    def get_total_voters(self, obj):
        return (
            PollVote.objects.filter(option__poll=obj)
            .values("voter").distinct().count()
        )


class PollCreateSerializer(serializers.ModelSerializer):
    options = serializers.ListField(
        child=serializers.CharField(max_length=200),
        write_only=True, min_length=2,
    )

    class Meta:
        model = Poll
        fields = ["question", "team", "allow_multiple", "expires_at", "options"]

    def create(self, validated_data):
        option_texts = validated_data.pop("options")
        poll = Poll.objects.create(
            author=self.context["request"].user,
            **validated_data,
        )
        for i, text in enumerate(option_texts):
            PollOption.objects.create(poll=poll, text=text, display_order=i)
        return poll


class PollVoteSerializer(serializers.Serializer):
    option_ids = serializers.ListField(child=serializers.IntegerField())


class DailyTaskCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.CharField(
        source="completed_by.get_full_name", read_only=True
    )

    class Meta:
        model = DailyTaskCompletion
        fields = ["id", "completed_by", "completed_by_name", "completed_at", "notes"]
        read_only_fields = ["completed_by"]


class DailyTaskSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    completions = DailyTaskCompletionSerializer(many=True, read_only=True)
    is_completed_by_me = serializers.SerializerMethodField()

    class Meta:
        model = DailyTask
        fields = [
            "id", "title", "description", "team", "date",
            "is_recurring", "created_by", "created_by_name",
            "completions", "is_completed_by_me", "created_at",
        ]
        read_only_fields = ["created_by"]

    def get_is_completed_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.completions.filter(completed_by=request.user).exists()
