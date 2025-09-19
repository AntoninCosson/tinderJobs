"use client";
import React, { useMemo } from "react";

export default function CvSkills({ offer }) {
  const skills = offer?.cvInfos?.[0]?.skills ?? {};

  const stop = (e) => e.stopPropagation();

  // Trie stable et insensible à la casse/accents
  const sortedKeys = useMemo(
    () => Object.keys(skills).sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })),
    [skills]
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h2 style={{ fontSize: "33px" }}>Skills sur ton CV :</h2>

      <div
      style={{
        width: "100%",
        maxWidth: 980,
        flex: 1,
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        touchAction: "pan-y",
        overscrollBehavior: "contain",
      }}
      onTouchStartCapture={stop}
      onTouchEndCapture={stop}
      onPointerDownCapture={stop}
      onPointerUpCapture={stop}
    >

          <div
            style={{
              maxHeight: "60vh",
              overflowY: "auto",
              fontSize: 20,
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {sortedKeys.map((k) => {
              const list = Array.isArray(skills[k]) ? skills[k] : [];
              const listSorted = [...list].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));

              return (
                <div key={k} style={{ marginBottom: 23}}>
                  <div style={{ fontSize: 23}}>
                    <strong>{k}</strong> ({list.length})
                  </div>
                  <ul style={{ margin: 10, paddingLeft: 0, fontSize: 17 }}>
                    {listSorted.map((v, i) => (
                      <div key={`${k}-${i}`} style={{margin: "5px"}}>
                        -{v}
                      </div>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
}