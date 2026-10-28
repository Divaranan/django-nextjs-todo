"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TaskForm from "@/components/TaskForm";
import { useAuth } from "@/context/AuthContext";
import { apiFetch, setFlash } from "@/lib/api";

export default function NewTaskPage() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  async function handleCreate(data) {
    await apiFetch("/tasks/", { method: "POST", body: JSON.stringify(data) });
    setFlash("Task created successfully!");
    router.push("/dashboard");
  }

  if (loading || !token) {
    return <div className="center-screen"><div className="spinner" /></div>;
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <div className="card">
          <h2 style={{ marginBottom: 16 }}>Add New Task</h2>
          <TaskForm onSubmit={handleCreate} submitLabel="Create Task" />
        </div>
      </main>
    </>
  );
}