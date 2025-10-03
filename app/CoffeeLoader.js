"use client";
import { useEffect, useRef, useState, Fragment } from "react";

export default function CoffeeLoader({
  awakeCount = 0,
  speed = 0.03,
  intervalMs = 60,
}) {
  const [anim, setAnim] = useState(0);
  const targetRef = useRef(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setPhase((p) => (p + speed) % 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [speed, intervalMs]);

  useEffect(() => {
    if (awakeCount === 0) setPhase(0);
  }, [awakeCount]);

  useEffect(() => {
    const id = setInterval(() => {
      setAnim((a) => {
        const t = targetRef.current;
        const diff = t - a;
        if (Math.abs(diff) < 0.005) return t;
        return a + Math.sign(diff) * speed;
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [speed, intervalMs]);

  const FIXED_ROWS = 3;
  const width = 5;

  const BLOCKS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
  const STEPS = BLOCKS.length - 1;

  const level = awakeCount === 0 ? phase : 0.5 + 0.5 * phase;

  const totalSteps = level * FIXED_ROWS * STEPS;
  const fullLines = Math.floor(totalSteps / STEPS);
  const stepInLine = Math.floor(totalSteps % STEPS);

  const Row = ({ mode, step }) => {
    let ch;
    if (mode === "full") ch = "█";
    else if (mode === "empty") ch = " ";
    else ch = BLOCKS[step];

    return (
      <div className="line">
        {"  |"}
        <span className="coffee">{ch.repeat(width)}</span>
        {"|]"}
      </div>
    );
  };

  const rowsFixed = Array.from({ length: FIXED_ROWS }, (_, idxFromBottom) => {
    if (idxFromBottom < fullLines) return { mode: "full", step: 0 };
    if (idxFromBottom === fullLines && stepInLine > 0)
      return { mode: "partial", step: stepInLine };
    return { mode: "empty", step: 0 };
  }).reverse();

  const FillRow = ({ filled }) => (
    <div className="line">
      {"  |"}
      {filled ? (
        <span
          className="liquid"
          style={{
            display: "inline-block",
            lineHeight: 0,
          }}
        >
          <span
            className="coffee"
            style={{
              display: "inline-block",
              transform: "scaleY(0.2)",
              transformOrigin: "bottom",
              lineHeight: 0,
              verticalAlign: "baseline",
              color: "#6b4226",
            }}
          >
            {"▄".repeat(width)}
          </span>
        </span>
      ) : (
        " ".repeat(width)
      )}
      {"|]"}
    </div>
  );

  const filledMask = Array.from({ length: FIXED_ROWS }, (_, idxFromBottom) => {
    if (idxFromBottom < fullLines) return { mode: "full", step: 0 };
    if (idxFromBottom === fullLines && stepInLine > 0)
      return { mode: "partial", step: stepInLine };
    return { mode: "empty", step: 0 };
  }).reverse();

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        margin: "16px 0",
        fontSize: 10,
      }}
    >
      {/* vapeur */}
      <div className="steam" style={{ left: 30, top: -22 }}>
        <span className="puff">)))</span>
        <span className="puff puff2">(((</span>
      </div>

      {/* mug */}
      <div className="mug" aria-hidden>
        <div className="line"> +-----+</div>
        {filledMask.map((r, i) => (
          <Row key={i} mode={r.mode} step={r.step} />
        ))}
        <div className="line">{ "  `-----&#39;  " }</div>
        <div className="line">{" _________ "}</div>
        <div className="line">{ "   `---------&#39;" }</div>
      </div>

      <style jsx>{`
        .mug {
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas,
            "Liberation Mono", monospace;
          line-height: 1.1;
          color: #111;
          user-select: none;
          white-space: pre;
        }
        .line {
          white-space: pre;
        }
        .coffee {
          color: #6b4226;
        }

        .steam {
          position: absolute;
          pointer-events: none;
          color: #6b7280;
          font-weight: 700;
        }
        .puff,
        .puff2 {
          position: absolute;
          left: 0;
          opacity: 0;
          animation: rise 1.8s ease-in-out infinite;
        }
        .puff2 {
          left: 10px;
          animation-delay: 0.9s;
        }
        @keyframes rise {
          0% {
            transform: translateY(8px);
            opacity: 0;
          }
          25% {
            opacity: 0.6;
          }
          60% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-22px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
