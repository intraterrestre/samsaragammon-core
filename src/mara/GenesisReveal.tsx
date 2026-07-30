// src/mara/GenesisReveal.tsx
// Genesis — revelación progresiva del tablero

import { useEffect, useRef, useState } from "react";

// ─── IMPORTS EXACTOS según archivos en src/assets/genesis/ ────────────────
import gf0   from "../../assets/genesis/genesis_f0.webp";
import gf00  from "../../assets/genesis/genesis_f00.webp";
import gf01  from "../../assets/genesis/genesis_f01.webp";
import gf02  from "../../assets/genesis/genesis_f02.webp";
import gf03  from "../../assets/genesis/genesis_f03.webp";
import gf04  from "../../assets/genesis/genesis_f04.webp";
import gf05  from "../../assets/genesis/genesis_f05.webp";
import gf06  from "../../assets/genesis/genesis_f06.webp";
import gf07  from "../../assets/genesis/genesis_f07.webp";
import gf08  from "../../assets/genesis/genesis_f08.webp";
import gf09  from "../../assets/genesis/genesis_f09.webp";
import gf10  from "../../assets/genesis/genesis_f10.webp";
import gf11  from "../../assets/genesis/genesis_f11.webp";
import gf12  from "../../assets/genesis/genesis_f12.webp";
import gf13  from "../../assets/genesis/genesis_f13.webp";
import gf14  from "../../assets/genesis/genesis_f14.webp";
import gf15 from "../../assets/genesis/genesis_f15.webp";
import gf16  from "../../assets/genesis/genesis_f16.webp";
import gf17  from "../../assets/genesis/genesis_f17.webp";
import gf18  from "../../assets/genesis/genesis_f18.webp";
import gf19  from "../../assets/genesis/genesis_f19.webp";
import gf20  from "../../assets/genesis/genesis_f20.webp";

import cv04 from "../../assets/genesis/genesis_cv04.webp";
import cv08 from "../../assets/genesis/genesis_cv08.webp";
import cv12 from "../../assets/genesis/genesis_cv12.webp";
import cv16 from "../../assets/genesis/genesis_cv16.webp";
import cv20 from "../../assets/genesis/genesis_cv20.webp";
import cv24 from "../../assets/genesis/genesis_cv24.webp";

import genesisVideo from "../../assets/genesis/genesis_dados.mp4";

// Secuencia exacta de frames disponibles
const NEBULA_FRAMES = [
  gf0, gf00, gf01, gf02, gf03, gf04, gf05, gf06,
  gf07, gf08, gf09, gf10, gf11, gf12, gf13, gf14,
  gf15, gf16, gf17, gf18, gf19, gf20,
];

// Casillas acumuladas por lance (4 en 4)
const CASILLAS_BY_ROLL: Record<number, string> = {
  1: cv04, 2: cv08, 3: cv12, 4: cv16, 5: cv20, 6: cv24,
};

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
          src={genesisVideo}
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
    const img = CASILLAS_BY_ROLL[roll] ?? cv24;
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

