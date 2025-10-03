"use client";
import { useEffect, useMemo, useState } from "react";
import QueryPickerModal from "@/app/QueryPickerModal";
import Calendar from "@/app/Calendar";

export default function ProgramModal({ onClose, onSubmit, loading, initial }) {
  // queries modal
  const [queries, setQueries] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  // responsive
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const [mode, setMode] = useState("daily");
  const [time, setTime] = useState("09:00");

  const [daysInterval, setDaysInterval] = useState(1);

  const DOWS = [
    { key: "sun", label: "Dim", cron: 0, full: "dimanche" },
    { key: "mon", label: "Lun", cron: 1, full: "lundi" },
    { key: "tue", label: "Mar", cron: 2, full: "mardi" },
    { key: "wed", label: "Mer", cron: 3, full: "mercredi" },
    { key: "thu", label: "Jeu", cron: 4, full: "jeudi" },
    { key: "fri", label: "Ven", cron: 5, full: "vendredi" },
    { key: "sat", label: "Sam", cron: 6, full: "samedi" },
  ];
  const [weeklyDays, setWeeklyDays] = useState(new Set([1, 2, 3, 4, 5]));
  const [weeksInterval, setWeeksInterval] = useState(1);

  const [dom, setDom] = useState(1);
  const [monthsInterval, setMonthsInterval] = useState(1);
  const [monthlyDays, setMonthlyDays] = useState(new Set([1]));
  const [showCalendar, setShowCalendar] = useState(false);


  const cron = useMemo(() => {
    const [hh, mm] = (time || "09:00").split(":").map((n) => parseInt(n, 10));
    const H = Number.isFinite(hh) ? hh : 9;
    const M = Number.isFinite(mm) ? mm : 0;

    if (mode === "daily") {
      const d = Math.max(1, Number(daysInterval) || 1);
      return `${M} ${H} */${d} * *`;
    }

    if (mode === "weekly") {
      const list = Array.from(weeklyDays)
        .sort((a, b) => a - b)
        .join(",");
      return `${M} ${H} * * ${list || "*"}`;
    }

    const mi = Math.max(1, Number(monthsInterval) || 1);
    const daysList =
      Array.from(monthlyDays)
        .sort((a, b) => a - b)
        .join(",") || "1";
    return `${M} ${H} ${daysList} */${mi} *`;
  }, [mode, time, daysInterval, weeklyDays, monthsInterval, monthlyDays]);


  const humanText = useMemo(() => {
    const [hh, mm] = (time || "09:00").split(":").map((n) => parseInt(n, 10));
    const H = String(Number.isFinite(hh) ? hh : 9).padStart(2, "0");
    const M = String(Number.isFinite(mm) ? mm : 0).padStart(2, "0");

    if (mode === "daily") {
      const n = Math.max(1, Number(daysInterval) || 1);
      return `Tous les ${n} jour${n > 1 ? "s" : ""} à ${H}:${M}`;
    }

    if (mode === "weekly") {
      const selected = Array.from(weeklyDays)
        .sort((a, b) => a - b)
        .map((d) => DOWS.find((x) => x.cron === d)?.full)
        .filter(Boolean);

      const jours = selected.length
        ? selected.join(", ")
        : "aucun jour sélectionné";

      return weeksInterval > 1
        ? `Toutes les ${weeksInterval} semaines, le(s) ${jours} à ${H}:${M}`
        : `Chaque ${jours} à ${H}:${M}`;
    }

    const daysArr = Array.from(monthlyDays).sort((a, b) => a - b);
    const daysLabel = daysArr.length ? daysArr.join(", ") : "—";
    return `Le(s) ${daysLabel} tous les mois à ${H}:${M}`;
  }, [
    mode,
    time,
    daysInterval,
    weeklyDays,
    weeksInterval,
    monthsInterval,
    monthlyDays,
  ]);

  useEffect(() => {
    if (!initial) return;
    if (Array.isArray(initial.queries)) setQueries(initial.queries);
    const m = initial.meta || {};
    if (m.mode) setMode(m.mode);
    if (m.time) setTime(m.time);
    if (Array.isArray(m.weeklyDays)) setWeeklyDays(new Set(m.weeklyDays));
    if (Array.isArray(m.monthlyDays)) setMonthlyDays(new Set(m.monthlyDays));
    if (typeof m.daysInterval === "number") setDaysInterval(m.daysInterval);
    if (typeof m.monthsInterval === "number") setMonthsInterval(m.monthsInterval);
  }, [initial]);

  const [err, setErr] = useState("");

  function handleSave(e) {
    e.preventDefault();
    console.log("[ProgramModal] submit", { queries, cron });
    setErr("");
    if (!queries?.length) {
      setErr("Choisis d’abord un set de requêtes.");
      return;
    }
    onSubmit?.({
      _id: initial?._id,
      name: initial?.name || "Scheduled search",
      cron,
      queries,
      meta: {
        mode,
        time,
        daysInterval,
        weeklyDays: Array.from(weeklyDays),
        weeksInterval,
        monthlyDays: Array.from(monthlyDays),
        monthsInterval,
      },
    });
  }

  function Stepper({
    value,
    onChange,
    min = 1,
    max = Infinity,
    step = 1,
    label,
  }) {
    const dec = () => onChange(Math.max(min, (value || 0) - step));
    const inc = () => onChange(Math.min(max, (value || 0) + step));

    const btn = {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid #ddd",
      background: "#fff",
      cursor: "pointer",
      userSelect: "none",
    };
    const wrap = {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 6,
      background: "#fafafa",
    };
    const display = {
      minWidth: 44,
      textAlign: "center",
      fontWeight: 600,
    };

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {label && <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>}
        <div style={wrap}>
          <button
            type="button"
            onClick={dec}
            disabled={value <= min}
            style={btn}
          >
            –
          </button>
          <span aria-live="polite" style={display}>
            {value}
          </span>
          <button
            type="button"
            onClick={inc}
            disabled={value >= max}
            style={btn}
          >
            +
          </button>
        </div>
      </div>
    );
  }

  // styles
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
        height: "62%",
        top: 136,
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
        width: "min(560px, 92vw)",
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
    overflowY: "auto",
    overflowX: "hidden",
    display: "grid",
    gap: 14,
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

  const fieldLabel = { fontSize: 12, opacity: 0.75, marginBottom: 6 };
  const smallNote = { fontSize: 12, opacity: 0.6 };

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
          {/* Recurrence builder */}
          <div style={{ display: "grid", gap: 10 }}>
            <div style={fieldLabel}>Recurrence</div>

            {/* Mode + Time */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{ ...inputStyle, width: "auto" }}
              >
                <option value="daily">Tous les X jours</option>
                <option value="weekly">Jours de la semaine</option>
                <option value="monthly">Tous les mois</option>
              </select>

              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
              />
            </div>

            {/* Daily options */}
            {mode === "daily" && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={smallNote}>Tous les</span>
                <Stepper
                  value={daysInterval}
                  onChange={setDaysInterval}
                  min={1}
                />
                <span style={smallNote}>jour(s)</span>
              </div>
            )}

            {/* Weekly options */}
            {mode === "weekly" && (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {DOWS.map((d) => (
                    <label
                      key={d.key}
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      <input
                        type="checkbox"
                        checked={weeklyDays.has(d.cron)}
                        onChange={(e) => {
                          setWeeklyDays((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(d.cron);
                            else next.delete(d.cron);
                            return next;
                          });
                        }}
                      />
                      <span>{d.label}</span>
                    </label>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <span style={smallNote}>Toutes les semaines</span>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly options */}
            {mode === "monthly" && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexDirection: "column",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!showCalendar) {
                        setShowCalendar(true);
                        return;
                      }
                      if (monthlyDays.size === 0) {
                        alert("Sélectionne au moins un jour du mois.");
                        return;
                      }
                      setShowCalendar(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: "#fafafa",
                      cursor: "pointer",
                    }}
                  >
                    {!showCalendar ? "Choisir les jours du mois" : "Valider"}
                  </button>

                  {showCalendar && (
                    <Calendar
                      value={monthlyDays}
                      onChange={(next) => setMonthlyDays(next)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Human-friendly + Cron preview */}
            <div style={{ marginTop: 4 }}>
              <div style={fieldLabel}>Résumé</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {humanText}
                <br />
                {/* <code style={{ opacity: 0.5 }}>{cron}</code> */}
              </div>
            </div>
          </div>

          {/* Queries chooser */}
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
