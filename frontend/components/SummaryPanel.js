"use client";

import { formatDuration, insights, dueMs, summarize } from "@/lib/time";

export default function SummaryPanel({ tasks, now }) {
  const s = summarize(tasks, now);
  const tips = insights(s);

  const C = 2 * Math.PI * 42; // ring circumference
  const completedTotal = s.onTime + s.late;
  const onTimeWidth = completedTotal ? (s.onTime / completedTotal) * 100 : 0;

  const attention = [
    ...s.overdueList.map((t) => ({ t, bad: true })),
    ...s.dueSoon.map((t) => ({ t, bad: false })),
  ].slice(0, 5);

  return (
    <>
      <h3 className="sum-title">📊 Summary</h3>

      {s.total === 0 ? (
        <div className="sum-card">
          <p style={{ color: "#9aa4cc", fontSize: 14 }}>
            Add a few tasks with deadlines and your summary will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="sum-card">
            <div className="ring-wrap">
              <div className="ring">
                <svg width="96" height="96" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6ee7f9" />
                      <stop offset="100%" stopColor="#f0abfc" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="url(#ringGrad)"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={`${(s.completionRate / 100) * C} ${C}`}
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                </svg>
                <div className="ring-num">{s.completionRate}%</div>
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>Completion</div>
                <div style={{ color: "#9aa4cc", fontSize: 13 }}>
                  {s.completed} of {s.total} tasks done
                </div>
              </div>
            </div>
          </div>

          <div className="stat-grid" style={{ marginBottom: 14 }}>
            <div className="stat-tile">
              <div className="num">{s.total}</div>
              <div className="label">Total</div>
            </div>
            <div className="stat-tile">
              <div className="num" style={{ color: "#4ade80" }}>{s.completed}</div>
              <div className="label">Completed</div>
            </div>
            <div className="stat-tile">
              <div className="num" style={{ color: "#8be9fd" }}>{s.running}</div>
              <div className="label">Running (in time)</div>
            </div>
            <div className="stat-tile">
              <div className="num" style={{ color: "#f87171" }}>{s.overdue}</div>
              <div className="label">Overdue</div>
            </div>
          </div>

          <div className="sum-card">
            <h4>Completed tasks</h4>
            {completedTotal === 0 ? (
              <p style={{ color: "#9aa4cc", fontSize: 13 }}>No completed tasks yet.</p>
            ) : (
              <>
                <div className="split-bar">
                  <span style={{ width: `${onTimeWidth}%`, background: "#4ade80" }} />
                  <span style={{ width: `${100 - onTimeWidth}%`, background: "#fbbf24" }} />
                </div>
                <div className="split-legend">
                  <span>🟩 On time: {s.onTime}</span>
                  <span>🟨 Late: {s.late}</span>
                </div>
              </>
            )}
          </div>

          <div className="sum-card">
            <h4>Needs attention</h4>
            {attention.length === 0 ? (
              <p style={{ color: "#9aa4cc", fontSize: 13 }}>
                Nothing urgent right now 👌
              </p>
            ) : (
              attention.map(({ t, bad }) => (
                <div className="attn-item" key={t.id}>
                  <span className="attn-title">{t.title}</span>
                  <span style={{ color: bad ? "#fca5a5" : "#fcd34d", whiteSpace: "nowrap" }}>
                    {bad
                      ? `Overdue ${formatDuration(now - dueMs(t))}`
                      : `${formatDuration(dueMs(t) - now)} left`}
                  </span>
                </div>
              ))
            )}
          </div>

          {tips.length > 0 && (
            <div className="sum-card">
              <h4>💡 Insights</h4>
              {tips.map((tip, i) => (
                <div key={i} className={`insight ${tip.tone}`}>
                  {tip.text}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}