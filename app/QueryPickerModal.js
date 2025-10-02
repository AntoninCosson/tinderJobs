"use client";
import { useEffect, useState } from "react";

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
    setCustom(qs);
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
    } catch (e) {
      setErr(e.message || "Erreur lors de l’enregistrement");
    } finally {
      setSaving(false);
    }
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "custom" && (
            <form onSubmit={submitCustom} style={{ display: "grid", gap: 12 }}>
              {editingId && (
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
                        <input
                          type="number"
                          min={0}
                          value={r.sinceDays}
                          onChange={(e) => {
                            const v = Number(e.target.value || 0);
                            setCustom((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, sinceDays: v } : x
                              )
                            );
                          }}
                          style={inputStyle}
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
                      <div style={{ display: "flex" }}>
                        <input
                          type="number"
                          min={0}
                          step={10}
                          max={100}
                          value={r.results}
                          onChange={(e) => {
                            const v = Number(e.target.value || 10);
                            setCustom((prev) =>
                              prev.map((x, idx) =>
                                idx === i ? { ...x, results: v } : x
                              )
                            );
                          }}
                          style={inputStyle}
                        />
                      </div>
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
  <div style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottom: "1px solid #f0f0f0",
    background: "#fff",
  }}>
    <div style={{ display: "flex", gap: 8 }}>
      {editingId && (
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
      disabled={loading}
      onClick={submitCustom}
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid #111",
        background: "#111",
        color: "#fff",
        fontWeight: 600,
      }}
    >
      Use these queries
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
