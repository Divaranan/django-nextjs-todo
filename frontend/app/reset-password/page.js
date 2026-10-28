"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import {
  apiFetch,
  clearPendingEmail,
  getPendingEmail,
  maskEmail,
  parseErrors,
  popFlash,
  setFlash,
} from "@/lib/api";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    const pending = getPendingEmail();
    if (!pending) {
      router.replace("/forgot-password");
      return;
    }
    setEmail(pending);
    setInfo(popFlash() || "");
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneral("");
    setInfo("");

    const newErrors = {};
    if (otp.length !== 6) newErrors.otp = "Enter the 6-digit code.";
    if (!password) newErrors.password = "New password is required.";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (password2 !== password) newErrors.password2 = "Passwords do not match.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      await apiFetch("/auth/reset-password/", {
        method: "POST",
        body: JSON.stringify({ email, otp, password, password2 }),
      });
      clearPendingEmail();
      setFlash("Password reset successful! Please log in.");
      router.replace("/login");
    } catch (err) {
      const parsed = parseErrors(err);
      setErrors(parsed.fields);
      setGeneral(parsed.general);
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setGeneral("");
    setInfo("");
    try {
      await apiFetch("/auth/forgot-password/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setInfo("If this email is registered, a new code has been sent.");
      setCooldown(30);
    } catch (err) {
      setGeneral(parseErrors(err).general || "Could not resend the code.");
    }
  }

  return (
    <AuthShell
      title="Reset password 🔐"
      subtitle={email ? `Enter the code sent to ${maskEmail(email)}` : ""}
    >
      {info && <div className="dream-alert success">{info}</div>}
      {general && <div className="dream-alert error">{general}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="dream-field">
          <input
            className="dream-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="······"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            autoFocus
          />
          {errors.otp && <div className="dream-error">{errors.otp}</div>}
        </div>

        <div className="dream-field">
          <span className="icon">🔒</span>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <div className="dream-error">{errors.password}</div>}
        </div>

        <div className="dream-field">
          <span className="icon">🔑</span>
          <input
            type="password"
            placeholder="Confirm new password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
          {errors.password2 && <div className="dream-error">{errors.password2}</div>}
        </div>

        <button className="dream-btn" type="submit" disabled={submitting}>
          {submitting ? "Resetting..." : "Reset password"}
        </button>
      </form>

      <p className="dream-hint">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          className="dream-linkbtn"
          onClick={handleResend}
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>

      <p className="dream-footer">
        <Link href="/login">Back to login</Link>
      </p>
    </AuthShell>
  );
}