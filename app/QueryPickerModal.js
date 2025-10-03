"use client";
import { useEffect, useState } from "react";
import { transform } from "typescript";

const DEFAULT_ROW = {
  query: "",
  where: "",
  sinceDays: 7,
  remote: "any",
  results: 10,
  minSalary: "",
};

export default function QueryPickerModal({ onClose, onPick, loading }) {
  const [tab, setTab] = useState("saved");
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedSets, setSavedSets] = useState([]);
  const [custom, setCustom] = useState([{ ...DEFAULT_ROW }]);
  const [using, setUsing] = useState(false);
  const [isUsingTheseQueries, setIsUsingTheseQueries] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Responsive
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // Saved sets
  useEffect(() => {
    if (tab !== "saved") return;
    setLoadingSaved(true);
    fetch("/api/querysets", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j?.ok) setSavedSets(j.data || []);
        else setErr(j?.error || "Failed to load saved queries");
      })
      .catch(() => setErr("Network error"))
      .finally(() => setLoadingSaved(false));
  }, [tab]);

  function normalizeQuery(q) {
    return {
      ...q,
      sinceDays: Number(q?.sinceDays ?? 0) || 0,
      results: Number(q?.results ?? 0) || 0,
    };
  }

  function pickSaved(queries) {
    if (!Array.isArray(queries) || !queries.length) {
      setErr("Ce queryset est vide.");
      return;
    }
    onPick?.(queries);
    onClose?.();
  }

  function modifySaved(s) {
    const qs =
      Array.isArray(s?.queries) && s.queries.length
        ? s.queries
        : [{ ...DEFAULT_ROW }];
    setCustom(qs.map(normalizeQuery));
    setEditingId(s?._id || null);
    setEditingName(s?.name || "Untitled");
    setErr("");
    setTab("custom");
  }

  function submitCustom(e) {
    e?.preventDefault?.();
    const valid = custom.filter((q) => (q?.query || "").trim().length);
    if (!valid.length) {
      setErr("Ajoute au moins une requête (champ 'query').");
      return;
    }
    onPick?.(valid);
    onClose?.();
  }

  async function saveChanges() {
    try {
      setErr("");
      setSaving(true);

      const valid = custom.filter((q) => (q?.query || "").trim().length);
      if (!valid.length) {
        setErr(
          "Ajoute au moins une requête (champ 'query') avant d’enregistrer."
        );
        setSaving(false);
        return;
      }

      const payload = {
        id: editingId,
        name: editingName || "Search",
        queries: valid,
      };

      const res = await fetch("/api/querysets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }

      const updatedDoc = j?.data;
      if (updatedDoc && editingId) {
        setSavedSets((prev) =>
          prev.map((set) => (set._id === editingId ? updatedDoc : set))
        );
      } else if (updatedDoc && !editingId) {
        setSavedSets((prev) => [updatedDoc, ...prev]);
        setEditingId(updatedDoc._id);
      }
      return true;
    } catch (e) {
      setErr(e.message || "Erreur lors de l’enregistrement");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function useAndSave() {
    if (loading || saving || using) return;
    setErr("");
    setUsing(true);
    const ok = await saveChanges();
    if (ok) {
      submitCustom();
    }
    setUsing(false);
    setIsUsingTheseQueries(true);
  }

  function updateCustom(i, patch) {
    setCustom((prev) =>
      prev.map((r, idx) => (idx === i ? normalizeQuery({ ...r, ...patch }) : r))
    );
  }

  async function deleteSavedSet(id) {
    try {
      const res = await fetch(`/api/querysets?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false)
        throw new Error(j?.error || `HTTP ${res.status}`);
      setSavedSets((prev) => prev.filter((s) => s._id !== id));
    } catch (e) {
      setErr(e.message || "Erreur lors de la suppression");
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
  }

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.35)",
    zIndex: 1100,
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: "center",
  };

  const sheetStyle = isMobile
    ? {
        width: "92%",
        height: "92%",
        top: 16,
        position: "absolute",
        background: "#fff",
        borderRadius: 12,
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr auto",
      }
    : {
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        width: "min(720px, 92vw)",
        maxHeight: "82vh",
        display: "grid",
        gridTemplateRows: "auto auto auto 1fr auto",
      };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid #f0f0f0",
  };
  const tabsStyle = {
    display: "flex",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #f0f0f0",
  };
  const btnTab = (active) => ({
    padding: "8px 10px",
    borderRadius: 8,
    border: active ? "1px solid #111" : "1px solid #ddd",
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    cursor: "pointer",
    fontWeight: 600,
  });
  const contentStyle = {
    padding: 12,
    overflow: "auto",
    display: "grid",
    gap: 10,
  };
  const footerStyle = {
    padding: 12,
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
  };
  const inputStyle = {
    width: "100%",
    padding: 10,
    borderRadius: 10,
    border: "1px solid #ddd",
  };
  const fieldLabel = { fontSize: 12, opacity: 0.75, marginBottom: 4 };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div style={sheetStyle}>
        <div style={headerStyle}>
          <strong>Pick queries</strong>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #ddd",
              background: "#fafafa",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          >
            Close
          </button>
        </div>

        <div style={tabsStyle}>
          <button
            style={btnTab(tab === "saved")}
            onClick={() => {
              setTab("saved");
              setErr("");
            }}
            type="button"
          >
            Saved sets
          </button>
          <button
            style={btnTab(tab === "custom")}
            onClick={() => {
              setTab("custom");
              setErr("");
            }}
            type="button"
          >
            {editingId ? "Edit set" : "Custom"}
          </button>
        </div>

        <div style={contentStyle}>
          {tab === "saved" && (
            <div>
              {loadingSaved ? (
                <div>Loading…</div>
              ) : savedSets.length === 0 ? (
                <div>Aucun queryset sauvegardé.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {savedSets.map((s) => (
                    <div
                      key={s._id}
                      style={{
                        border: "1px solid #eee",
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {s.name || "Untitled"}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {(s.queries || []).length} requête(s)
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          onClick={() => pickSaved(s.queries)}
                          disabled={loading}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Use this set
                        </button>

                        <button
                          onClick={() => modifySaved(s)}
                          disabled={loading}
                          style={{
                            padding: "8px 10px",
                            borderRadius: 8,
                            border: "1px solid #ddd",
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Modify this set
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteSavedSet(s._id)}
                          style={{
                            padding: "6px 10px",
                            border: "1px solid #ddd",
                            borderRadius: 8,
                            background: "#fff",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "custom" && (
            <form onSubmit={submitCustom} style={{ display: "grid", gap: 12 }}>
              {(editingId || custom) && (
                <div>
                  <div style={fieldLabel}>Name</div>
                  <div style={{ display: "flex" }}>
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="My search"
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {custom.map((r, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: 10,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div></div>
                  <div>
                    <div style={fieldLabel}>Title’s Job</div>
                    <div style={{ display: "flex" }}>
                      <input
                        value={r.query}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustom((prev) =>
                            prev.map((x, idx) =>
                              idx === i ? { ...x, query: v } : x
                            )
                          );
                        }}
                        placeholder='ex: "Dev", "Alternance"…'
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={fieldLabel}>Place</div>
                    <div style={{ display: "flex" }}>
                      <input
                        value={r.where}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustom((prev) =>
                            prev.map((x, idx) =>
                              idx === i ? { ...x, where: v } : x
                            )
                          );
                        }}
                        placeholder='ex: "Paris", "Remote FR"'
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={fieldLabel}>Work mode</div>
                      <select
                        value={r.remote}
                        onChange={(e) => {
                          const v = e.target.value;
                          setCustom((prev) =>
                            prev.map((x, idx) =>
                              idx === i ? { ...x, remote: v } : x
                            )
                          );
                        }}
                        style={{ ...inputStyle, background: "#fff" }}
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
                          onChange={(v) => updateCustom(i, { sinceDays: v })}
                          min={0}
                          max={30}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={fieldLabel}>Results</div>
                      <Stepper
                        value={typeof r.results === "number" ? r.results : 0}
                        onChange={(v) => updateCustom(i, { results: v })}
                        min={0}
                        max={100}
                        step={10}
                      />
                    </div>
                    <div>
                      <div style={fieldLabel}>Min salary</div>
                      <div style={{ display: "flex" }}>
                        <input
                          value={r.minSalary}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCustom((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, minSalary: v } : x
                              )
                            );
                          }}
                          placeholder="ex: 45k"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </form>
          )}

          {err && <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>}
        </div>

        {tab === "custom" ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 12,
              borderBottom: "1px solid #f0f0f0",
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {editingId && !custom && (
                <button
                  type="button"
                  onClick={saveChanges}
                  disabled={saving}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #111",
                    background: "#111",
                    color: "#fff",
                    fontWeight: 600,
                  }}
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              )}
            </div>

            <button
              type="button"
              form="customForm"
              disabled={loading || saving || using}
              onClick={useAndSave}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #111",
                background: "#111",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              { using && custom
                ? "Saving…"
                : isUsingTheseQueries
                ? "Using"
                : "Use these queries"}
            </button>
          </div>
        ) : (
          <div style={{ padding: 0 }} />
        )}

        <div style={footerStyle}>
          <div />
        </div>
      </div>
    </div>
  );
}
