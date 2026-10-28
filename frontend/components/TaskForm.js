"use client";

import { useState } from "react";
import Link from "next/link";
import { parseErrors } from "@/lib/api";
import { formatDateTime, toLocalInput } from "@/lib/time";

const QUICK = [
  { label: "+1 hour", hours: 1 },
  { label: "+6 hours", hours: 6 },
  { label: "+1 day", hours: 24 },
  { label: "+3 days", hours: 72 },
  { label: "+1 week", hours: 168 },
];

export default function TaskForm({ initial, onSubmit, submitLabel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [due, setDue] = useState(initial?.due_date ? toLocalInput(initial.due_date) : "");
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [saving, setSaving] = useState(false);

  function pick(hours) {
    setDue(toLocalInput(Date.now() + hours * 3600000));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGeneral("");

    const newErrors = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    else if (title.length > 200) newErrors.title = "Title must be 200 characters or less.";

    const changed = !initial?.due_date || toLocalInput(initial.due_date) !== due;
    if (!due) {
      newErrors.due_date = "Please set a deadline.";
    } else if (changed && new Date(due).getTime() <= Date.now()) {
      newErrors.due_date = "Deadline must be in the future.";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        due_date: changed ? new Date(due).toISOString() : initial.due_date,
      });
    } catch (err) {
      const parsed = parseErrors(err);
      setErrors(parsed.fields);
      setGeneral(parsed.general);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {general && <div className="dream-alert error">{general}</div>}

      <div className="f-field">
        <label htmlFor="title">Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Finish Django backend"
        />
        {errors.title && <div className="f-error">{errors.title}</div>}
      </div>

      <div className="f-field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details..."
        />
        {errors.description && <div className="f-error">{errors.description}</div>}
      </div>

      <div className="f-field">
        <label htmlFor="due">Deadline (finish before) *</label>
        <input
          id="due"
          type="datetime-local"
          value={due}
          min={initial ? undefined : toLocalInput(Date.now())}
          onChange={(e) => setDue(e.target.value)}
        />
        <div className="chips">
          {QUICK.map((q) => (
            <button type="button" key={q.label} className="chip" onClick={() => pick(q.hours)}>
              {q.label}
            </button>
          ))}
        </div>
        <div className="f-hint">
          {initial
            ? `🟢 Started: ${formatDateTime(initial.created_at)}`
            : "🟢 The start time is saved automatically when you create the task."}
        </div>
        {errors.due_date && <div className="f-error">{errors.due_date}</div>}
      </div>

      <div className="f-actions">
        <button className="f-btn" type="submit" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </button>
        <Link href="/dashboard" className="f-btn ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}