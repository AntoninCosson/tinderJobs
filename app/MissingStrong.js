"use client";
import React from "react";

function MissingStrong({ offer }) {
    return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: "33px" }}>Manquants :</h2>
    
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
            {offer.missingStrong.map((miss, i) => (
                <p key={i} style={{ width: "70vw" }}>
                  {miss}
                </p>
              ))}
          </div>
        </div>
      );
}

export default MissingStrong;