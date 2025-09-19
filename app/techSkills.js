"use client";
import React from "react";

function CardTechSkills({ offer }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <h2 style={{ fontSize: "33px" }}>Tech utilisées :</h2>

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
        {Array.isArray(offer.offersSkill?.tech) &&
          offer.offersSkill.tech.map((skill, i) => (
            <p key={i} style={{ width: "70vw" }}>
              {skill}
            </p>
          ))}
      </div>
    </div>
  );
}

export default CardTechSkills;