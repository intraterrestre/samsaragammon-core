// src/mara/GenesisReveal.tsx
// Genesis — revelación progresiva del tablero
// Secuencia: video intro → nebulosa → bastidores → casillas verdes → Bruno

import { useEffect, useRef, useState } from "react";

// ─── FRAMES NEBULOSA (f0 → f20) ───────────────────────────────────────────
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
import gf015 from "../../assets/genesis/genesis_f015.webp";
import gf16  from "../../assets/genesis/genesis_f16.webp";
import gf17  from "../../assets/genesis/genesis_f17.webp";
import gf18  from "../../assets/genesis/genesis_f18.webp";
import gf19  from "../../assets/genesis/genesis_f19.webp";
import gf20  from "../../assets/genesis/genesis_f20.webp";

// ─── CASILLAS VERDES (cv01 → cv24) ────────────────────────────────────────
import cv01 from "../../assets/genesis/genesis_cv01.webp";
import cv02 from "../../assets/genesis/genesis_cv02.webp";
import cv03 from "../../assets/genesis/genesis_cv03.webp";
import cv04 from "../../assets/genesis/genesis_cv04.webp";
import cv05 from "../../assets/genesis/genesis_cv05.webp";
import cv06 from "../../assets/genesis/genesis_cv06.webp";
import cv07 from "../../assets/genesis/genesis_cv07.webp";
import cv08 from "../../assets/genesis/genesis_cv08.webp";
import cv09 from "../../assets/genesis/genesis_cv09.webp";
import cv10 from "../../assets/genesis/genesis_cv10.webp";
import cv11 from "../../assets/genesis/genesis_cv11.webp";
import cv12 from "../../assets/genesis/genesis_cv12.webp";
import cv13 from "../../assets/genesis/genesis_cv13.webp";
import cv14 from "../../assets/genesis/genesis_cv14.webp";
import cv15 from "../../assets/genesis/genesis_cv15.webp";
import cv16 from "../../assets/genesis/genesis_cv16.webp";
import cv17 from "../../assets/genesis/genesis_cv17.webp";
import cv18 from "../../assets/genesis/genesis_cv18.webp";
import cv19 from "../../assets/genesis/genesis_cv19.webp";
import cv20 from "../../assets/genesis/genesis_cv20.webp";
import cv21 from "../../assets/genesis/genesis_cv21.webp";
import cv22 from "../../assets/genesis/genesis_cv22.webp";
import cv23 from "../../assets/genesis/genesis_cv23.webp";
import cv24 from "../../assets/genesis/genesis_cv24.webp";

// ─── VIDEO DADOS ───────────────────────────────────────────────────────────
import genesisVideo from "../../assets/genesis/genesis_dados.mp4";

// ─── SECUENCIA DE FRAMES NEBULOSA ─────────────────────────────────────────
// Orden visual: mundo fantasma → sólido → bastidores → lonas cubriendo
const NEBULA_FRAMES = [
  gf0, gf00, gf01, gf02, gf03, gf04, gf05, gf06, gf07,
  gf08, gf09, gf10, gf11, gf12, gf013, gf14, gf015,
  gf16, gf17, gf18, gf19, gf20,
];

// Cada lance dispara 4 casillas verdes acumuladas
const CASILLAS_BY_ROLL: Record<number, string> = {
  1:  cv04,
  2:  cv08,
  3:  cv12,
  4:  cv16,
  5:  cv20,
  6:  cv24,
};

// Cuántos frames de nebulosa mostrar por lance (del total 22)
// Los primeros lances van rápido (mundo + bastidores)
// Los últimos van más lentos (lonas cubriendo)
const NEBULA_FRAMES_PER_ROLL = Math.ceil(NEBULA_FRAMES.length / 6); // ~4 frames por lance

type GenesisPhase =
  | "VIDEO"       // video dados girando
  | "NEBULA"      // frames f0 → f20
  | "CASILLAS"    // casillas verdes de 4 en 4
  | "COMPLETE";   // Genesis terminado

type Props = {
  globalRollCount: number;
  realmStep: number;
  onComplete?: () => void;
};

export function GenesisReveal({ globalRollCount, realmStep, onComplete }: Props) {
  const [phase, setPhase] = useState<GenesisPhase>("VIDEO");
  const [nebulaIndex, setNebulaIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fase VIDEO → termina sola cuando el video acaba
  const handleVideoEnd = () => {
    setPhase("NEBULA");
  };

  // Fase NEBULA → avanza con cada lance de dados
  useEffect(() => {
    if (phase !== "NEBULA") return;

    // Calcular qué frame mostrar según globalRollCount
    // Los primeros 6 lances cubren los 22 frames
    const frameIndex = Math.min(
      Math.floor((globalRollCount / 6) * NEBULA_FRAMES.length),
      NEBULA_FRAMES.length - 1
    );
    setNebulaIndex(frameIndex);

    // Cuando llega al último frame → pasa a CASILLAS
    if (globalRollCount >= 6) {
      setPhase("CASILLAS");
    }
  }, [globalRollCount, phase]);

  // Fase CASILLAS → 4 en 4 con cada lance
  // Cuando globalRollCount >= 12 → COMPLETE
  useEffect(() => {
    if (phase !== "CASILLAS") return;
    if (globalRollCount >= 12) {
      setPhase("COMPLETE");
      onComplete?.();
    }
  }, [globalRollCount, phase, onComplete]);

  // ─── RENDER ────────────────────────────────────────────────────────────

  if (phase === "VIDEO") {
    return (
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 9999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <video
          ref={videoRef}
          src={genesisVideo}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnd}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    );
  }

  if (phase === "NEBULA") {
    return (
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        pointerEvents: "none",
      }}>
        <img
          key={nebulaIndex}
          src={NEBULA_FRAMES[nebulaIndex]}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 1,
            transition: "opacity 0.4s ease",
          }}
        />
      </div>
    );
  }

  if (phase === "CASILLAS") {
    // Mostrar la imagen acumulada según lances (4 en 4)
    const rollsInCasillas = globalRollCount - 6; // lances desde que empezaron casillas
    const casillasRoll = Math.min(Math.max(Math.ceil(rollsInCasillas / 1), 1), 6);
    const casillasImg = CASILLAS_BY_ROLL[casillasRoll] ?? cv24;

    return (
      <div style={{
        position: "absolute",
        inset: 0,
        zIndex: 100,
        pointerEvents: "none",
      }}>
        <img
          key={casillasRoll}
          src={casillasImg}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.5s ease",
          }}
        />
      </div>
    );
  }

  // COMPLETE — no renderiza nada, el tablero real ya está visible
  return null;
}

export default GenesisReveal;
