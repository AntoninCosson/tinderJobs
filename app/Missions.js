"use client";
import React from "react";

function Missions({ offer }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h2 style={{ fontSize: "33px" }}>Missions :</h2>

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
        {offer.tasks.map((skill, i) => (
            <p key={i} style={{ width: "70vw" }}>
              {skill}
            </p>
          ))}
      </div>
    </div>
  );
}

export default Missions;