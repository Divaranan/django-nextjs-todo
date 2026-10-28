import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.utils import timezone

from .models import EmailOTP

RESEND_COOLDOWN_SECONDS = 30


class OTPError(Exception):
    """A user-facing OTP problem (wrong code, expired, too many tries...)."""


def send_otp(user, purpose):
    last = (
        EmailOTP.objects.filter(user=user, purpose=purpose)
        .order_by("-created_at")
        .first()
    )
    if last and timezone.now() - last.created_at < timedelta(
        seconds=RESEND_COOLDOWN_SECONDS
    ):
        raise OTPError("Please wait a few seconds before requesting another code.")

    # old codes stop working when a new one is issued
    EmailOTP.objects.filter(user=user, purpose=purpose, is_used=False).update(
        is_used=True
    )

    code = f"{secrets.randbelow(1_000_000):06d}"
    EmailOTP.objects.create(user=user, purpose=purpose, code_hash=make_password(code))

    if purpose == EmailOTP.PURPOSE_REGISTER:
        subject = "Verify your TaskFlow account"
        intro = "Use this code to verify your email address"
    else:
        subject = "Reset your TaskFlow password"
        intro = "Use this code to reset your password"

    message = (
        f"Hi {user.username},\n\n"
        f"{intro}:\n\n"
        f"    {code}\n\n"
        f"This code expires in {EmailOTP.OTP_LIFETIME_MINUTES} minutes. "
        f"If you did not request it, you can ignore this email.\n\n"
        f"- TaskFlow"
    )
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


def verify_otp(user, purpose, code):
    otp = (
        EmailOTP.objects.filter(user=user, purpose=purpose, is_used=False)
        .order_by("-created_at")
        .first()
    )
    if otp is None:
        raise OTPError("No active code. Please request a new one.")
    if otp.is_expired:
        raise OTPError("This code has expired. Please request a new one.")
    if otp.attempts >= EmailOTP.MAX_ATTEMPTS:
        raise OTPError("Too many wrong attempts. Please request a new code.")

    if not check_password(code, otp.code_hash):
        otp.attempts += 1
        otp.save(update_fields=["attempts"])
        left = EmailOTP.MAX_ATTEMPTS - otp.attempts
        if left > 0:
            raise OTPError(f"Incorrect code. {left} attempt(s) left.")
        raise OTPError("Too many wrong attempts. Please request a new code.")

    otp.is_used = True
    otp.save(update_fields=["is_used"])