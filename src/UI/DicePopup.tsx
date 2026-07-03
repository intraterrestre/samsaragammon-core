import React, { useEffect, useState, useRef } from "react";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

function CircleDie({ value, rolling, color, size = 80 }: {
  value: number | null;
  rolling: boolean;
  color: "white" | "black";
  size?: number;
}) {
  const [display, setDisplay] = useState(value ?? 1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rolling) {
      intervalRef.current = setInterval(() => {
        setDisplay(Math.ceil(Math.random() * 6));
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (value !== null) setDisplay(value);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [rolling, value]);

  const isDark = color === "black";
  const bg = isDark ? "#1a1a1a" : "#f5f0e8";
  const pipColor = isDark ? "#e8dcc8" : "#222";
  const border = isDark ? "2px solid rgba(255,255,255,0.15)" : "2px solid rgba(0,0,0,0.12)";
  const shadow = isDark
    ? "0 6px 20px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.1)"
    : "0 6px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.7)";

  const pips = PIPS[display] ?? [];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: bg,
      border,
      boxShadow: shadow,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      padding: size * 0.12,
      boxSizing: "border-box",
      animation: rolling
        ? "dieRoll 0.08s ease-in-out infinite"
        : "dieLand 0.3s cubic-bezier(0.2,0.8,0.4,1) forwards",
      flexShrink: 0,
    }}>
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const hasPip = pips.some(([c, r]) => c === col && r === row);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {hasPip && (
              <div style={{
                width: size * 0.14,
                height: size * 0.14,
                borderRadius: "50%",
                background: pipColor,
                boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.6)" : "0 1px 3px rgba(0,0,0,0.25)",
              }} />
            )}
          </div>
        );
      })}
      <style>{`
        @keyframes dieRoll {
          0%   { transform: rotate(-10deg) scale(0.93); }
          25%  { transform: rotate(7deg) scale(1.07) translateY(-3px); }
          75%  { transform: rotate(-5deg) scale(0.96) translateY(2px); }
          100% { transform: rotate(-10deg) scale(0.93); }
        }
        @keyframes dieLand {
          0%   { transform: scale(1.2) rotate(5deg); }
          60%  { transform: scale(0.94) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

type Props = {
  visible: boolean;
  rollA: number | null;
  rollB: number | null;
  rolling: boolean;
  turn: "P1" | "P2";
  onDismiss: () => void;
};

export function DicePopup({ visible, rollA, rollB, rolling, turn, onDismiss }: Props) {
  useEffect(() => {
    if (visible && !rolling) {
      const t = setTimeout(onDismiss, 2200);
      return () => clearTimeout(t);
    }
  }, [visible, rolling, onDismiss]);

  if (!visible) return null;

  const color = turn === "P1" ? "white" : "black";
  const label = turn === "P1" ? "White" : "Black";

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        pointerEvents: "all",
      }}
    >
      <div style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
        borderRadius: "50%",
        width: 260,
        height: 260,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}>
        <div style={{
          fontSize: 13,
          letterSpacing: 2,
          textTransform: "uppercase",
          opacity: 0.7,
          color: "white",
          fontFamily: "Cinzel, serif",
        }}>
          {label}
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <CircleDie value={rollA} rolling={rolling} color={color} size={88} />
          <CircleDie value={rollB} rolling={rolling} color={color} size={88} />
        </div>

        {!rolling && (
          <div style={{
            fontSize: 11,
            opacity: 0.4,
            color: "white",
            fontFamily: "system-ui",
          }}>
            tap to continue
          </div>
        )}
      </div>
    </div>
  );
}
