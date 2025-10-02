"use client";
import { useEffect, useState, useRef } from "react";
import { useDrafts } from "./hooks/draftsContext";

import TinderCard from "react-tinder-card";
import CardBody from "./cardOffer";

export default function ReviewPage({ authed }) {
  const startRef = useRef(null);
  const swipingRef = useRef(false);
  const decidedRef = useRef(new Map());
  const refreshInFlight = useRef(false);

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

  const [isUpload, setUpload] = useState(false);

  console.log("selectionList:", selectionList);

  const [serverSent, setServerSent] = useState({ accepted: [], rejected: [] });

  const [showAcceptedPreview, setShowAcceptedPreview] = useState(false);
  const [showRejectedPreview, setShowRejectedPreview] = useState(false);
  const [showAlreadySentPreview, setShowAlreadySentPreview] = useState(false);

  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);

  useEffect(() => {
    setHydrated(true);
    try {
      const arr = JSON.parse(localStorage.getItem("rejectedOffers") || "[]");
      setRejected(new Map(arr));
    } catch {}
  }, []);

  useEffect(() => {
    if (!authed) return;
    const ac = new AbortController();
    
    async function loadData() {
      refreshUserStatuses("default");
      try {
        const ts = Date.now();
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
    return () => ac.abort()
  }, [authed, isUpload]);

  const resetSwipesOnly = async () => {
    resetAll();
    setRejected(new Map());
    localStorage.removeItem("rejectedOffers");

    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("nbClick:"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}

    try {
      const res = await fetch("/api/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "default",
          offerId: "*",
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

  const filteredOffers = offers.filter((o) => {
    const id = getDraftId(o);
    const acc = (serverSent?.accepted ?? []).some((x) => x.id === id);
    const rej = (serverSent?.rejected ?? []).some((x) => x.id === id);
    return !(acc || rej);
  });

  const [mongoPreview, setMongoPreview] = useState({
    queued: [],
    rejected: [],
    sent: [],
  });

  const refetchTimerRef = useRef(null);
  function scheduleRefetch() {
    if (refetchTimerRef.current) return;
    refetchTimerRef.current = setTimeout(async () => {
      try {
        await refreshOffersFromMongo("default");
        await refreshUserStatuses("default");
      } finally {
        refetchTimerRef.current = null;
      }
    }, 200);
  }

  // console.log("offers:", offers);

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

  // console.log("OfferLength", offers.length);
  // console.log("filt:", filteredOffers);

  async function refreshUserStatuses(userId = "default") {
    try {
      const ts = Date.now();
      const res = await fetch(
        `/api/status?userId=${encodeURIComponent(userId)}&ts=${ts}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      const j = await res.json();
      setMongoPreview(j?.data || { queued: [], rejected: [], sent: [] });
    } catch (e) {
      console.error("[refreshUserStatuses] error:", e);
      setMongoPreview({ queued: [], rejected: [], sent: [] });
    }
  }

  async function refreshOffersFromMongo(userId = "default") {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const ts = Date.now();
      const res = await fetch(
        `/api/getOffers?userId=${encodeURIComponent(userId)}&ts=${ts}`,
        {
          cache: "no-store",
        }
      );
      if (!res.ok) throw new Error(`getOffers ${res.status}`);
      const json = await res.json();

      const next = Array.isArray(json?.data) ? json.data : [];
      setOffers(next);
      console.log("[refreshOffersFromMongo] got:", next.length);
    } catch (e) {
      console.error("[refreshOffersFromMongo] error:", e);
      setOffers([]);
    } finally {
      refreshInFlight.current = false;
    }
  }

  async function handleSwipe(dir, offer, i) {
    const draftId = getDraftId(offer);
    const draft = selectDraftById(draftId);
    const offerId = draftId;

    try {
      if (dir === "right") decidedRef.current.set(offerId, "queued");
      if (dir === "left") decidedRef.current.set(offerId, "rejected");
      const body = {
        userId: "default",
        offerId,
        status: decidedRef.current.get(offerId),
      };
      await fetch("/api/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.error("handleSwipe error:", e);
    }
  }

  async function handleSend() {
    try {
      setSending(true);
      setSentInfo(null);

      const ids = (mongoPreview.queued ?? []).map(idObj => getDraftId(idObj));

      const res = await fetch(`/api/sendApproved`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: ids.map((id) => ({ id })),
          userId: "default",
        }),
      });

      console.log("res", res);

      const ct = res.headers.get("content-type") || "";
      const json = ct.includes("application/json")
        ? await res.json()
        : { ok: false, error: await res.text() };
      if (!res.ok || !json?.ok)
        throw new Error(json?.error || `HTTP ${res.status}`);

      const receivedIds = Array.isArray(json.receivedIds) ? json.receivedIds : [];

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

        if (receivedIds.length !== 0) {
        const ids = selectionList.map((o) => getDraftId(o));
        const res2 = await fetch("/api/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: "default",
            offerIds: receivedIds,
            status: "sent",
          }),
        });
        const j2 = await res2.json().catch(() => ({}));
        if (!res2.ok || j2?.ok === false) {
          throw new Error(j2?.error || `status PATCH ${res2.status}`);
        }
        await refreshUserStatuses("default");
        await refreshOffersFromMongo("default");
        console.log("[handleSend] bulk status:", res2.status, j2);
      } else {
        console.warn("[handleSend] aucun ack webhook → pas de passage en 'sent'");
      }

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
          {[...filteredOffers]
            .sort((a, b) => {
              const A = getDraftId(a),
                B = getDraftId(b);
              return A < B ? -1 : A > B ? 1 : 0;
            })
            .map((offer) => (
              <TinderCard
                key={getDraftId(offer)}
                preventSwipe={["up", "down"]}
                flickOnSwipe={true}
                swipeRequirementType="velocity"
                onSwipe={async (dir) => {
                  if (swipingRef.current) return;
                  swipingRef.current = true;
                  await handleSwipe(dir, offer);
                }}
                onCardLeftScreen={async () => {
                  try {
                    const id = getDraftId(offer);
                    const decision = decidedRef.current.get(id);
                    if (decision === "queued") {
                      queueUp(id, offer);
                    } else if (decision === "rejected") {
                      queueDrop(id, offer);
                      setRejected((prev) => {
                        const next = new Map(prev);
                        next.set(id, offer);
                        persistRejected(next);
                        return next;
                      });
                    }

                    setOffers((prev) =>
                      prev.filter((o) => getDraftId(o) !== id)
                    );
                    scheduleRefetch();
                  } finally {
                    swipingRef.current = false;
                  }
                }}
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
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    transform: "translateZ(0)",
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
                sending || (mongoPreview.queued?.length ?? 0) === 0
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
                : `Envoyer selection (${mongoPreview.queued?.length ?? 0})`}
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
                {mongoPreview.queued?.length ?? 0})
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
                    {(mongoPreview.queued || []).map((o, idx) => (
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
                {mongoPreview.rejected?.length ?? 0})
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
                    {(mongoPreview.rejected || []).map((o, idx) => (
                      <li key={`${getDraftId(o)}-${idx}`}>
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
