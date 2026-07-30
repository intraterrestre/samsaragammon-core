// src/mara/GenesisReveal.tsx
// Genesis — usa URLs dinámicas para evitar problemas de resolución en build

import { useEffect, useRef, useState } from "react";

// URLs dinámicas — Vite las resuelve en runtime, no en build time
const GENESIS_BASE = "/src/assets/genesis";

// Secuencia de frames nebulosa en orden
const NEBULA_FRAMES = [
  "genesis_f0.webp",
  "genesis_f00.webp",
  "genesis_f01.webp",
  "genesis_f02.webp",
  "genesis_f03.webp",
  "genesis_f04.webp",
  "genesis_f05.webp",
  "genesis_f06.webp",
  "genesis_f07.webp",
  "genesis_f08.webp",
  "genesis_f09.webp",
  "genesis_f10.webp",
  "genesis_f11.webp",
  "genesis_f12.webp",
  "genesis_f13.webp",
  "genesis_f14.webp",
  "genesis_f15.webp",
  "genesis_f16.webp",
  "genesis_f17.webp",
  "genesis_f18.webp",
  "genesis_f19.webp",
  "genesis_f20.webp",
].map(f => `${GENESIS_BASE}/${f}`);

const CASILLAS_FRAMES: Record<number, string> = {
  1: `${GENESIS_BASE}/genesis_cv04.webp`,
  2: `${GENESIS_BASE}/genesis_cv08.webp`,
  3: `${GENESIS_BASE}/genesis_cv12.webp`,
  4: `${GENESIS_BASE}/genesis_cv16.webp`,
  5: `${GENESIS_BASE}/genesis_cv20.webp`,
  6: `${GENESIS_BASE}/genesis_cv24.webp`,
};

const VIDEO_SRC = `${GENESIS_BASE}/genesis_dados.mp4`;

type GenesisPhase = "VIDEO" | "NEBULA" | "CASILLAS" | "COMPLETE";

type Props = {
  globalRollCount: number;
  realmStep: number;
  onComplete?: () => void;
};

export function GenesisReveal({ globalRollCount, onComplete }: Props) {
  const [phase, setPhase] = useState<GenesisPhase>("VIDEO");
  const [nebulaIndex, setNebulaIndex] = useState(0);

  const handleVideoEnd = () => setPhase("NEBULA");

  useEffect(() => {
    if (phase !== "NEBULA") return;
    const idx = Math.min(
      Math.floor((globalRollCount / 6) * NEBULA_FRAMES.length),
      NEBULA_FRAMES.length - 1
    );
    setNebulaIndex(idx);
    if (globalRollCount >= 6) setPhase("CASILLAS");
  }, [globalRollCount, phase]);

  useEffect(() => {
    if (phase !== "CASILLAS") return;
    if (globalRollCount >= 12) {
      setPhase("COMPLETE");
      onComplete?.();
    }
  }, [globalRollCount, phase, onComplete]);

  if (phase === "VIDEO") {
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 9999,
        background: "#000", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <video
          src={VIDEO_SRC}
          autoPlay muted playsInline
          onEnded={handleVideoEnd}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  if (phase === "NEBULA") {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none" }}>
        <img
          key={nebulaIndex}
          src={NEBULA_FRAMES[nebulaIndex]}
          alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            transition: "opacity 0.4s ease",
          }}
        />
      </div>
    );
  }

  if (phase === "CASILLAS") {
    const rollsIn = globalRollCount - 6;
    const roll = Math.min(Math.max(Math.ceil(rollsIn), 1), 6);
    const img = CASILLAS_FRAMES[roll] ?? CASILLAS_FRAMES[6];
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none" }}>
        <img
          key={roll} src={img} alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            transition: "opacity 0.5s ease",
          }}
        />
      </div>
    );
  }

  return null;
}

export default GenesisReveal;
