"use client";
import { useState, useEffect } from "react";
import QueriesModal from "@/app/QueriesModal";
import ProgramModal from "./ProgramModal";

export default function Hub({ onMatch, onNotify }) {
  const [busy, setBusy] = useState(null);
  const [showProgram, setShowProgram] = useState(false);
  const [showQueries, setShowQueries] = useState(false);
  const [schedule, setSchedule] = useState(null);

  const DOWS = [
    { cron: 0, full: "dimanche" },
    { cron: 1, full: "lundi" },
    { cron: 2, full: "mardi" },
    { cron: 3, full: "mercredi" },
    { cron: 4, full: "jeudi" },
    { cron: 5, full: "vendredi" },
    { cron: 6, full: "samedi" },
  ];

//   useEffect(() => {
//     (async () => {
//       try {
//         const r = await fetch("/api/schedule", { cache: "no-store" });
//         const j = await r.json().catch(() => ({}));
//         if (r.ok && j?.ok) {
//           setSchedule(j.data?.[0] || null);
//         //   if (!j.data?.[0]) setShowProgram(true);
//         }
//       } catch {}
//     })();
//   }, []);

useEffect(() => {
    // 1) lecture instant de sessionStorage (si WakingScreen l’a rempli)
    try {
      const cached = sessionStorage.getItem("schedule");
      if (cached) setSchedule(JSON.parse(cached));
    } catch {}
  
    // 2) fetch de confirmation (rafraîchit et remet en cache)
    (async () => {
      try {
        const r = await fetch("/api/schedule", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j?.ok) {
          const sched = j.data?.[0] || null;
          setSchedule(sched);
          try { sessionStorage.setItem("schedule", JSON.stringify(sched)); } catch {}
        }
      } catch {}
    })();
  }, []);

  async function ensureN8NReady() {
    for (let i = 0; i < 10; i++) {
      try {
        const r = await fetch("/api/n8n-health", { cache: "no-store" });
        if (r.ok) return true;
      } catch {}
      await new Promise((res) => setTimeout(res, 2000));
    }
    return false;
  }

  async function handleSearchJobs({ queries }) {
    setBusy("scrape");
    try {
      console.log("queriesFromHub", queries);

      const n8nOk = await ensureN8NReady();
      if (!n8nOk) onNotify?.("n8n still waking, trying anyway…");

      const r = await fetch("/api/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queries }),
      });

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false)
        throw new Error(d?.error || "Scrape failed");

      onNotify?.(`Scrape done: ${d.count ?? 0} offers`);
      setShowQueries(false);
    } catch (e) {
      onNotify?.(e?.message ?? "Scrape error");
    } finally {
      setBusy(null);
    }
  }

  async function handleProgram({ cron, queries, meta, name, _id }) {
    setBusy("program");
    try {
      const n8nOk = await ensureN8NReady();
      if (!n8nOk) onNotify?.("n8n not ready, scheduling anyway");

      let r;
      if (_id) {
        r = await fetch(`/api/schedule/${_id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cron, queries, meta, name }),
        });
      } else {
        r = await fetch("/api/schedule", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cron, queries, meta, name }),
        });
      }

      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false)
        throw new Error(d?.error || "Schedule failed");

      onNotify?.(_id ? "Schedule updated" : "Schedule saved");
      setSchedule(d.data);
      setShowProgram(false);
    } catch (e) {
      onNotify?.(e.message || "Schedule error");
    } finally {
      setBusy(null);
    }
  }

  async function toggleSchedule() {
    if (!schedule?._id) return;
    const r = await fetch(`/api/schedule/${schedule._id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !schedule.active }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j?.ok) {
      setSchedule(j.data);
      onNotify?.(j.data.active ? "Resumed" : "Paused");
    } else {
      onNotify?.(j?.error || "Toggle failed");
    }
  }

  async function deleteSchedule() {
    if (!schedule?._id) return;
    try {
      const url = `/api/schedule/${schedule._id}`;
      const r = await fetch(url, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setSchedule(null);
        onNotify?.("Schedule removed");
        setShowProgram(true);
      } else {
        onNotify?.(j?.error || `Delete failed (${r.status})`);
      }
    } catch (e) {
      onNotify?.(e?.message || "Delete failed");
    }
  }

  return (
    <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
      <div style={{ display: "grid", gap: 12, minWidth: 300 }}>
        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <div style={{ display: "grid", gap: 12, minWidth: 320 }}>
            <button
              onClick={() => setShowQueries(true)}
              disabled={busy === "scrape"}
              style={{
                padding: "12px",
                borderRadius: 10,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {busy === "scrape" ? "Scraping…" : "Search Jobs"}
            </button>
          </div>

          {showQueries && (
            <QueriesModal
              onClose={() => setShowQueries(false)}
              onSubmit={handleSearchJobs}
              loading={busy === "scrape"}
            />
          )}
        </div>
        {schedule && (
          <div
            style={{
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
              display: "grid",
              gap: 8,
              minWidth: 320,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>{schedule.name || "Scheduled search"}</strong>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                    color: schedule.active ? "#036" : "#663",
                    background: schedule.active ? "#e8f0ff" : "#fff6e5",
                    border: schedule.active ? "1px solid #cfe0ff" : "1px solid #ffe0b2",
                  }}
                >
                  {schedule.active ? "LIVE" : "PAUSED"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowProgram(true)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#fff",
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={toggleSchedule}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #ddd",
                    background: "#fff",
                  }}
                >
                  {schedule.active ? "Pause" : "Resume"}
                </button>
                <button
                  onClick={deleteSchedule}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #f2c",
                    background: "#fff",
                    color: "#c00",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* résumé humain si meta présent */}
            <div style={{ fontSize: 13, opacity: 0.8 }}>
              {schedule?.meta?.mode === "daily" &&
                `Tous les ${schedule?.meta?.daysInterval ?? 1} jour(s) à ${
                  schedule?.meta?.time ?? "09:00"
                }`}
              {schedule?.meta?.mode === "weekly" &&
                `Chaque ${
                  (schedule?.meta?.weeklyDays ?? [])
                    .sort((a, b) => a - b)
                    .map((d) => DOWS.find((x) => x.cron === d)?.full)
                    .filter(Boolean)
                    .join(", ") || "—"
                } à ${schedule?.meta?.time ?? "09:00"}`}
              {schedule?.meta?.mode === "monthly" &&
                `Le(s) ${(schedule?.meta?.monthlyDays ?? [])
                  .sort((a, b) => a - b)
                  .join(", ")} du mois, à ${schedule?.meta?.time ?? "09:00"}`}
              {!schedule?.meta?.mode && <code>{schedule?.cron}</code>}
            </div>
          </div>
        )}

        {!schedule && (
          <button
            onClick={() => setShowProgram(true)}
            disabled={busy === "program"}
            style={{
              padding: "12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Program Search
          </button>
        )}
        <button
          onClick={onMatch}
          style={{
            padding: "12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          May have a match, <br /> Few word ahead to the perfect one
        </button>
      </div>
      {showProgram && (
        <ProgramModal
          onClose={() => setShowProgram(false)}
          onSubmit={handleProgram}
          loading={busy === "program"}
          initial={
            schedule
              ? {
                  _id: schedule._id,
                  name: schedule.name,
                  cron: schedule.cron,
                  queries: schedule.queries,
                  meta: schedule.meta,
                }
              : null
          }
        />
      )}
    </div>
  );
}
