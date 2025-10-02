"use client";
import { useEffect, useState } from "react";
import QueryPickerModal from "@/app/QueryPickerModal";

export default function ProgramModal({ onClose, onSubmit, loading }) {
  const [cron, setCron] = useState("0 9 * * 1-5");
  const [queries, setQueries] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [err, setErr] = useState("");
  const [isMobile, setIsMobile] = useState(false);


  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  function handleSave(e) {
    e.preventDefault();
    setErr("");
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      setErr("Choisis d’abord un set de requêtes.");
      return;
    }
    onSubmit?.({ cron, queries });
  }

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.25)",
    display: "grid",
    placeItems: "center",
    zIndex: 1000,
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
        gridTemplateRows: "auto 1fr auto",
      }
    : {
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        width: "min(520px, 92vw)",
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
    background: "#fff",
  };

  const contentStyle = {
    padding: isMobile ? "12px 14px" : "16px",
    overflow: "auto",
    display: "grid",
    gap: 12,
  };

  const footerStyle = {
    padding: isMobile ? "10px 14px" : "14px 16px",
    borderTop: "1px solid #f0f0f0",
    background: "#fff",
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  };

  const inputStyle = {
    width: "100%",
    padding: isMobile ? 12 : 10,
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    fontSize: isMobile ? 16 : 14,
    WebkitTapHighlightColor: "transparent",
  };

  const fieldLabel = {
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <form
        onSubmit={handleSave}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
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
        <div style={headerStyle}>
          <h3 style={{ margin: 0 }}>Program Search</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #ddd",
              background: "#fafafa",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          <div>
            <div style={fieldLabel}>CRON</div>
            <input
              placeholder="CRON (ex: 0 9 * * 1-5)"
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              style={inputStyle}
            />
            <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
              Lundi–Vendredi à 09:00 → <code>0 9 * * 1-5</code>
            </div>
          </div>

          <div>
            <div style={fieldLabel}>Queries</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                {queries ? `Change (${queries.length})` : "Choose queries…"}
              </button>
              {queries && (
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {queries.length} requête(s) sélectionnée(s)
                </span>
              )}
            </div>
          </div>

          {err && <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !queries?.length}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #111",
              background: loading || !queries?.length ? "#eaeaea" : "#111",
              color: loading || !queries?.length ? "#666" : "#fff",
              fontWeight: 600,
              cursor: loading || !queries?.length ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "…" : "Save schedule"}
          </button>
        </div>
      </form>

      {/* Child picker */}
      {showPicker && (
        <QueryPickerModal
          loading={loading}
          onClose={() => setShowPicker(false)}
          onPick={(qs) => {
            setQueries(qs);
            setShowPicker(false);
          }}
        />
      )}
    </div>
  );
}