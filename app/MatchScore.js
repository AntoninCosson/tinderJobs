"use client";
import React from "react";

function MatchScore({ offer }) {

  const metrics = offer?.mathingScore?.metrics ?? {};
  const keysToShow = ["overlapTech", "techRatio", "jaccardTech"]; 

    return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: "33px" }}>Matching Scores :</h2>
    
          <div
            style={{
              maxHeight: "60vh",
              overflowY: "auto",
              paddingRight: "8px",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              fontSize: "20px",
            }}
          >
          <p style={{fontSize: "27px"}}><strong>Score : </strong>{offer.mathingScore.score}</p>
          <p style={{ fontSize: "25px", marginBottom: "10px" }}>
          <strong>Overlap :</strong>
            </p>

            {(() => {
              const overlap = offer?.overlap ?? offer?.mathingScore?.overlap ?? {};
              const tech = overlap?.tech ?? [];
              const soft = overlap?.soft ?? [];
            
              return (
                <div style={{ width: "70vw", paddingLeft: 16 }}>
                  <p style={{ margin: "7px", fontSize: "17px" }}>
                    <strong>Tech</strong> ({tech.length}) :
                    {" "}
                    {tech.length ? tech.join(", ") : "None"}
                  </p>
                  <p style={{ margin: "7px", fontSize: "17px" }}>
                    <strong>Soft</strong> ({soft.length}) :
                    {" "}
                    {soft.length ? soft.join(", ") : "None"}
                  </p>
                </div>
              );
            })()}

          <p style={{fontSize: "25px", marginBottom: "10px"}}><strong>Missing Skills:</strong></p>
          <ul style={{ width: "70vw", paddingLeft: 16 }}>
          {offer.missingStrong.map((miss, i) => (
                <p key={i} style={{ 
                  margin: "7px",
                  fontSize: "17px"
                  }}>
                  {miss}
                </p>
              ))}
          </ul>
          </div>
        </div>
      );
}

export default MatchScore;