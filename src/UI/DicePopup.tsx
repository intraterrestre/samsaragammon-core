import { useEffect, useState, useRef } from "react";
import type { DiceSkin } from "../game/dice/eraDiceSkins";
import { getActiveDiceSkin } from "../game/dice/eraDiceSkins";
import { STONE_GRADIENT, STONE_RING, STONE_SHADOW } from "../game/dice/stoneDiceStyle";

// Legacy pip layout — kept for any era that wants to fall back to plain
// numeric dice instead of an image-face skin. Not deleted, just unused by
// default while an era skin (e.g. the Primitive leaves/clovers) is active.
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]],
};

// Fixed "weathering" pits — small low-contrast craters scattered on every
// stone die, independent of the rolled value, just to break up the flat
// gradient and read as worn rock rather than plastic.
const WEATHER_PITS: [number, number, number][] = [
  [0.22, 0.72, 0.07],
  [0.78, 0.20, 0.06],
  [0.68, 0.80, 0.05],
];

function CubicDie({ value, rolling, color, size = 76, skin, stone = true }: {
  value: number | null;
  rolling: boolean;
  color: "white" | "black";
  size?: number;
  /** Image-based face skin for a future era. Not used while stone=true. */
  skin?: DiceSkin | null;
  /**
   * Round, carved-stone look (drilled pip-holes) for the Primitive Era —
   * default. Set false to fall back to the flat rounded-square card
   * (image face if `skin` is given, otherwise flat dot pips).
   */
  stone?: boolean;
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
  const pips = PIPS[display] ?? [];

  if (stone) {
    const stoneFaceSrc = skin?.faces?.[display as 1 | 2 | 3 | 4 | 5 | 6] ?? null;
    const stoneBg = isDark ? STONE_GRADIENT.black : STONE_GRADIENT.white;
    const ring = isDark ? STONE_RING.black : STONE_RING.white;

    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: stoneFaceSrc ? "transparent" : stoneBg,
        border: `1px solid ${ring}`,
        boxShadow: STONE_SHADOW,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        animation: rolling
          ? "dieRoll 0.08s ease-in-out infinite"
          : "dieLand 0.3s cubic-bezier(0.2,0.8,0.4,1) forwards",
        flexShrink: 0,
      }}>
        {stoneFaceSrc ? (
          // Real carved-stone disc photo — see src/assets/dice/primitive/
          // and src/game/dice/eraDiceSkins.ts. object-fit:cover + the
          // round clip above crops out the photo's black square corners.
          <img
            src={stoneFaceSrc}
            alt={`face ${display}`}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
            }}
          />
        ) : (
          <>
            {/* No photo for this value yet — CSS approximation fallback:
                mottled gradient sphere with drilled-hole pips. */}
            <div style={{ position: "absolute", inset: 0, background: stoneBg }} />
            {WEATHER_PITS.map(([px, py, pr], i) => (
              <div key={`w${i}`} style={{
                position: "absolute",
                left: `${px * 100}%`,
                top: `${py * 100}%`,
                width: size * pr,
                height: size * pr,
                transform: "translate(-50%,-50%)",
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, rgba(0,0,0,0.35), rgba(0,0,0,0.12) 70%, transparent 100%)",
              }} />
            ))}
            {pips.map(([c, r], i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${((c + 0.5) / 3) * 100}%`,
                top: `${((r + 0.5) / 3) * 100}%`,
                width: size * 0.17,
                height: size * 0.17,
                transform: "translate(-50%,-50%)",
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, rgba(0,0,0,0.95), rgba(0,0,0,0.65) 55%, rgba(0,0,0,0.3) 100%)",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.9), 0 1px 0 rgba(255,255,255,0.08)",
              }} />
            ))}
          </>
        )}

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

  // Legacy flat card — kept for a future era that wants image faces or
  // plain dot pips instead of the carved-stone look above.
  const bg = isDark ? "#1c1c1c" : "#f5f0e8";
  const pipColor = isDark ? "#e8dcc8" : "#222";
  const border = isDark ? "2px solid rgba(255,255,255,0.18)" : "2px solid rgba(0,0,0,0.14)";
  const shadow = isDark
    ? "0 6px 18px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.08)"
    : "0 6px 18px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.8)";
  const faceSrc = skin?.faces?.[display as 1 | 2 | 3 | 4 | 5 | 6] ?? null;

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.18,  // cubic — rounded corners like real dice
      background: bg,
      border,
      boxShadow: shadow,
      boxSizing: "border-box",
      animation: rolling
        ? "dieRoll 0.08s ease-in-out infinite"
        : "dieLand 0.3s cubic-bezier(0.2,0.8,0.4,1) forwards",
      flexShrink: 0,
      display: faceSrc ? "flex" : "grid",
      alignItems: "center",
      justifyContent: "center",
      gridTemplateColumns: faceSrc ? undefined : "repeat(3, 1fr)",
      gridTemplateRows: faceSrc ? undefined : "repeat(3, 1fr)",
      padding: faceSrc ? size * 0.12 : size * 0.1,
    }}>
      {faceSrc ? (
        <img
          src={faceSrc}
          alt={`face ${display}`}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            filter: isDark ? "drop-shadow(0 1px 2px rgba(0,0,0,0.6))" : "none",
          }}
        />
      ) : (
        Array.from({ length: 9 }).map((_, i) => {
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
        })
      )}
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

// Positioned inside the 1100x620 samsaraScene coordinate space, directly
// above the roll button (the "spinning dice" — nudged down to top:44% in
// Board.tsx, center ~x:347, y:230-320). Side-by-side (not stacked) so the
// block only needs ~150px of height instead of ~290px, which is what let
// it clear every neighbor at once: Mara's eyes (x:118-164, y:178-182),
// SacredProgress (x:-2-178, y:-3-177), the ring (retreats past x:500+
// this high up), and the blue Buddha "Dharma Emergencies" icon lower down
// (~x:434-563, y:456-585). See GameShell.tsx for mount.
const HUD_LEFT = 214;
const HUD_TOP = 20;
const DIE_SIZE = 72; // reducido — más proporcionado con el tablero

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
  const skin = getActiveDiceSkin(undefined, turn);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: "absolute",
        left: HUD_LEFT,
        top: HUD_TOP,
        zIndex: 6000,
        pointerEvents: "auto",
        cursor: "pointer",
      }}
    >
      {/* Los dos dados del turno activo, en fila horizontal, encima del botón de tirar */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
        filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))",
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: color === "white" ? "#f5f0e8" : "#cfcfcf",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
        }}>
          {label}
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
          <CubicDie value={rollA} rolling={rolling} color={color} size={DIE_SIZE} skin={skin} />
          <CubicDie value={rollB} rolling={rolling} color={color} size={DIE_SIZE} skin={skin} />
        </div>
      </div>
    </div>
  );
}
