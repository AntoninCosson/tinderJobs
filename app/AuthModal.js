"use client";
import { useState } from "react";

export default function AuthModal({ onSuccess, onClose }) {
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const url = mode === "signin" ? "/api/signin" : "/api/signup";
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d?.ok === false) throw new Error(d?.error || "Auth failed");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      setErr(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.25)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <form
        onSubmit={submit}
        style={{
          display: "grid",
          gap: 12,
          padding: 24,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fff",
          minWidth: 320,
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setMode("signin")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: mode === "signin" ? "1px solid #333" : "1px solid #ddd",
              background: mode === "signin" ? "#f3f3f3" : "#fafafa",
              cursor: "pointer",
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: mode === "signup" ? "1px solid #333" : "1px solid #ddd",
              background: mode === "signup" ? "#f3f3f3" : "#fafafa",
              cursor: "pointer",
            }}
          >
            Sign up
          </button>
        </div>

        <h2 style={{ margin: "4px 0 8px" }}>
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: 10, borderRadius: 8, border: "1px solid #ddd" }}
        />
        {err && <div style={{ color: "crimson", fontSize: 13 }}>{err}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "8px 12px", borderRadius: 8 }}
          >
            {loading
              ? "…"
              : mode === "signin"
              ? "Se connecter"
              : "Créer le compte"}
          </button>
        </div>
      </form>
    </div>
  );
}
