"use client";
import { useState } from "react";
import QueriesModal from "@/app/QueriesModal";
import ProgramModal from "./ProgramModal";

export default function Hub({ onMatch, onNotify }) {
  const [busy, setBusy] = useState(null); // 'scrape' | 'program' | null
  const [showProgram, setShowProgram] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchWhereQuery, setSearchWhereQuery] = useState("");
  const [showQueries, setShowQueries] = useState(false);

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
        body: JSON.stringify({ queries }), // pas de userId ici
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

  async function handleProgram({ cron, queries }) {
    setBusy("program");
    try {
      const n8nOk = await ensureN8NReady();
      if (!n8nOk) onNotify?.("n8n not ready, scheduling anyway");
  
      const r = await fetch("/api/schedules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cron, queries }),
      });
  
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || "Schedule failed");
  
      onNotify?.("Schedule saved");
      setShowProgram(false);
    } catch (e) {
      onNotify?.(e.message || "Schedule error");
    } finally {
      setBusy(null);
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
        />
      )}
    </div>
  );
}
