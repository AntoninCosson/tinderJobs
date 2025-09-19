import React, { useMemo, useRef, useEffect, useState } from "react";

export default function CvA4Page({ offer, newOffer, onClose }) {

  const stop = (e) => e.stopPropagation();

  const cv = offer?.cvInfos?.[0] ?? {};
  const p = cv.personal_info || {};
  const languages = Array.isArray(p.languages) ? p.languages : [];
  const diplomas = Array.isArray(cv.diplomas) ? cv.diplomas : [];
  const skills = cv.skills || {};
  const experiences = Array.isArray(cv.experiences) ? cv.experiences : [];


  // const langs = useMemo(() => {
  //   const arr = [];
  //   if (p.anglais) arr.push(`Anglais ${p.anglais}`);
  //   if (p.japonais) arr.push(`Japonais ${p.japonais}`);
  //   return arr;
  // }, [p.anglais, p.japonais]);

  // A4 @96dpi approx
  const BASE_W = 793.7008;   // 210mm
  const BASE_H = 1122.5197;  // 297mm

  const panelRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // contain: fit both width & height to keep full page visible
      const s = Math.min(w / BASE_W, h / BASE_H);
      setScale(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div>
      <button
        onClick={onClose}
        style={{ 
          position: "fixed", 
          top: 19, 
          right: 17, 
          zIndex: 10, 
          width: "10%", 
          height:"6%", 
          fontSize: 17,
          display: "flex",
          alignItems:"center",
          justifyContent:"center",
          borderRadius: 50
        }}
      >
      <div>X</div>
      </button>

      <div
        ref={panelRef}
        style={{
          width: "95vw",
          height: "100vh",
          display: "block",
          overflow: "hidden",
          position: "relative",
        }}
        onTouchStartCapture={stop}
        onTouchEndCapture={stop}
        onPointerDownCapture={stop}
        onPointerUpCapture={stop}
      >
      {/* Canvas */}
        <div style={{ height: `${BASE_H * scale}px`, position: "relative" }}>
          {/* A4 réel, centré, puis scale */}
          <div
            style={{
              position: "absolute",
              top: 130,
              left: "0%",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              width: `${BASE_W}px`,
              height: `${BASE_H}px`,
              background: "white",
              color: "black",
              border: "1px solid #eee",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              padding: "75.6px",
              boxSizing: "border-box",
            }}>

    {/* Name */}
          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <div style={{ fontSize: 40, letterSpacing: 1 }}>
              <span style={{ fontWeight: 400 }}>
                <strong>{(p.lastName || "").toString().toUpperCase()}</strong>
              </span>{" "}
              <span style={{ fontWeight: 300 }}>
                {p.firstName}
              </span>
            </div>

    {/* Titre/Status */}
            <div style={{
              display: "flex", 
              justifyContent: "center", 
              gap:"9px", fontSize: 20, 
              marginTop: 11, 
              marginBottom: 7
              }}>
                <div style={{ }}>
                  {p.status}
                </div>
                <div style={{ }}>
                  {p.statusSPE}
                </div>
            </div>
            

    {/* Coordonnées */}
            <div style={{ fontSize: 12, }}>
              {p.city && <span>{p.city} </span>}
              {p.zip && <span>- {p.zip} </span>}
              {p.driving && <span style={{ fontStyle: "italic" }}>({p.driving})</span>}
              {(p.email || p.phone || p.linkedIn || p.github) && <span>  </span>}
              {p.email && <span>{p.email}</span>}
              {p.phone && <span> | {p.phone} </span>}
            </div>

            <div style={{ fontSize: 12, marginTop: 5 }}>
              {p.linkedIn && <span> LinkedIn: {p.linkedIn} </span>}
              {p.github && <span> | GitHub: {p.github} </span>}
            </div>

    {/* Langues */}
            {languages?.length > 0 && (
              <div style={{ fontSize: 12, marginTop: 5 }}>
                {`${
                  languages
                    .map(l => {
                      const name  = String(l?.name || "").trim();
                      const level = String(l?.level || "").trim();
                      return level ? `${name} ${level}` : name;
                    })
                    .filter(Boolean)
                    .join(" | ")
                }`}
              </div>
            )}
          </div>
          


<div style={{ height: 17, }} />


          
{/* Diplômes */}

          {Array.isArray(diplomas) && diplomas.length > 0 && (
            <div style={{ marginBottom: 13, }}>

              <div style={{ fontSize: 18, marginBottom: 6, }}>
                {/* Diplômes : */}
              </div>

              <div style={{ marginTop: 0, paddingLeft: 0 }}>
                {diplomas.map((d, i) => (
                  <div 
                  key={i}
                  style={{
                    display:"flex",
                    alignItems: "center"
                  }}
                  >
                    <strong style={{marginRight: 11, marginTop: 4}}>
                      {d.titleDiploma}
                    </strong>

                    <div style={{marginRight: 7}}>
                    {d.school ? <> -  {d.school}</> : null}
                    </div>

                    <div style={{marginRight: 7}}>
                    {(d.locationSchool || d.datesDiplomas) && (
                      <> / <em>{[d.locationSchool, d.datesDiplomas].filter(Boolean).join(" ")}</em></>
                    )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


<div style={{ height: 13 }} />


{/* Skills */}

          {skills && Object.keys(skills).length > 0 && (
            <div style={{ }}>
              <div style={{ fontSize: 18, marginBottom: 6, }}>
                {/* Compétences : */}
              </div>

              {Object.entries(skills).map(([group, arr]) => (
                <div key={group} 
                style={{ 
                  marginBottom: 6, 
                  paddingLeft: 0 
                }}>
                  <div style={{ fontWeight: 600 }}>
                    {group.toUpperCase()} :
                  </div>

                  <div style={{ fontSize: 12, marginTop: 3.5, marginLeft: 10, marginBottom: 11 }}>
                    {Array.isArray(arr) ? arr.join(", ") : String(arr)}
                  </div>
                </div>
              ))}
            </div>
          )}


<div style={{ height: 13 }} />


{/* Expériences professionnelles */}
          {Array.isArray(experiences) && experiences.length > 0 && (
            <div>
              <div style={{ fontSize: 18, marginBottom: 6 }}>
                {/* Expériences Professionnelles : */}
              </div>
              {experiences.map((xp, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600 }}>

                    <div style={{ marginBottom: -3 }}>
                      {xp.titleXP}
                    </div>

                    <div>
                      {xp.dates && (
                        <span style={{ fontStyle: "italic", fontWeight: 200 , fontSize: 11}}>
                          {" "}{xp.dates}
                        </span>
                      )}
                    </div>

                  </div>
                  {(xp.tasks && xp.tasks.length > 0) && (
                    <div style={{ marginTop: 4, paddingLeft: 10 }}>
                      {xp.tasks.map((t, j) => 
                        <div style={{ marginTop: 5 }}
                          key={j}>
                            <div style={{ lineHeight: 1.05 }}>
                              - {t}
                            </div>
                        </div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}