"use client";
import React from "react";

function softSkills({ offer }) {
    return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <h2 style={{ fontSize: "33px" }}>Soft Demandés :</h2>
    
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
            {Array.isArray(offer.offersSkill?.soft) &&
              offer.offersSkill.soft.map((skill, i) => (
                <p key={i} style={{ width: "70vw" }}>
                  {skill}
                </p>
              ))}
          </div>
        </div>
      );
}

export default softSkills;