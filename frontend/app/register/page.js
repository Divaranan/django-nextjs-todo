"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import GoogleButton from "@/components/GoogleButton";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, parseErrors, setFlash, setPendingEmail } from "@/lib/api";

export default function RegisterPage() {
  const { token, loading, saveSession } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    password2: "",
  });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) router.replace("/dashboard");
  }, [loading, token, router]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneral("");

    const newErrors = {};
    if (!form.username.trim()) newErrors.username = "Username is required.";
    if (!form.email.trim()) newErrors.email = "Email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) newErrors.email = "Enter a valid email.";
    if (!form.password) newErrors.password = "Password is required.";
    else if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters.";
    if (form.password2 !== form.password) newErrors.password2 = "Passwords do not match.";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await apiFetch("/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          password2: form.password2,
        }),
      });
      setPendingEmail(data.email);
      setFlash("We sent a 6-digit code to your email.");
      router.replace("/verify-email");
    } catch (err) {
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
    <AuthShell title="Join the calm ✨" subtitle="Create your space and plan your day, slowly.">
      {general && <div className="dream-alert error">{general}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="dream-field">
          <span className="icon">👤</span>
          <input
            id="username"
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => update("username", e.target.value)}
            autoComplete="username"
          />
          {errors.username && <div className="dream-error">{errors.username}</div>}
        </div>

        <div className="dream-field">
          <span className="icon">✉️</span>
          <input
            id="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            autoComplete="email"
          />
          {errors.email && <div className="dream-error">{errors.email}</div>}
        </div>

        <div className="dream-field">
          <span className="icon">🔒</span>
          <input
            id="password"
            type="password"
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            autoComplete="new-password"
          />
          {errors.password && <div className="dream-error">{errors.password}</div>}
        </div>

        <div className="dream-field">
          <span className="icon">🔑</span>
          <input
            id="password2"
            type="password"
            placeholder="Confirm password"
            value={form.password2}
            onChange={(e) => update("password2", e.target.value)}
            autoComplete="new-password"
          />
          {errors.password2 && <div className="dream-error">{errors.password2}</div>}
        </div>

        <button className="dream-btn" type="submit" disabled={submitting}>
          {submitting ? "Sending code..." : "Register"}
        </button>
      </form>

      <GoogleButton onCredential={handleGoogle} onError={setGeneral} />

      <p className="dream-footer">
        Already have an account? <Link href="/login">Log In</Link>
      </p>
    </AuthShell>
  );
}