"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { apiFetch, parseErrors, setFlash, setPendingEmail } from "@/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password/", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setPendingEmail(email.trim());
      setFlash("If this email is registered, a 6-digit code has been sent.");
      router.push("/reset-password");
    } catch (err) {
      setError(parseErrors(err).general || "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password? 🔑"
      subtitle="No worries. We'll email you a code to reset it."
    >
      {error && <div className="dream-alert error">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="dream-field">
          <span className="icon">✉️</span>
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <button className="dream-btn" type="submit" disabled={submitting}>
          {submitting ? "Sending code..." : "Send code"}
        </button>
      </form>

      <p className="dream-footer">
        <Link href="/login">Back to login</Link>
      </p>
    </AuthShell>
  );
}