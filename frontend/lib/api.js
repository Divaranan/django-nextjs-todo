const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Token ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw {
      status: 0,
      data: { detail: "Cannot connect to the server. Is the backend running?" },
    };
  }

  let data = null;
  if (res.status !== 204) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }

  if (!res.ok) throw { status: res.status, data };
  return data;
}

// Turns a Django error response into { fields: {...}, general: "..." }
export function parseErrors(err) {
  const fields = {};
  let general = "";
  const data = err?.data;

  if (!data || typeof data !== "object") {
    return { fields, general: "Something went wrong. Please try again." };
  }

  for (const [key, value] of Object.entries(data)) {
    const msg = Array.isArray(value) ? value.join(" ") : String(value);
    if (key === "detail" || key === "non_field_errors") general = msg;
    else fields[key] = msg;
  }
  return { fields, general };
}

// One-time success message shown after a redirect
export function setFlash(message) {
  if (typeof window !== "undefined") sessionStorage.setItem("flash", message);
}

export function popFlash() {
  if (typeof window === "undefined") return null;
  const msg = sessionStorage.getItem("flash");
  sessionStorage.removeItem("flash");
  return msg;
}

// Email waiting for OTP verification / password reset
export function setPendingEmail(email) {
  if (typeof window !== "undefined") sessionStorage.setItem("pending_email", email);
}

export function getPendingEmail() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem("pending_email") || "";
}

export function clearPendingEmail() {
  if (typeof window !== "undefined") sessionStorage.removeItem("pending_email");
}

export function maskEmail(email) {
  const [name, domain] = (email || "").split("@");
  if (!domain) return email;
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`;
}