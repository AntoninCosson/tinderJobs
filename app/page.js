"use client";
import { useEffect, useState, useRef } from "react";
import { useDrafts } from "./hooks/draftsContext";

import TinderCard from "react-tinder-card";
import CardBody from "./cardOffer";

export default function ReviewPage() {
  const startRef = useRef(null);

  const {
    selectionCount,
    selectionList,
    selectDraftById,
    queueUp,
    queueDrop,
    clearSelection,
    markAsSent,
    resetAll,
  } = useDrafts();

  const [offers, setOffers] = useState([]);
  const [rejected, setRejected] = useState(new Map());
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    try {
      const arr = JSON.parse(localStorage.getItem("rejectedOffers") || "[]");
      setRejected(new Map(arr));
    } catch {}
  }, []);

  const [isUpload, setUpload] = useState(false);

  console.log("selectionList:", selectionList);

  const [serverSent, setServerSent] = useState({ accepted: [], rejected: [] });

  const [showAcceptedPreview, setShowAcceptedPreview] = useState(false);
  const [showRejectedPreview, setShowRejectedPreview] = useState(false);
  const [showAlreadySentPreview, setShowAlreadySentPreview] = useState(false);

  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);

  const resetSwipesOnly = async () => {
    resetAll();
    setRejected(new Map());
    localStorage.removeItem("rejectedOffers");

    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("nbClick:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}

    // reset Mongo
    try {
      const res = await fetch("/api/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default",
          offerId: "*", // ou un flag spécial
          status: "unread",
        }),
      });
      console.log("[resetSwipesOnly] reset response:", await res.json());
    } catch (err) {
      console.error("[resetSwipesOnly] reset error:", err);
    }

    setOffers([]);
    setUpload((u) => !u);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const ts = Date.now(); // cache-busting
        const [offersRes, sentRes] = await Promise.all([
          fetch(`/api/getOffers?userId=default&ts=${ts}`, {
            cache: "no-store",
          }),
          fetch(`/api/alreadySent?userId=default&ts=${ts}`, {
            cache: "no-store",
          }),
        ]);

        const offersJson = await offersRes.json();
        const sentJson = await sentRes.json();
        if (!offersRes.ok) throw new Error(`getOffers ${offersRes.status}`);
        if (!sentRes.ok) throw new Error(`alreadySent ${sentRes.status}`);

        const list = offersJson?.data ?? [];
        setOffers(list);
        console.log("offersJson (raw):", offersJson);
        console.log("list (normalized):", list);

        const sent = sentJson?.data
          ? sentJson.data
          : {
              accepted: sentJson.accepted || [],
              rejected: sentJson.rejected || [],
            };
        setServerSent(sent);

        const alreadyIds = new Set([
          ...sent.accepted.map((o) => o.id),
          ...sent.rejected.map((o) => o.id),
        ]);

        console.log("alreadyIds:", [...alreadyIds]);
      } catch (err) {
        console.error("loadData error:", err);
        setServerSent({ accepted: [], rejected: [] });
        setOffers([]);
      }
    }
    loadData();
  }, [isUpload]);

  console.log("offers:", offers);

  function deepClone(o) {
    return typeof structuredClone === "function"
      ? structuredClone(o)
      : JSON.parse(JSON.stringify(o || {}));
  }

  function deepMerge(base, override) {
    if (Array.isArray(base) && Array.isArray(override)) return override;
    if (
      base &&
      typeof base === "object" &&
      override &&
      typeof override === "object"
    ) {
      const out = { ...base };
      for (const k of Object.keys(override)) {
        out[k] = deepMerge(base[k], override[k]);
      }
      return out;
    }
    return override === undefined ? base : override;
  }

  function getDraftId(offer) {
    return (
      offer?.expectedName ||
      `${offer?.cvInfos?.[0]?.personal_info?.firstName || ""}_${
        offer?.company || offer?.offer || ""
      }`
    );
  }

  function persistRejected(nextMap) {
    const arr = Array.from(nextMap.entries());
    localStorage.setItem("rejectedOffers", JSON.stringify(arr));
  }

  console.log("OfferLength", offers.length);

  const filteredOffers = offers.filter((o) => {
    const id = getDraftId(o);
    const acc = (serverSent?.accepted ?? []).some((x) => x.id === id);
    const rej = (serverSent?.rejected ?? []).some((x) => x.id === id);
    return !(acc || rej);
  });

  console.log("filt:", filteredOffers);

  async function handleSwipe(dir, offer, i) {
    const draftId = getDraftId(offer);
    const draft = selectDraftById(draftId);
    const payload = draft ? deepMerge(offer, draft) : deepClone(offer);
    const offerId = draftId;

    try {
      if (dir === "right") {
        queueUp(draftId, payload);

        const body = {
          userId: "default",
          offerId,
          status: "queued",
        };

        console.log("[handleSwipe] PATCH → /api/status", body);

        try {
          const res = await fetch("/api/status", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          console.log("[handleSwipe] response status:", res.status);

          const text = await res.text();
          console.log("[handleSwipe] response body:", text);
        } catch (err) {
          console.error("[handleSwipe] fetch error:", err);
        }
      }

      if (dir === "left") {
        queueDrop(draftId, payload);

        const body = {
          userId: "default",
          offerId,
          status: "rejected",
        };

        console.log("[handleSwipe] PATCH → /api/status", body);

        try {
          const res = await fetch("/api/status", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          console.log("[handleSwipe] response status:", res.status);

          const text = await res.text();
          console.log("[handleSwipe] response body:", text);
        } catch (err) {
          console.error("[handleSwipe] fetch error:", err);
        }

        setRejected((prev) => {
          const next = new Map(prev);
          next.set(draftId, payload);
          persistRejected(next);
          return next;
        });
      }

      setOffers((prev) => prev.filter((_, idx) => idx !== i));
    } catch (e) {
      console.error("handleSwipe error:", e);
    }
  }

  async function handleSend() {
    try {
      setSending(true);
      setSentInfo(null);

      const res = await fetch(`/api/sendApproved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectionList }),
      });

      console.log("res", res);

      const ct = res.headers.get("content-type") || "";
      const json = ct.includes("application/json")
        ? await res.json()
        : { ok: false, error: await res.text() };
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || `HTTP ${res.status}`);

      const acceptedDrafts = selectionList.map((o) => ({
        id: getDraftId(o),
        company: o.company,
        offer: o.offer,
        description: o.description,
        postedAt: o.postedAt,
        location: o.location,
      }));

      console.log("acceptedDrafts:", acceptedDrafts);
      const rejectedDrafts = Array.from(rejected.values()).map((o) => ({
        id: getDraftId(o),
        company: o.company,
        offer: o.offer,
        description: o.description,
        postedAt: o.postedAt,
      }));

      const save = await fetch("/api/alreadySent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default",
          accepted: acceptedDrafts,
          rejected: rejectedDrafts,
        }),
      });

      console.log("save", save);

      const saveCT = save.headers.get("content-type") || "";
      const saved = saveCT.includes("application/json")
        ? await save.json()
        : { ok: false, error: await save.text() };
      if (!save.ok || !saved?.ok)
        throw new Error(saved?.error || `save ${save.status}`);

      fetch("/api/alreadySent?userId=default")
        .then((r) => r.json())
        .then((j) => {
          setServerSent(j?.data ?? { accepted: [], rejected: [] });
          console.log("/api/alreadySent?userId=default:", j);
        })
        .catch(() => {
          /* noop */
        });

      clearSelection();
      setRejected(new Map());
      localStorage.removeItem("rejectedOffers");
      setOffers([]);
      setUpload((u) => !u);

      setSentInfo({ ok: true, count: json.count });
    } catch (e) {
      console.error("send error:", e);
      setSentInfo({ ok: false, error: e.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: 0,
        }}
      >
        <div
          style={{
            width: "99vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 5,
          }}
        >
          {filteredOffers.map((offer, i) => (
            <TinderCard
              key={`${getDraftId(offer)}-${i}`}
              onSwipe={(dir) => handleSwipe(dir, offer, i)}
              onCardLeftScreen={() =>
                console.log(offer.company, offers.length, "left the screen")
              }
              preventSwipe={["up", "down"]}
            >
              <div
                style={{
                  top: -60,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(253, 41, 123, 0.8)",
                  borderRadius: 20,
                  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                  position: "absolute",
                  pointerEvents: "auto",
                }}
              >
                <CardBody offer={offer} startRef={startRef} />
              </div>
            </TinderCard>
          ))}
        </div>

        {filteredOffers.length === 0 && (
          <div
            style={{
              position: "absolute",
              display: "flex",
              flexDirection: "column",
              gap: 44,
              width: "50%",
              // top: "30%",
            }}
          >
            <button
              onClick={() => {
                console.log("OfferSelected:", selectionList);
                handleSend();
              }}
              disabled={
                sending || (!hydrated ? true : selectionList.length === 0)
              }
              style={{
                zIndex: 10,
                fontSize: "19px",
                padding: "7%",
                color: "black",
              }}
            >
              {sending
                ? "Envoi en cours..."
                : `Envoyer selection (${hydrated ? selectionList.length : 0})`}
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 17,
                zIndex: 10,
              }}
            >
              <button
                style={{ fontSize: "15px", padding: "5%", color: "black" }}
                onClick={() => setShowAcceptedPreview((v) => !v)}
              >
                {showAcceptedPreview ? "Hide" : "Preview"} accepteds (
                {selectionCount})
              </button>

              {showAcceptedPreview && (
                <div
                  style={{
                    maxHeight: "40vh",
                    overflow: "auto",
                    marginBottom: 20,
                    padding: 12,
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                    minWidth: "66vw",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Accepted (right swipes)</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {selectionList.map((o, idx) => (
                      <li key={`${getDraftId(o)}-${idx}`}>
                        <strong>{o.company || o.offer}</strong>
                        {o.description ? ` — ${o.description}` : ""}{" "}
                        {o.postedAt ? ` (${o.postedAt})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                style={{ fontSize: "15px", padding: "5%", color: "black" }}
                onClick={() => setShowRejectedPreview((v) => !v)}
              >
                {showRejectedPreview ? "Hide" : "Preview"} rejecteds (
                {Array.from(rejected).length})
              </button>

              {showRejectedPreview && (
                <div
                  style={{
                    maxHeight: "40vh",
                    overflow: "auto",
                    marginBottom: 20,
                    padding: 12,
                    background: "#fff",
                    borderRadius: 8,
                    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                    minWidth: "66vw",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Rejected (left swipes)</h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {Array.from(rejected.values()).map((o) => (
                      <li key={getDraftId(o)}>
                        <strong>{o.company || o.offer}</strong>
                        {o.description ? ` — ${o.description}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* reset */}
              <button
                onClick={resetSwipesOnly}
                style={{
                  marginTop: "20%",
                  zIndex: 10,
                  padding: "5%",
                }}
              >
                <div style={{ fontSize: "19px", color: "black" }}>
                  Réinitialiser swipes
                </div>
                <div style={{ fontSize: "13px", color: "black" }}>
                  (conserve les brouillons)
                </div>
              </button>

              <button
                style={{ fontSize: "15px", padding: "5%", color: "black" }}
                onClick={() => setShowAlreadySentPreview((v) => !v)}
              >
                {showAlreadySentPreview ? "Hide" : "Show"} already sent (
                {(serverSent.accepted?.length ?? 0) +
                  (serverSent.rejected?.length ?? 0)}
                )
              </button>

              <div style={{ width: "76vw" }}>
                {showAlreadySentPreview && (
                  <div
                    style={{
                      maxHeight: "40vh",
                      overflow: "auto",
                      marginBottom: 20,
                      padding: 0,
                      background: "#fff",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                      minWidth: "66vw",
                    }}
                  >
                    <h3
                      style={{ marginTop: 0, paddingTop: 17, paddingLeft: 7 }}
                    >
                      Already Sent
                    </h3>
                    <h4 style={{ padding: 12 }}>Sent</h4>
                    <ul
                      style={{ margin: 0, paddingLeft: 28, paddingRight: 28 }}
                    >
                      {(serverSent.accepted ?? []).map((o, idx) => (
                        <li key={`${o.id}-accepted-${idx}`}>
                          <strong>{o.company || o.offer}</strong>
                          {o.description ? ` — ${o.description}` : ""}
                        </li>
                      ))}
                    </ul>
                    <h4>Rejected</h4>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(serverSent.rejected ?? []).map((o, idx) => (
                        <li key={`${o.id}-rejected-${idx}`}>
                          <strong>{o.company || o.offer}</strong>
                          {o.description ? ` — ${o.description}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
