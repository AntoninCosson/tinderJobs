"use client";
import { useEffect, useState } from "react";
import CoffeeLoader from "@/app/CoffeeLoader";

function mapStatus(respOk, status) {
  if (respOk) return "ok";
  if (status === 503) return "waiting";
  return "fail";
}

export default function WakingScreen({ onReady }) {
  const [n8n, setN8n] = useState({ state: "waiting", status: null });
  const [py, setPy] = useState({ state: "waiting", status: null });
  const [dots, setDots] = useState("");

  const awakeCount = (n8n.state === "ok" ? 1 : 0) + (py.state === "ok" ? 1 : 0);

  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const r = await fetch("/api/schedule", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (!stop && r.ok && j?.ok) {
          const sched = j.data?.[0] || null;
          sessionStorage.setItem("schedule", JSON.stringify(sched));
        }
      } catch {}
    })();
    return () => {
      stop = true;
    };
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % 4;
      setDots(".".repeat(i));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let stop = false;

    async function tick() {
      try {
        const [r1, r2] = await Promise.allSettled([
          fetch("/api/n8n-health", { cache: "no-store" }),
          fetch("/api/py-health", { cache: "no-store" }),
        ]);

        if (stop) return;

        if (r1.status === "fulfilled") {
          const resp = r1.value;
          setN8n({
            state: mapStatus(resp.ok, resp.status),
            status: resp.status,
          });
        } else {
          setN8n({ state: "fail", status: null });
        }

        if (r2.status === "fulfilled") {
          const resp = r2.value;
          setPy({
            state: mapStatus(resp.ok, resp.status),
            status: resp.status,
          });
        } else {
          setPy({ state: "fail", status: null });
        }
      } catch {
        if (!stop) {
          setN8n({ state: "fail", status: null });
          setPy({ state: "fail", status: null });
        }
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (
      n8n.state === "ok" &&
      py.state === "ok" &&
      typeof onReady === "function"
    ) {
      onReady();
    }
  }, [n8n.state, py.state, onReady]);

  const Dot = ({ state }) => {
    const color =
      state === "ok" ? "#16a34a" : state === "waiting" ? "#f59e0b" : "#ef4444";
    return (
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: 9999,
          background: color,
          boxShadow:
            state === "waiting" ? "0 0 0 4px rgba(245,158,11,.2)" : "none",
        }}
      />
    );
  };

  const Label = ({ state, status }) => {
    if (state === "ok") return <small style={{ opacity: 0.7 }}>OK</small>;
    if (state === "waiting") {
      return (
        <small style={{ opacity: 0.7 }}>
          en attente
          {/* {status ? ` (${status})` : ""} */}
        </small>
      );
    }
    return <small style={{ opacity: 0.7 }}>erreur</small>;
  };

  const okCount = (n8n.state === "ok" ? 1 : 0) + (py.state === "ok" ? 1 : 0);
  const level = okCount / 2;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        top: 0,
      }}
    >
      <div style={{ textAlign: "center", marginTop: -33 }}>
        <CoffeeLoader level={level} awakeCount={awakeCount} />
        <div style={{ marginBottom: 12, marginLeft: 10, fontWeight: 600 }}>
          Réveil des services
          <span
            style={{
              display: "inline-block",
              minWidth: "20px",
              textAlign: "left",
            }}
          >
            {dots}
          </span>
        </div>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          <li
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Dot state={n8n.state} />
            <span>n8n API</span>
            <Label state={n8n.state} status={n8n.status} />
          </li>
          <li
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Dot state={py.state} />
            <span>Python API</span>
            <Label state={py.state} status={py.status} />
          </li>
        </ul>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 12 }}>
          Cela peut prendre 30 à 60 secondes
        </div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
          pour que les services se réveillent.
        </div>
      </div>
    </div>
  );
}
