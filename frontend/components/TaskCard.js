"use client";

import Link from "next/link";
import {
  describeTime,
  formatDateTime,
  getStatus,
  progressPercent,
} from "@/lib/time";

const STATUS_LABEL = {
  running: { text: "Running", cls: "running" },
  overdue: { text: "Overdue", cls: "overdue" },
  completed_on_time: { text: "Done on time", cls: "ontime" },
  completed_late: { text: "Done late", cls: "late" },
};

export default function TaskCard({ task, now, onToggle, onDelete }) {
  const status = getStatus(task, now);
  const label = STATUS_LABEL[status];
  const timer = describeTime(task, now);
  const pct = progressPercent(task, now);
  const showBar = !task.is_completed && task.due_date;
  const barColor =
    status === "overdue" || pct >= 85 ? "#f87171" : pct >= 60 ? "#fbbf24" : "#4ade80";

  return (
    <div
      className={`tcard ${task.is_completed ? "is-done" : ""} ${
        status === "overdue" ? "is-overdue" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={task.is_completed}
        onChange={() => onToggle(task)}
        aria-label="Mark task completed"
      />

      <div className="tcard-body">
        <div className="tcard-title">
          <span className="tcard-title-text">{task.title}</span>
          <span className={`pill ${label.cls}`}>{label.text}</span>
        </div>

        {task.description && <div className="tcard-desc">{task.description}</div>}

        <div className="tcard-times">
          <span>🟢 Started: {formatDateTime(task.created_at)}</span>
          <span>
            🏁 Due: {task.due_date ? formatDateTime(task.due_date) : "No deadline"}
          </span>
          {task.is_completed && (
            <span>
              ✔️ Completed: {formatDateTime(task.completed_at || task.updated_at)}
            </span>
          )}
        </div>

        <span className={`timer ${timer.tone}`}>{timer.text}</span>

        {showBar && (
          <div className="bar" title={`${Math.round(pct)}% of the time used`}>
            <span style={{ width: `${pct}%`, background: barColor }} />
          </div>
        )}
      </div>

      <div className="tcard-actions">
        <Link href={`/tasks/${task.id}/edit`} className="mini-btn">
          Edit
        </Link>
        <button className="mini-btn danger" onClick={() => onDelete(task)}>
          Delete
        </button>
      </div>
    </div>
  );
}