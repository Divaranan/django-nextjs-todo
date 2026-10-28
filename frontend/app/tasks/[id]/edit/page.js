"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import TaskForm from "@/components/TaskForm";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, setFlash } from "@/lib/api";

export default function EditTaskPage() {
  const { id } = useParams();
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        setTask(await apiFetch(`/tasks/${id}/`));
      } catch (err) {
        setError(
          err?.status === 404
            ? "Task not found."
            : err?.data?.detail || "Could not load the task."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token, id]);

  async function handleUpdate(data) {
    await apiFetch(`/tasks/${id}/`, { method: "PATCH", body: JSON.stringify(data) });
    setFlash("Task updated successfully!");
    router.push("/dashboard");
  }

  if (authLoading || !token) {
    return (
      <div className="form-page">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="form-wrap">
        <Link href="/dashboard" className="back-link">
          ← Back to dashboard
        </Link>
        <div className="form-card">
          <h2>Edit Task</h2>
          <p className="form-sub">Update the details or move the deadline.</p>

          {loading && <div className="spinner" />}
          {error && (
            <>
              <div className="dream-alert error">{error}</div>
              <Link href="/dashboard" className="f-btn ghost">
                Back to dashboard
              </Link>
            </>
          )}
          {task && (
            <TaskForm initial={task} onSubmit={handleUpdate} submitLabel="Save Changes" />
          )}
        </div>
      </div>
    </div>
  );
}