"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SummaryPanel from "@/components/SummaryPanel";
import TaskCard from "@/components/TaskCard";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, popFlash } from "@/lib/api";
import { matchesFilter, sortTasks, summarize } from "@/lib/time";
import useNow from "@/lib/useNow";

const TITLES = {
  all: "All Tasks",
  pending: "Pending Tasks",
  completed: "Completed Tasks",
  overdue: "Overdue Tasks",
};

export default function DashboardPage() {
  const { user, token, loading: authLoading, clearSession, logout } = useAuth();
  const router = useRouter();
  const now = useNow(30000);

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Protect the page: no token -> login
  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    setSuccess(popFlash() || "");
  }, []);

  useEffect(() => {
    if (!success) return;
    const id = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(id);
  }, [success]);

  const handleError = useCallback(
    (err) => {
      if (err?.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }
      setError(err?.data?.detail || "Something went wrong. Please try again.");
    },
    [clearSession, router]
  );

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setTasks(await apiFetch("/tasks/"));
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    if (token) loadTasks();
  }, [token, loadTasks]);

  async function toggleTask(task) {
    setError("");
    try {
      const updated = await apiFetch(`/tasks/${task.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ is_completed: !task.is_completed }),
      });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      handleError(err);
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    setError("");
    try {
      await apiFetch(`/tasks/${task.id}/`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setSuccess("Task deleted.");
    } catch (err) {
      handleError(err);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const counts = useMemo(() => summarize(tasks, now), [tasks, now]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortTasks(
      tasks.filter(
        (t) =>
          matchesFilter(t, filter, now) &&
          (!q || t.title.toLowerCase().includes(q))
      )
    );
  }, [tasks, filter, search, now]);

  if (authLoading || !token) {
    return (
      <div className="dash">
        <div className="spinner" style={{ gridColumn: "1 / -1", alignSelf: "center" }} />
      </div>
    );
  }

  const NAV = [
    { key: "all", label: "📋 All", count: counts.total },
    { key: "pending", label: "⏳ Pending", count: counts.pending },
    { key: "completed", label: "✅ Completed", count: counts.completed },
    { key: "overdue", label: "🚨 Overdue", count: counts.overdue, red: counts.overdue > 0 },
  ];

  return (
    <div className="dash">
      {/* ---------- LEFT SIDEBAR ---------- */}
      <aside className="dash-side">
        <div className="dash-brand">✅ TaskFlow</div>

        <div className="dash-user">
          <div className="dash-avatar">{(user?.username || "?").charAt(0)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="dash-user-name">{user?.username}</div>
            <div style={{ fontSize: 12, color: "#8d97c0" }}>Welcome back 👋</div>
          </div>
        </div>

        <Link href="/tasks/new" className="dash-add">
          + Add Task
        </Link>

        <div>
          <div className="dash-nav-label" style={{ marginBottom: 8 }}>
            Tasks
          </div>
          <nav className="dash-nav">
            {NAV.map((item) => (
              <button
                key={item.key}
                className={`dash-nav-item ${filter === item.key ? "active" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                <span>{item.label}</span>
                <span className={`dash-count ${item.red ? "red" : ""}`}>{item.count}</span>
              </button>
            ))}
          </nav>
        </div>

        <button className="dash-nav-item dash-logout" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      {/* ---------- CENTER: TASK LIST ---------- */}
      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h2>{TITLES[filter]}</h2>
            <p>
              {visible.length} task{visible.length !== 1 ? "s" : ""} shown
            </p>
          </div>
          <input
            className="dash-search"
            type="text"
            placeholder="🔍 Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {success && <div className="dream-alert success">{success}</div>}
        {error && <div className="dream-alert error">{error}</div>}

        {loading ? (
          <div className="spinner" />
        ) : visible.length === 0 ? (
          <div className="sum-card" style={{ textAlign: "center", padding: 40 }}>
            <h3 style={{ marginBottom: 6 }}>
              {tasks.length === 0
                ? "No tasks yet 📝"
                : search
                ? "No tasks match your search"
                : `No ${filter} tasks`}
            </h3>
            <p style={{ color: "#9aa4cc" }}>
              {tasks.length === 0
                ? "Add your first task with a deadline to get started!"
                : "Nothing here right now."}
            </p>
          </div>
        ) : (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              now={now}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          ))
        )}
      </main>

      {/* ---------- RIGHT: SUMMARY ---------- */}
      <aside className="dash-summary">
        <SummaryPanel tasks={tasks} now={now} />
      </aside>
    </div>
  );
}