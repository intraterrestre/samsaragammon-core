import React, { useEffect, useRef, useState } from "react";

// Dot positions for each face (as [col, row] on a 3x3 grid, 0-indexed)
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [0, 1],
    [0, 2],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
};

type DieProps = {
  value: number | null;
  rolling: boolean;
  color: "white" | "black";
  size?: number;
};

export function Die({ value, rolling, color, size = 52 }: DieProps) {
  const [displayValue, setDisplayValue] = useState<number>(value ?? 1);
  const [animKey, setAnimKey] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (rolling) {
      setAnimKey((k) => k + 1);
      intervalRef.current = setInterval(() => {
        setDisplayValue(Math.ceil(Math.random() * 6));
      }, 80);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (value !== null) setDisplayValue(value);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rolling, value]);

  const isDark = color === "black";
  const bg = isDark ? "#1a1a1a" : "#f5f0e8";
  const pipColor = isDark ? "#e8dcc8" : "#1a1a1a";
  const borderColor = isDark ? "#444" : "#c8b89a";
  const shadow = isDark
    ? "0 4px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)"
    : "0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.6)";

  const pips = PIPS[displayValue] ?? [];

  return (
    <div
      key={animKey}
      style={{
        width: size,
        height: size,
        background: bg,
        borderRadius: size * 0.18,
        border: `2px solid ${borderColor}`,
        boxShadow: shadow,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        padding: size * 0.1,
        boxSizing: "border-box",
        position: "relative",
        animation: rolling ? "dieRoll 0.08s ease-in-out infinite" : "dieLand 0.25s cubic-bezier(0.2,0.8,0.4,1) forwards",
        flexShrink: 0,
      }}
    >
      {/* 3x3 grid cells */}
      {Array.from({ length: 9 }).map((_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const hasPip = pips.some(([c, r]) => c === col && r === row);
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {hasPip && (
              <div
                style={{
                  width: size * 0.16,
                  height: size * 0.16,
                  borderRadius: "50%",
                  background: pipColor,
                  boxShadow: isDark
                    ? "0 1px 2px rgba(0,0,0,0.5)"
                    : "0 1px 2px rgba(0,0,0,0.3)",
                }}
              />
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes dieRoll {
          0%   { transform: rotate(-8deg) scale(0.95); }
          25%  { transform: rotate(5deg) scale(1.05) translateY(-2px); }
          50%  { transform: rotate(-4deg) scale(0.97) translateY(1px); }
          75%  { transform: rotate(6deg) scale(1.03) translateY(-1px); }
          100% { transform: rotate(-8deg) scale(0.95); }
        }
        @keyframes dieLand {
          0%   { transform: scale(1.15) rotate(4deg); }
          60%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
