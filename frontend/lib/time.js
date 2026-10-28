const HOUR = 3600000;
const DAY = 86400000;

const toMs = (value) => new Date(value).getTime();

export function dueMs(task) {
  return task.due_date ? toMs(task.due_date) : null;
}

// Old tasks may not have completed_at, so fall back to updated_at
export function completedMs(task) {
  return toMs(task.completed_at || task.updated_at);
}

// Date -> value for <input type="datetime-local">
export function toLocalInput(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatDuration(ms) {
  const totalMin = Math.floor(Math.abs(ms) / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return "less than 1m";
}

// running | overdue | completed_on_time | completed_late
export function getStatus(task, now = Date.now()) {
  const due = dueMs(task);
  if (task.is_completed) {
    if (due !== null && completedMs(task) > due) return "completed_late";
    return "completed_on_time";
  }
  if (due !== null && due <= now) return "overdue";
  return "running";
}

// Text + colour for the timer chip on each task
export function describeTime(task, now = Date.now()) {
  const status = getStatus(task, now);
  const due = dueMs(task);

  if (status === "running") {
    if (due === null) return { tone: "neutral", text: "No deadline set" };
    const left = due - now;
    return {
      tone: left < DAY ? "warn" : "good",
      text: `⏳ ${formatDuration(left)} left`,
    };
  }
  if (status === "overdue") {
    return { tone: "bad", text: `⚠️ Overdue by ${formatDuration(now - due)}` };
  }
  if (due === null) return { tone: "good", text: "✅ Completed" };

  const diff = due - completedMs(task); // positive = finished early
  if (status === "completed_on_time") {
    return {
      tone: "good",
      text: `✅ Finished ${formatDuration(diff)} before the deadline`,
    };
  }
  return {
    tone: "bad",
    text: `⚠️ Finished ${formatDuration(-diff)} after the deadline`,
  };
}

// How much of the time (start -> deadline) is already used: 0..100
export function progressPercent(task, now = Date.now()) {
  const due = dueMs(task);
  if (due === null) return 0;
  const start = toMs(task.created_at);
  if (due <= start) return 100;
  return Math.max(0, Math.min(100, ((now - start) / (due - start)) * 100));
}

export function matchesFilter(task, filter, now = Date.now()) {
  if (filter === "pending") return !task.is_completed;
  if (filter === "completed") return task.is_completed;
  if (filter === "overdue") return getStatus(task, now) === "overdue";
  return true;
}

// Pending first (closest deadline first), then completed (latest first)
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    if (!a.is_completed) {
      return (dueMs(a) ?? Infinity) - (dueMs(b) ?? Infinity);
    }
    return completedMs(b) - completedMs(a);
  });
}

export function summarize(tasks, now = Date.now()) {
  const s = {
    total: tasks.length,
    completed: 0,
    onTime: 0,
    late: 0,
    running: 0,
    overdue: 0,
  };
  const dueSoon = [];
  const overdueList = [];

  for (const t of tasks) {
    const status = getStatus(t, now);
    if (status === "completed_on_time") {
      s.completed++;
      s.onTime++;
    } else if (status === "completed_late") {
      s.completed++;
      s.late++;
    } else if (status === "overdue") {
      s.overdue++;
      overdueList.push(t);
    } else {
      s.running++;
      const due = dueMs(t);
      if (due !== null && due - now < DAY) dueSoon.push(t);
    }
  }

  const byDue = (a, b) => dueMs(a) - dueMs(b);
  dueSoon.sort(byDue);
  overdueList.sort(byDue);

  s.pending = s.running + s.overdue;
  s.completionRate = s.total ? Math.round((s.completed / s.total) * 100) : 0;
  s.onTimeRate = s.completed ? Math.round((s.onTime / s.completed) * 100) : null;
  s.dueSoon = dueSoon;
  s.overdueList = overdueList;
  return s;
}

// Short advice lines to help the user decide what to do next
export function insights(s) {
  const tips = [];
  if (s.total === 0) return tips;

  if (s.overdue > 0) {
    tips.push({
      tone: "bad",
      text: `${s.overdue} task${s.overdue > 1 ? "s" : ""} missed the deadline. Finish ${
        s.overdue > 1 ? "them" : "it"
      } now or move the deadline.`,
    });
  }
  if (s.dueSoon.length > 0) {
    tips.push({
      tone: "warn",
      text: `${s.dueSoon.length} task${
        s.dueSoon.length > 1 ? "s are" : " is"
      } due within 24 hours. Start with "${s.dueSoon[0].title}".`,
    });
  }
  if (s.onTimeRate !== null) {
    if (s.onTimeRate >= 80) {
      tips.push({ tone: "good", text: `Great! ${s.onTimeRate}% of your finished tasks were on time.` });
    } else if (s.onTimeRate < 50) {
      tips.push({
        tone: "bad",
        text: `Only ${s.onTimeRate}% of finished tasks were on time. Start earlier or set more realistic deadlines.`,
      });
    } else {
      tips.push({ tone: "warn", text: `${s.onTimeRate}% of finished tasks were on time. Try to start a bit earlier.` });
    }
  }
  if (s.pending === 0) {
    tips.push({ tone: "good", text: "All tasks are done 🎉 Add a new one when you are ready." });
  } else if (s.overdue === 0 && s.dueSoon.length === 0) {
    tips.push({ tone: "good", text: "All pending tasks are within their deadlines. Keep going!" });
  }
  return tips.slice(0, 4);
}