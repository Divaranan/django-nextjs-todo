import logging
import re

from django.conf import settings
from django.contrib.auth.models import User, update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmailOTP, Task
from .otp import OTPError, send_otp, verify_otp
from .serializers import RegisterSerializer, TaskSerializer, UserSerializer

logger = logging.getLogger(__name__)

EMAIL_FAILED = (
    "Could not send the email right now. Please check the email settings "
    "and try again."
)


def clean(value):
    return (value or "").strip()


def auth_response(user, http_status=status.HTTP_200_OK):
    update_last_login(None, user)
    token, _ = Token.objects.get_or_create(user=user)
    return Response(
        {"token": token.key, "user": UserSerializer(user).data},
        status=http_status,
    )


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = clean(request.data.get("username"))
        email = clean(request.data.get("email"))

        # Remove an old signup that was never verified (same username/email),
        # so the person can simply register again.
        q = Q()
        if username:
            q |= Q(username__iexact=username)
        if email:
            q |= Q(email__iexact=email)
        if q:
            User.objects.filter(is_active=False, last_login__isnull=True).filter(
                q
            ).delete()

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # account stays inactive until the email OTP is verified
        user.is_active = False
        user.save(update_fields=["is_active"])

        try:
            send_otp(user, EmailOTP.PURPOSE_REGISTER)
        except Exception:
            logger.exception("Could not send verification email")
            user.delete()
            return Response(
                {"detail": EMAIL_FAILED}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        return Response(
            {"detail": "Verification code sent.", "email": user.email},
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = clean(request.data.get("email"))
        code = clean(request.data.get("otp"))

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            return Response(
                {"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST
            )
        if user.is_active:
            return Response(
                {"detail": "This email is already verified. Please log in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            verify_otp(user, EmailOTP.PURPOSE_REGISTER, code)
        except OTPError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user.is_active = True
        user.save(update_fields=["is_active"])
        return auth_response(user)


class ResendOTPView(APIView):
    """Resend the signup verification code."""

    permission_classes = [AllowAny]

    def post(self, request):
        email = clean(request.data.get("email"))
        user = User.objects.filter(
            email__iexact=email, is_active=False, last_login__isnull=True
        ).first()

        if user:
            try:
                send_otp(user, EmailOTP.PURPOSE_REGISTER)
            except OTPError as e:
                return Response(
                    {"detail": str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            except Exception:
                logger.exception("Could not resend verification email")
                return Response(
                    {"detail": EMAIL_FAILED},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response({"detail": "If this email is waiting, a new code was sent."})


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = clean(request.data.get("username"))
        password = request.data.get("password") or ""

        if not identifier or not password:
            return Response(
                {"detail": "Username/email and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Allow login with either username or email
        username = identifier
        if "@" in identifier:
            found = User.objects.filter(email__iexact=identifier).first()
            if found:
                username = found.username

        user = User.objects.filter(username=username).first()
        if user is None or not user.check_password(password):
            return Response(
                {"detail": "Invalid username/email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            if user.last_login is None:
                return Response(
                    {
                        "detail": "Please verify your email first.",
                        "code": "not_verified",
                        "email": user.email,
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {"detail": "This account is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return auth_response(user)


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.GOOGLE_CLIENT_ID:
            return Response(
                {"detail": "Google login is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        credential = request.data.get("credential")
        if not credential:
            return Response(
                {"detail": "Missing Google credential."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            info = google_id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=10,
            )
        except ValueError:
            return Response(
                {"detail": "Invalid Google sign-in. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            logger.exception("Google token verification failed")
            return Response(
                {"detail": "Could not verify with Google right now."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if not info.get("email_verified"):
            return Response(
                {"detail": "Your Google email is not verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = info["email"].lower()
        user = User.objects.filter(email__iexact=email).first()

        if user is None:
            base = re.sub(r"[^\w.@+-]", "", email.split("@")[0])[:130] or "user"
            username, n = base, 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{n}"
                n += 1
            user = User(
                username=username,
                email=email,
                first_name=(info.get("given_name") or "")[:150],
            )
            user.set_unusable_password()
            user.save()
        elif not user.is_active:
            if user.last_login is None:
                # Google already proved this email is theirs
                user.is_active = True
                user.save(update_fields=["is_active"])
            else:
                return Response(
                    {"detail": "This account is disabled."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        return auth_response(user)


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = clean(request.data.get("email"))
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            try:
                send_otp(user, EmailOTP.PURPOSE_RESET)
            except OTPError:
                pass  # too soon after the last code; the old code still works
            except Exception:
                logger.exception("Could not send password reset email")

        # Same answer whether the email exists or not (privacy)
        return Response(
            {"detail": "If this email is registered, a code has been sent."}
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = clean(request.data.get("email"))
        code = clean(request.data.get("otp"))
        password = request.data.get("password") or ""
        password2 = request.data.get("password2") or ""

        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is None:
            return Response(
                {"detail": "Invalid email or code."}, status=status.HTTP_400_BAD_REQUEST
            )

        if password != password2:
            return Response(
                {"password2": ["Passwords do not match."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(password, user)
        except DjangoValidationError as e:
            return Response(
                {"password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            verify_otp(user, EmailOTP.PURPOSE_RESET, code)
        except OTPError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(password)
        user.save(update_fields=["password"])
        Token.objects.filter(user=user).delete()  # log out everywhere
        return Response({"detail": "Password reset successful. Please log in."})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({"detail": "Logged out successfully."})


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only the logged-in user's tasks (other users' tasks -> 404)
        queryset = Task.objects.filter(user=self.request.user)
        status_param = self.request.query_params.get("status")
        if status_param == "completed":
            queryset = queryset.filter(is_completed=True)
        elif status_param == "pending":
            queryset = queryset.filter(is_completed=False)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        tasks = Task.objects.filter(user=request.user)
        total = tasks.count()
        completed = tasks.filter(is_completed=True).count()
        return Response(
            {"total": total, "completed": completed, "pending": total - completed}
        )