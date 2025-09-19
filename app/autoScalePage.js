import React, { useRef, useState, useEffect } from "react";

function AutoScalePage({ children, baseWidth = 793.7, baseHeight = 1122.5 }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const { clientWidth } = el;
      const s = clientWidth / baseWidth;  // scale relatif à la largeur
      setScale(s);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        position: "relative",
      }}
    >
      {/* Viewport qui réserve la place */}
      <div style={{ height: baseHeight * scale }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: "top left",
            width: baseWidth,
            height: baseHeight,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default AutoScalePage;