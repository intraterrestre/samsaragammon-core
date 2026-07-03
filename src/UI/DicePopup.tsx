import React, { useEffect, useState, useRef } from "react";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

function CubicDie({ value, rolling, color, size = 76 }: {
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
  const bg = isDark ? "#1c1c1c" : "#f5f0e8";
  const pipColor = isDark ? "#e8dcc8" : "#222";
  const border = isDark ? "2px solid rgba(255,255,255,0.18)" : "2px solid rgba(0,0,0,0.14)";
  const shadow = isDark
    ? "0 6px 18px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)"
    : "0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.8)";

  const pips = PIPS[display] ?? [];

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.18,  // cubic — rounded corners like real dice
      background: bg,
      border,
      boxShadow: shadow,
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gridTemplateRows: "repeat(3, 1fr)",
      padding: size * 0.1,
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
                width: size * 0.15,
                height: size * 0.15,
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
      {/* Círculo contenedor — semitransparente, posicionado sobre la rueda */}
      <div style={{
        position: "absolute",
        left: "65%",
        top: "52%",
        transform: "translate(-50%, -50%)",
        background: "rgba(0,0,0,0.18)",
        backdropFilter: "blur(10px)",
        borderRadius: "50%",
        width: 240,
        height: 240,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        border: "1px solid rgba(255,255,255,0.1)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
      }}>
        <div style={{
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: 0.6,
          color: "white",
          fontFamily: "Cinzel, serif",
        }}>
          {label}
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <CubicDie value={rollA} rolling={rolling} color={color} size={76} />
          <CubicDie value={rollB} rolling={rolling} color={color} size={76} />
        </div>

        {!rolling && (
          <div style={{ fontSize: 10, opacity: 0.35, color: "white", fontFamily: "system-ui" }}>
            tap to continue
          </div>
        )}
      </div>
    </div>
  );
}
