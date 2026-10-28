"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // "Remember me" session lives in localStorage, otherwise sessionStorage
    const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
    const savedToken = storage.getItem("token");
    const savedUser = storage.getItem("user");
    if (savedToken) {
      setToken(savedToken);
      setUser(savedUser ? JSON.parse(savedUser) : null);
    }
    setLoading(false);
  }, []);

  function clearStorage() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
  }

  function saveSession(newToken, newUser, remember = true) {
    clearStorage();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem("token", newToken);
    storage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function clearSession() {
    clearStorage();
    setToken(null);
    setUser(null);
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {
      // even if the server call fails, clear the local session
    }
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, saveSession, clearSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}