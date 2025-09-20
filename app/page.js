"use client";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { store } from "./store/store";
import {
  queueUp,
  queueDrop,
  clearSelection,
  selectSelectionCount,
  selectSelectionList,
  markAsSent,
} from "./store/draftsSlice";
import { persistor } from "./store/store";

import TinderCard from "react-tinder-card";
import CardBody from "./cardOffer";

export default function ReviewPage() {
  const dispatch = useDispatch();

  const startRef = useRef(null);

  const [offers, setOffers] = useState([]);
  const [rejected, setRejected] = useState(() => {
    try {
      const arr = JSON.parse(localStorage.getItem("rejectedOffers") || "[]");
      return new Map(arr);
    } catch {
      return new Map();
    }
  });
  const [isUpload, setUpload] = useState(false);

  const selectionCount = useSelector(selectSelectionCount);
  const selectionList = useSelector(selectSelectionList);
  console.log("selectionList:", selectionList)
  const [serverSent, setServerSent] = useState({ accepted: [], rejected: [] });
  // const alreadySent = useSelector((state) => state.drafts.alreadySent) || {
  //   accepted: [],
  //   rejected: [],
  // };

  const [showAcceptedPreview, setShowAcceptedPreview] = useState(false);
  const [showRejectedPreview, setShowRejectedPreview] = useState(false);
  const [showAlreadySentPreview, setShowAlreadySentPreview] = useState(false);

  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);

  const draftsById = useSelector((s) => s.drafts.byId || {});

  const resetSwipesOnly = () => {
    dispatch(clearSelection());
    setRejected(new Map());
    localStorage.removeItem("rejectedOffers");
    setOffers([]);
    setUpload((u) => !u);
  };

  function normalizeOffersPayload(offersJson) {
    if (Array.isArray(offersJson)) {
      if (offersJson.length && offersJson[0]?.Offer) {
        return offersJson.map(x => x.Offer);
      }
      return offersJson;
    }
    if (Array.isArray(offersJson.offers)) return offersJson.offers;
    if (Array.isArray(offersJson.data?.offers)) return offersJson.data.offers;
    return [];
  }

  useEffect(() => {
    async function loadData() {
      try {
        const ts = Date.now(); // cache-busting
        const [offersRes, sentRes] = await Promise.all([
          fetch(`/api/getOffers?ts=${ts}`, { cache: "no-store" }),
          fetch(`/api/alreadySent?userId=default&ts=${ts}`, { cache: "no-store" }),
        ]);
  
        const offersJson = await offersRes.json();
        const sentJson   = await sentRes.json();
        if (!offersRes.ok) throw new Error(`getOffers ${offersRes.status}`);
        if (!sentRes.ok)   throw new Error(`alreadySent ${sentRes.status}`);
  
        const list = normalizeOffersPayload(offersJson);
        console.log("offersJson (raw):", offersJson);
        console.log("list (normalized):", list);
  
        const sent = sentJson?.data
          ? sentJson.data
          : { accepted: sentJson.accepted || [], rejected: sentJson.rejected || [] };
        setServerSent(sent);
  
        const alreadyIds = new Set([
          ...sent.accepted.map(o => o.id),
          ...sent.rejected.map(o => o.id),
        ]);

        const seen = new Set();
        const dedup = [];
        for (const o of list) {
          const id = getDraftId(o);
          if (!id) continue;
          if (seen.has(id)) continue;
          seen.add(id);
          dedup.push(o);
        }

        console.log("alreadyIds:", [...alreadyIds]);
  
        const filtered = dedup.filter(o => !alreadyIds.has(getDraftId(o)));
        console.log("filtered:", filtered.length);
  
        setOffers(filtered);
      } catch (err) {
        console.error("loadData error:", err);
        setServerSent({ accepted: [], rejected: [] });
        setOffers([]);
      }
    }
    loadData();
  }, [isUpload]);




  console.log("offers:", offers);
  // console.log("alreadySent", alreadySent)

  function deepClone(o) {
    return typeof structuredClone === "function"
      ? structuredClone(o)
      : JSON.parse(JSON.stringify(o || {}));
  }

  function deepMerge(base, override) {
    if (Array.isArray(base) && Array.isArray(override)) return override; // remplace les arrays
    if (base && typeof base === "object" && override && typeof override === "object") {
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
    const acc = (serverSent?.accepted ?? []).some(x => x.id === id);
    const rej = (serverSent?.rejected ?? []).some(x => x.id === id);
      return !(acc || rej);
  });

console.log("filt:", filteredOffers);

  async function handleSend() {
    try {
      setSending(true);
      setSentInfo(null);
  
      // Envoie EXACTEMENT ce que tu as sélectionné (objets complets)
      const res = await fetch("/api/sendApproved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selectionList }),
      });

      console.log("res", res)
  
      const ct = res.headers.get("content-type") || "";
      const json = ct.includes("application/json") ? await res.json() : { ok:false, error: await res.text() };
      if (!res.ok || !json?.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      const acceptedDrafts = selectionList.map((o) => ({
        id: getDraftId(o),
        company: o.company,
        offer: o.offer,
        description: o.description,
        postedAt: o.postedAt,
      }));
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

      console.log("save", save)

      const saveCT = save.headers.get("content-type") || "";
      const saved = saveCT.includes("application/json") ? await save.json() : { ok:false, error: await save.text() };
      if (!save.ok || !saved?.ok) throw new Error(saved?.error || `save ${save.status}`);

      fetch("/api/alreadySent?userId=default")
      .then(r => r.json())
      .then(j => {
        setServerSent(j?.data ?? { accepted: [], rejected: [] })
        console.log("/api/alreadySent?userId=default:", j)
      
      })
      .catch(() => { /* noop */ });

      // reset UI (comme avant)
      dispatch(clearSelection());
      setRejected(new Map());
      localStorage.removeItem("rejectedOffers");
      setOffers([]);
      setUpload(u => !u);
  
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
              onSwipe={(dir) => {
                const draftId = getDraftId(offer);
                const draft = store.getState().drafts.byId[draftId];
                const payload = draft ? deepMerge(offer, draft) : deepClone(offer);

                if (dir === "right") {
                  console.log("SwipeRight", "id:", draftId, "data:", payload);
                  dispatch(queueUp({ id: draftId, data: payload }));
                }
                if (dir === "left") {
                  console.log("SwipeLeft");
                  const draftId = getDraftId(offer);
                  const payload = draft ? deepMerge(offer, draft) : deepClone(offer);
                
                  dispatch(queueDrop({ id: draftId }));
                  
                  // ajout côté alreadySent.rejected
                  dispatch(markAsSent({
                    rejected: [{
                      id: draftId,
                      company: payload.company,
                      offer: payload.offer,
                      description: payload.description,
                      postedAt: payload.postedAt
                    }]
                  }));
                
                  setRejected((prev) => {
                    const next = new Map(prev);
                    next.set(draftId, payload);
                    persistRejected(next);
                    return next;
                  });
                }
                setOffers((prev) => prev.filter((_, idx) => idx !== i));
              }}
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
              disabled={sending || selectionList.length === 0}
              style={{
                zIndex: 10,
                fontSize: "19px",
                padding: "7%",
                color: "black",
              }}
            >
              {sending
                ? "Envoi en cours..."
                : `Envoyer selection (${selectionList.length})`}
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
                  {(serverSent.accepted?.length ?? 0) + (serverSent.rejected?.length ?? 0)}
                )
              </button>


              <div style={{width:"76vw"}}>
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
                  <h3 style={{ marginTop: 0, paddingTop: 17, paddingLeft: 7 }}>Already Sent</h3>
                  <h4 style={{padding: 12,}}>Sent</h4>
                  <ul style={{ margin: 0, paddingLeft: 28, paddingRight: 28 }}>
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
