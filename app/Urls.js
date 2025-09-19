"use client";
import React from "react";

function Urls({ offer }) {
    return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: "33px" }}>Urls :</h2>
    
          <div
            style={{
              maxHeight: "60vh",
              overflowY: "auto",
              paddingRight: "8px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              fontSize: "17px",
            }}
          >
            {offer.url.map((skill, i) => {
              const stop = (e) => e.stopPropagation();
              return (
                <a
                  key={i}
                  href={skill}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: "50vw",
                    display: "block",
                    cursor: "pointer",
                    touchAction: "manipulation",
                    marginTop: "30px"
                  }}
                  onTouchStartCapture={stop}
                  onTouchEndCapture={stop}
                  onPointerDownCapture={stop}
                  onPointerUpCapture={stop}

                  onMouseDown={stop}
                  onMouseUp={stop}
                  onClick={stop}
                >
                  {skill}
                </a>
              );
            })}
          </div>
        </div>
      );
}

export default Urls;