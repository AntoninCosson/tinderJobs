"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useDrafts } from "./hooks/draftsContext";


import Missions from "./Missions";
import CardTechSkills from "./techSkills";
import SoftSkills from "./softskills";
import Cvkills from "./cvSkills";
import MissingStrong from "./MissingStrong";
import MatchScore from "./MatchScore";
import Urls from "./Urls";
import ManualChanges from "./ManualChanges";


function deepClone(o) {
    return typeof structuredClone === "function"
      ? structuredClone(o)
      : JSON.parse(JSON.stringify(o || {}));
  }
  
  function getDraftId(offer) {
    return (
      offer?.expectedName ||
      `${offer?.cvInfos?.[0]?.personal_info?.firstName || ""}_${
        offer?.company || offer?.offer || ""
      }`
    );
  }

function CardBody({ offer, startRef }) {

  const {
    selectDraftById, replaceDraft, resetDraft, queueUp, queueDrop, markAsSent
  } = useDrafts();
  
  const draft = selectDraftById(getDraftId(offer));

  const draftId = getDraftId(offer);


  const [nbClick, setNbClick] = useState(0);

  const getPoint = (e) =>
    e.touches?.[0]
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : e.changedTouches?.[0]
      ? { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY }
      : { x: e.clientX, y: e.clientY };
  
  const isFromInteractive = (el) =>
    el.closest?.(
      "a, button, input, textarea, select, label, [role='button'], [role='link']"
    );
  
  const onPointerDown = (e) => {
    if (isFromInteractive(e.target)) return;
    const p = getPoint(e);
    startRef.current = { x: p.x, y: p.y, t: performance.now() };
  };
  
  const onPointerUp = (e) => {
    if (isFromInteractive(e.target)) return;
    const s = startRef.current;
    if (!s) return;
  
    const p = getPoint(e);
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const dt = performance.now() - s.t;
    const moved = Math.hypot(dx, dy) > 8;
    const tooLong = dt > 300;
    if (moved || tooLong) {
      startRef.current = null;
      return;
    }
  
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = s.x - rect.left;
    const localY = s.y - rect.top;
    const inVertical = localY >= 0 && localY <= rect.height;
    const isLeft = inVertical && localX >= 0 && localX < rect.width / 2;
    const isRight =
      inVertical && localX >= rect.width / 2 && localX <= rect.width;

    if (isLeft) {
      setNbClick((prev) => Math.max(0, prev - 1));
    }
    if (isRight) {
      setNbClick((prev) => Math.min(8, prev + 1));
    }

    startRef.current = null;
  };

    const setNewOffer = useCallback((updater) => {
      const current = draft ?? deepClone(offer);
      const next = typeof updater === "function" ? updater(current) : updater;
      replaceDraft(draftId, next);
    }, [draft, draftId, offer, replaceDraft]);
    const newOffer = draft ?? deepClone(offer);

  function AutoResizeText({ children, maxFontSize = 33, minFontSize = 21, style = {} }) {
    const ref = useRef(null);
    const [fontSize, setFontSize] = useState(maxFontSize);
  
    useEffect(() => {
      const el = ref.current;
      if (!el) return;
  
      let size = maxFontSize;
      setFontSize(size);
  
      const id = requestAnimationFrame(() => {
        while (el.scrollWidth > el.clientWidth && size > minFontSize) {
          size -= 1;
        }
        setFontSize(size);
      });
  
      return () => cancelAnimationFrame(id);
    }, [children, maxFontSize, minFontSize]);


     
  
    return (
      <h2
        ref={ref}
        style={{
          fontSize,
          width: "80%",
          whiteSpace: "normal",
          wordWrap: "break-word",
          overflow: "hidden",
          WebkitTextSizeAdjust: "none",
          textSizeAdjust: "none",
          ...style,
        }}
      >
        {children}
      </h2>
    );
  }

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignContent: "center",
        justifyContent: "center",
        flexDirection: "column",
        textAlign: "center",
        background:
          "linear-gradient(45deg, rgba(253,41,123), rgba(255,88,100), rgba(255,101,91))",
        borderRadius: 20,
        boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
        position: "absolute",
        width: "88vw",
        height: "80vh",
        overflow: "hidden",
        position: "fixed",
        transform: "translate(0%, -1%)",
      }}
      onMouseDown={onPointerDown}
      onMouseUp={onPointerUp}
      onTouchStart={onPointerDown}
      onTouchEnd={onPointerUp}
    >
      {nbClick === 0 && (
        <>
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                }}>
        
            <div                     
                style={{
                width: "70%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                }}>

                <AutoResizeText maxFontSize={33}>
                    {offer.company}
                </AutoResizeText>

                <p style={{fontSize: "23px"}}>
                    {offer.description}
                </p>

                <p style={{fontSize: "27px"}}>
                    {offer.postedAt}
                </p>

                <p style={{fontSize: "27px"}}>
                    {offer.location}
                </p>
            </div>
        </div>
        </>
      )}

    {nbClick === 1 && <Missions offer={offer} />}

    {nbClick === 2 && <CardTechSkills offer={offer} />}

    {nbClick === 3 && <SoftSkills offer={offer} />}

    {nbClick === 4 && <Cvkills offer={offer} />}

    {nbClick === 5 && <MissingStrong offer={offer} />}

    {nbClick === 6 && <MatchScore offer={offer} />}

    {nbClick === 7 && <Urls offer={offer} />}

    {nbClick === 8 && (
        <ManualChanges
         offer={offer}
         newOffer={newOffer}
         setNewOffer={setNewOffer}
        />
    )}
    

    </div>
  );
}

export default CardBody;
