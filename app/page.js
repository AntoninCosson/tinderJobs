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
  const selectionList  = useSelector(selectSelectionList);

  const [showAcceptedPreview, setShowAcceptedPreview] = useState(false);
  const [showRejectedPreview, setShowRejectedPreview] = useState(false);

  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);

  const resetSwipesOnly = () => {
    dispatch(clearSelection());
    setRejected(new Map());
    localStorage.removeItem("rejectedOffers");
    setOffers([]);
    setUpload((u) => !u); 

    // Forcer rerun de UseEffect Seulement outil Dev, décommenter:
    // setUpload((u) => !u);
  };


useEffect(() => {
  fetch("/api/getOffers")
    .then((res) => res.json())
    .then((data) => {
      const flat = (Array.isArray(data) ? data : [data])
        .map((x) => x?.Offer ?? x)
        .filter((o) => o && (o.offer || o.company));
      const acceptedIds = new Set((selectionList || []).map(getDraftId));
      const rejectedIds = rejected;
      const incoming = flat.filter(o => {
      const id = getDraftId(o);
        return !acceptedIds.has(id) && !rejectedIds.has(id);
      });
      setOffers(prev => {
          const prevMap = new Map(prev.map(o => [getDraftId(o), o]));
          for (const off of incoming) prevMap.set(getDraftId(off), off);
          return Array.from(prevMap.values());
        });
    });
  return;
}, [isUpload, selectionList, rejected]);
    
console.log("offers:", offers);
    


function deepClone(o){ return typeof structuredClone==="function" ? structuredClone(o) : JSON.parse(JSON.stringify(o||{})); }
function getDraftId(offer){
  return offer?.expectedName || `${offer?.cvInfos?.[0]?.personal_info?.firstName||""}_${offer?.company || offer?.offer || ""}`;
}
function persistRejected(nextMap){
    const arr = Array.from(nextMap.entries());
    localStorage.setItem("rejectedOffers", JSON.stringify(arr));
  }

console.log("OfferLength", offers.length)

async function handleSend() {
  try {
    setSending(true);
    setSentInfo(null);

    const res = await fetch("/api/sendApproved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: selectionList }),
    });

    const json = await res.json();
    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || `HTTP ${res.status}`);
    }

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
        style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 0 }}
      >
        <div
          style={{
            width: "99vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex:5
          }}
        >

          {offers.map((offer, i) => (
            
            <TinderCard
              key={getDraftId(offer)}
              onSwipe={(dir) => {
                const draftId = getDraftId(offer);
                const draft   = store.getState().drafts.byId[draftId];
                const payload = draft ?? deepClone(offer);
              
                if (dir === "right") {
                  console.log("SwipeRight", "id:", draftId, "data:", payload );
                  dispatch(queueUp({ id: draftId, data: payload }))
                }
                if (dir === "left")  {
                  console.log("SwipeLeft");
                  dispatch(queueDrop({ id: draftId }))
                  setRejected(prev => {
                     const next = new Map(prev);
                     next.set(draftId, payload);
                     persistRejected(next);
                     return next;
                  });
                }
                setOffers(prev => prev.filter((_, idx) => idx !== i));
              }}
              onCardLeftScreen={() => console.log(offer.company, offers.length, "left the screen")}

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
                  <CardBody 
                  offer={offer}
                  startRef={startRef}
                  />
              </div>
            </TinderCard>
          ))}
        </div>

        {offers.length === 0 && (
          <div style={{
            position:"absolute",
            display: "flex",
            flexDirection:"column",
            gap: 44,
            width:"50%",
            // top: "30%",
          }}>
          <button onClick={()=>{
            console.log("OfferSelected:", selectionList,)
            handleSend()
          }}
          disabled={sending || selectionList.length === 0}
          style={{
            zIndex: 10,
            fontSize: "19px",
            padding:"7%",
            color:"black",
          }}>
            {sending ? "Envoi en cours..." : `Envoyer selection (${selectionList.length})`}
        </button>

    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:17, zIndex: 10, }}>

      <button style={{ fontSize: "15px",padding:"5%", color:"black"}}
      onClick={()=> setShowAcceptedPreview(v=>!v)}>
        {showAcceptedPreview ? "Hide" : "Preview"} accepteds ({selectionCount})
      </button>

      {showAcceptedPreview && (
      <div style={{ maxHeight: "40vh", overflow:"auto", marginBottom: 20, padding:12, background:"#fff", borderRadius:8, boxShadow:"0 4px 12px rgba(0,0,0,.15)", minWidth:"66vw" }}>
        <h3 style={{ marginTop:0 }}>Accepted (right swipes)</h3>
        <ul style={{ margin:0, paddingLeft:18 }}>
          {selectionList.map((o, idx)=>(
            <li key={getDraftId(o)}>
              <strong>{o.company || o.offer}</strong>
              {o.description ? ` — ${o.description}` : ""} {o.postedAt ? ` (${o.postedAt})` : ""}
            </li>
          ))}
        </ul>
      </div>
    )}

      <button style={{ fontSize: "15px",padding:"5%", color:"black"}}
      onClick={()=> setShowRejectedPreview(v=>!v)}>
        {showRejectedPreview ? "Hide" : "Preview"} rejecteds ({Array.from(rejected).length})
      </button>

      {showRejectedPreview && (
      <div style={{ maxHeight: "40vh", overflow:"auto", padding:12, background:"#fff", borderRadius:8, boxShadow:"0 4px 12px rgba(0,0,0,.15)", minWidth:"66vw" }}>
        <h3 style={{ marginTop:0 }}>Rejected (left swipes)</h3>
        <ul style={{ margin:0, paddingLeft:18 }}>
        {Array.from(rejected.values()).map((o) => (
            <li key={getDraftId(o)}>
              <strong>{o.company || o.offer}</strong>
              {o.description ? ` — ${o.description}` : ""}
            </li>
          ))}
        </ul>
      </div>
    )}

      <button onClick={resetSwipesOnly}
        style={{
          marginTop:"20%",
          zIndex: 10,
          padding:"5%",

        }}>
      <div style={{ fontSize: "19px", color:"black"}}>
        Réinitialiser swipes
        </div>
      <div style={{ fontSize: "13px", color:"black"}}>
        (conserve les brouillons)
      </div>
    </button>

    </div>


  </div>
)}
        
    </div>
  </div>

  );
}