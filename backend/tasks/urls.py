from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ForgotPasswordView,
    GoogleLoginView,
    LoginView,
    LogoutView,
    RegisterView,
    ResendOTPView,
    ResetPasswordView,
    TaskViewSet,
    VerifyEmailView,
)

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("auth/resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/google/", GoogleLoginView.as_view(), name="google-login"),
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("auth/reset-password/", ResetPasswordView.as_view(), name="reset-password"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("", include(router.urls)),
]