"use client";

import { useEffect, useState } from "react";
import Header from "@/app/Header";
import AuthModal from "@/app/AuthModal";
import WakingScreen from "@/app/WakingScreen";
import Hub from "@/app/Hub";
import AppContent from "@/app/AppContent";

export default function Page() {
  const [stage, setStage] = useState("checking");
  const [showAuth, setShowAuth] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const d = await r.json();
        if (cancelled) return;
        if (d.authed) {
          setAuthed(true); 
          setStage("waking");
        } else {
          setStage("auth");
          setShowAuth(true);
        }
      } catch {
        if (!cancelled) {
          setStage("auth");
          setShowAuth(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);


  async function handleLogout() {
    await fetch("/api/signout", { method: "POST" });
    setStage("auth");
    setShowAuth(true);
    setAuthed(false); 
  }

  function notify(msg) {
    let text;
    if (typeof msg === 'string') {
      text = msg;
    } else if (msg && typeof msg.message === 'string') {
      text = msg.message;
    } else {
      try {
        text = JSON.stringify(msg);
      } catch {
        text = String(msg);
      }
    }
    console.log('[HUB]', text ?? '(no message)');
  }

  if (stage === "checking") return null;
  if (stage === "waking") return <WakingScreen onReady={() => setStage("hub")} />;

  if (stage === "auth") {
    return (
      <div style={{ minHeight: "100dvh" }}>
        {showAuth && (
          <AuthModal
            onSuccess={() => {
              setAuthed(true);
              setShowAuth(false);
              setStage("waking");
            }}
            onClose={() => setShowAuth(false)}
          />
        )}
      </div>
    );
  }

  if (stage === "hub") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Header onLogout={handleLogout} />
        <Hub onMatch={() => setStage("ready")} onNotify={notify} />
      </div>
    );
  }

  // ready
  return (
    <div
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <Header onLogout={handleLogout} onHome={() => setStage('hub')} />
      <div style={{ flex: 1 }}>
        <AppContent authed={authed} />
      </div>
    </div>
  );
}
