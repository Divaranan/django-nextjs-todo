from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from rest_framework import serializers

from .models import Task


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2"]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("This email is already registered.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        # create_user hashes the password securely
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class TaskSerializer(serializers.ModelSerializer):
    due_date = serializers.DateTimeField(required=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "is_completed",
            "due_date",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at", "updated_at"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title cannot be empty.")
        return value

    def validate_due_date(self, value):
        # New task: deadline must be in the future.
        # Editing: only check if the deadline was actually changed.
        is_new = self.instance is None
        changed = not is_new and self.instance.due_date != value
        if (is_new or changed) and value <= timezone.now():
            raise serializers.ValidationError("Deadline must be in the future.")
        return value

    def create(self, validated_data):
        if validated_data.get("is_completed"):
            validated_data["completed_at"] = timezone.now()
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # remember WHEN the task was completed (needed for on-time / late)
        if (
            "is_completed" in validated_data
            and validated_data["is_completed"] != instance.is_completed
        ):
            instance.completed_at = (
                timezone.now() if validated_data["is_completed"] else None
            )
        return super().update(instance, validated_data)