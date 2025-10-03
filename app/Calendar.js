// Calendar.jsx
"use client";
export default function Calendar({ value, onChange }) {
  const toggle = (day) => {
    const next = new Set(value);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange(next);
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
        const selected = value.has(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            style={{
              padding: "6px 0",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: selected ? "#111" : "#fff",
              color: selected ? "#fff" : "#000",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}