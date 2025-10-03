"use client";
import { useEffect, useState } from "react";

const emptyRow = () => ({
  query: "",
  where: "",
  sinceDays: 2,
  remote: "any",
  results: 0,
  minSalary: "",
});

export default function QueriesModal({ onClose, onSubmit, loading }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [err, setErr] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const hasValid = rows.some((r) => r.query.trim().length > 0);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("scrapeQueries") || "[]");
      if (Array.isArray(saved) && saved.length) {
        const normalized = saved.map((r) => ({
          ...r,
          sinceDays: Number(r?.sinceDays ?? 0) || 0,
          results: Number(r?.results ?? 0) || 0,
        }));
        setRows(normalized);
      }
    } catch {}
  }, []);

  function update(i, patch) {
    setRows((prev) => {
      const next = prev.map((r) => ({ ...r }));
      const row = next[i] ?? {};
      if (patch.hasOwnProperty("sinceDays")) {
        row.sinceDays = Number(patch.sinceDays ?? 0) || 0;
      }
      if (patch.hasOwnProperty("results")) {
        row.results = Number(patch.results ?? 0) || 0;
      }
      next[i] = { ...row, ...patch };
      return next;
    });
    setIsSaved(false);
  }

  async function saveDraft() {
    setErr("");
    setSaving(true);
    try {
      localStorage.setItem("scrapeQueries", JSON.stringify(rows));
      const name =
        (rows[0]?.query?.trim() || "Search") +
        " · " +
        new Date().toLocaleString();
      const res = await fetch("/api/querysets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, queries: rows }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false)
        throw new Error(j?.error || `HTTP ${res.status}`);
      setIsSaved(true);
    } catch (e) {
      console.error("[saveDraft] error:", e);
      setErr(e.message || "Erreur lors de l’enregistrement");
    } finally {
      setSaving(false);
    }
  }

  function Stepper({ value, onChange, min = 0, max = 100, step = 10, label }) {
    const v = Number.isFinite(Number(value)) ? Number(value) : 0;
    const clamp = (n) => Math.min(max, Math.max(min, n));

    const dec = () => {
      const nv = clamp(v - step);
      // console.log("dec", v, "->", nv);
      onChange(nv);
    };
    const inc = () => {
      const nv = clamp(v + step);
      // console.log("inc", v, "->", nv);
      onChange(nv);
    };

    const btn = {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
      userSelect: "none",
      transform: isMobile ? "scale(0.7)" : "scale(0.6)", 
    };
    const wrap = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 1,
      background: "#fafafa",
      height: isMobile ? 30 : 25,
    };
    const num = {
      fontSize: 12,
      width: 15,
      textAlign: "center",
      fontWeight: 600,
      border: "none",
      background: "transparent",
      outline: "none",
      pointerEvents: "none",
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {label && <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>}
        <div style={wrap}>
          <button type="button" onClick={dec} disabled={v <= min} style={btn}>
            –
          </button>
          <input readOnly value={v} style={num} aria-live="polite" />
          <button type="button" onClick={inc} disabled={v >= max} style={btn}>
            +
          </button>
        </div>
      </div>
    );
  }

  function clearAll() {
    setRows([emptyRow()]);
    localStorage.removeItem("scrapeQueries");
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    const valid = rows.filter((r) => r.query.trim().length > 0);
    if (!valid.length)
      return setErr("Ajoute au moins une requête (champ 'query').");
    onSubmit?.({ queries: valid });
  }

  // Styles
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    zIndex: 1000,
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: "center",
  };

  const sheetStyle = isMobile
    ? {
        width: "80%",
        height: "90%",
        top: 25,
        position: "absolute",
        background: "#fff",
        borderRadius: 0,
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }
    : {
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        width: "min(900px, 92vw)",
        maxHeight: "82vh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
      };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: isMobile ? "12px 14px" : "14px 16px",
    borderBottom: "1px solid #f0f0f0",
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 1,
  };

  const titleStyle = {
    margin: 0,
    fontSize: isMobile ? 18 : 20,
    fontWeight: 700,
  };

  const contentStyle = {
    padding: isMobile ? "12px 14px" : "16px",
    overflow: "auto",
    width: "90%",
    WebkitOverflowScrolling: "touch",
    display: "grid",
    gap: 12,
  };

  const footerStyle = {
    position: isMobile ? "sticky" : "static",
    bottom: 0,
    padding: isMobile ? "10px 14px" : "14px 16px",
    borderTop: "1px solid #f0f0f0",
    background: "#fff",
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
  };

  const fieldLabel = {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
    marginTop: 9,
  };
  const inputStyle = {
    width: "100%",
    padding: isMobile ? "12px" : "10px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: isMobile ? 16 : 14,
    WebkitTapHighlightColor: "transparent",
  };
  const selectStyle = { ...inputStyle, background: "#fff" };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <form
        onSubmit={submit}
        style={sheetStyle}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")
          ) {
            if (!(e.metaKey || e.ctrlKey)) e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div></div>
        <div style={headerStyle}>
          <h3 style={titleStyle}>Search Jobs</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #ddd",
              background: "#fafafa",
              borderRadius: 10,
              padding: "8px 12px",
            }}
            aria-label="Close"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gap: 10,
                padding: isMobile ? 10 : 12,
                border: "1px solid #eee",
                borderRadius: 12,
              }}
            >
              {/* Fields */}
              <div></div>
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  gridTemplateColumns: "1fr",
                }}
              >
                <div>
                  <div style={{ ...fieldLabel, marginTop: 0 }}>Title’s Job</div>

                  <div style={{ display: "flex" }}>
                    <input
                      inputMode="search"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder='ex: "Dev", "Alternance", "..."'
                      value={r.query}
                      onChange={(e) => update(i, { query: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <div style={fieldLabel}>Place</div>
                  <div style={{ display: "flex" }}>
                    <input
                      inputMode="text"
                      autoCapitalize="words"
                      placeholder='ex: "Paris", "Remote FR"'
                      value={r.where}
                      onChange={(e) => update(i, { where: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr" }}
              >
                <div>
                  <div>
                    <div style={fieldLabel}>Work mode</div>
                    <select
                      value={r.remote}
                      onChange={(e) => update(i, { remote: e.target.value })}
                      style={selectStyle}
                    >
                      <option value="any">Any</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">On-site</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div>
                    <div style={fieldLabel}>Posted since (days)</div>
                    <div style={{ display: "flex" }}>
                      <Stepper
                        value={
                          typeof r.sinceDays === "number" ? r.sinceDays : 0
                        }
                        onChange={(v) => update(i, { sinceDays: v })}
                        min={0}
                        max={365}
                        step={1}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel}>Results</div>
                    <Stepper
                      value={typeof r.results === "number" ? r.results : 0}
                      onChange={(v) => update(i, { results: v })}
                      min={0}
                      max={100}
                      step={10}
                    />
                  </div>

                  <div>
                    <div style={fieldLabel}>Min salary</div>
                    <div style={{ display: "flex" }}>
                      <input
                        type="text"
                        inputMode="text"
                        autoCapitalize="characters"
                        placeholder="ex: 45k"
                        value={r.minSalary}
                        onChange={(e) =>
                          update(i, { minSalary: e.target.value })
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {err && <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={saveDraft}
              style={{
                border: "1px solid #ddd",
                background: isSaved ? "#f3f4f6" : "#fff",
                color: isSaved ? "#6b7280" : "inherit",
                borderRadius: 10,
                padding: "10px 14px",
                cursor:
                  isSaved || saving || !hasValid ? "not-allowed" : "pointer",
                opacity: isSaved || saving || !hasValid ? 0.7 : 1,
              }}
            >
              {saving ? "Saving…" : isSaved ? "Saved" : "Save draft"}
            </button>
            <button
              type="button"
              onClick={clearAll}
              style={{
                border: "1px solid #ddd",
                background: "#fff",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #222",
              background: loading ? "#eaeaea" : "#111",
              color: loading ? "#666" : "#fff",
              fontWeight: 600,
            }}
          >
            {loading ? "…" : "Run search"}
          </button>
        </div>
      </form>
    </div>
  );
}
