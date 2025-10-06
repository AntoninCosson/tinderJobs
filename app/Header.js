"use client";
export default function Header({ onLogout, onHome }) {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: "1px solid #eee",
        zIndex: 10000,
      }}
    >
      <button
        style={{
          fontWeight: 600,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
        onClick={onHome}
      >
        tinder-jobs
      </button>
      <button
        onClick={onLogout}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ddd",
          background: "#fafafa",
          cursor: "pointer",
        }}
        aria-label="Go to Hub"
      >
        Logout
      </button>
    </header>
  );
}
