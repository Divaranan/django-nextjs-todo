"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import GoogleButton from "@/components/GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, parseErrors, popFlash, setFlash, setPendingEmail } from "@/lib/api";

export default function LoginPage() {
  const { token, loading, saveSession } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSuccess(popFlash() || "");
  }, []);

  useEffect(() => {
    if (!loading && token) router.replace("/dashboard");
  }, [loading, token, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneral("");
    setSuccess("");

    const newErrors = {};
    if (!identifier.trim()) newErrors.username = "Username or email is required.";
    if (!password) newErrors.password = "Password is required.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await apiFetch("/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username: identifier.trim(), password }),
      });
      saveSession(data.token, data.user, remember);
      router.replace("/dashboard");
    } catch (err) {
      // Account exists but the email was never verified -> send a new code
      if (err?.status === 403 && err?.data?.code === "not_verified") {
        const email = err.data.email;
        setPendingEmail(email);
        try {
          await apiFetch("/auth/resend-otp/", {
            method: "POST",
            body: JSON.stringify({ email }),
          });
        } catch {
          // a code was probably sent a moment ago, that is fine
        }
        setFlash("Please verify your email first. We sent you a code.");
        router.replace("/verify-email");
        return;
      }
      const parsed = parseErrors(err);
      setErrors(parsed.fields);
      setGeneral(parsed.general);
      setSubmitting(false);
    }
  }

  async function handleGoogle(credential) {
    setGeneral("");
    try {
      const data = await apiFetch("/auth/google/", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });
      saveSession(data.token, data.user, true);
      router.replace("/dashboard");
    } catch (err) {
      setGeneral(parseErrors(err).general || "Google sign-in failed.");
    }
  }

  return (
    <AuthShell title="Welcome back 🌙" subtitle="Take a deep breath. Your tasks are waiting.">
      {success && <div className="dream-alert success">{success}</div>}
      {general && <div className="dream-alert error">{general}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="dream-field">
          <span className="icon">👤</span>
          <input
            id="identifier"
            type="text"
            placeholder="Username or email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
          {errors.username && <div className="dream-error">{errors.username}</div>}
        </div>

        <div className="dream-field">
          <span className="icon">🔒</span>
          <input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {errors.password && <div className="dream-error">{errors.password}</div>}
        </div>

        <div className="dream-row">
          <label>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        <button className="dream-btn" type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log In"}
        </button>
      </form>

      <GoogleButton onCredential={handleGoogle} onError={setGeneral} />

      <p className="dream-footer">
        New here? <Link href="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}