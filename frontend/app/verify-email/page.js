"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { useAuth } from "@/context/AuthContext";
import {
  apiFetch,
  clearPendingEmail,
  getPendingEmail,
  maskEmail,
  parseErrors,
  popFlash,
  setFlash,
} from "@/lib/api";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { saveSession } = useAuth();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    const pending = getPendingEmail();
    if (!pending) {
      router.replace("/register");
      return;
    }
    setEmail(pending);
    setInfo(popFlash() || "");
  }, [router]);

  // resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiFetch("/auth/verify-email/", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      clearPendingEmail();
      saveSession(data.token, data.user, true);
      setFlash("Email verified! Welcome to TaskFlow 🎉");
      router.replace("/dashboard");
    } catch (err) {
      setError(parseErrors(err).general || "Verification failed.");
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError("");
    setInfo("");
    try {
      await apiFetch("/auth/resend-otp/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setInfo("A new code has been sent to your email.");
      setCooldown(30);
    } catch (err) {
      setError(parseErrors(err).general || "Could not resend the code.");
    }
  }

  return (
    <AuthShell
      title="Check your email 📬"
      subtitle={email ? `We sent a 6-digit code to ${maskEmail(email)}` : ""}
    >
      {info && <div className="dream-alert success">{info}</div>}
      {error && <div className="dream-alert error">{error}</div>}

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
        </div>

        <button className="dream-btn" type="submit" disabled={submitting}>
          {submitting ? "Verifying..." : "Verify & Continue"}
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