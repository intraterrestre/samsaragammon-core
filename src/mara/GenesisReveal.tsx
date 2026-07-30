// src/mara/GenesisReveal.tsx
// Genesis — usa import.meta.glob para que Vite procese los assets correctamente
//
// 2026-07-30: genesis_dados.mp4 ahora es un video fusionado que cubre lo que
// antes eran los 21 frames estáticos "NEBULA" (genesis_f0..f20 — cosmos
// hasta el tablero pintado). Esa fase ya no se cicla a mano con las tiradas
// de dado, vive dentro del video.
//
// El desarrollo de las casillas verdes ancestrales (genesis_cv04..cv24) NO
// está en el video — sigue siendo una fase aparte, ciclada por tiradas de
// dado igual que antes, solo que ahora arranca apenas termina el video
// (ya no hace falta "gastar" 6 lances en la nebulosa primero).
//
// Flujo: VIDEO reproduce -> onEnded -> CASILLAS (6 lances) -> COMPLETE.

import React, { useEffect, useState } from "react";

const casillasModules = import.meta.glob(
  "../assets/genesis/genesis_cv*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const videoModules = import.meta.glob(
  "../assets/genesis/genesis_dados.mp4",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

// Casillas cada 4 (cv04, cv08, cv12, cv16, cv20, cv24)
const CASILLAS_FRAMES = [
  "genesis_cv04", "genesis_cv08", "genesis_cv12",
  "genesis_cv16", "genesis_cv20", "genesis_cv24"
]
  .map((name) => {
    const key = Object.keys(casillasModules).find((k) => k.includes(name));
    return key ? casillasModules[key] : "";
  })
  .filter(Boolean);

const VIDEO_SRC = Object.values(videoModules)[0] ?? "";

type GenesisPhase = "VIDEO" | "CASILLAS" | "COMPLETE";

type Props = {
  globalRollCount: number;
  realmStep: number;
  onComplete?: () => void;
  onPhaseChange?: (phase: GenesisPhase) => void;
};

export function GenesisReveal({ globalRollCount, onComplete, onPhaseChange }: Props) {
  const [phase, setPhase] = useState<GenesisPhase>(
    VIDEO_SRC ? "VIDEO" : CASILLAS_FRAMES.length > 0 ? "CASILLAS" : "COMPLETE"
  );

  // Lance en el que arrancó la fase CASILLAS, para contar relativo a ella
  // (ya no hay una fase NEBULA previa que "gaste" lances).
  const [casillasStartRoll, setCasillasStartRoll] = useState<number | null>(
    VIDEO_SRC ? null : globalRollCount
  );

  // El video arranca muted (requisito de autoplay en todos los browsers).
  // El botón de sonido permite al usuario activarlo con un tap explícito.
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (phase === "VIDEO") {
      onPhaseChange?.("VIDEO");
    } else if (phase === "CASILLAS") {
      onPhaseChange?.("CASILLAS");
      setCasillasStartRoll((prev) => prev ?? globalRollCount);
    } else {
      onPhaseChange?.("COMPLETE");
      onComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleVideoEnd = () => {
    // Pequeño delay para que no haya un frame en negro entre el fin del
    // video y el primer frame de casillas.
    setTimeout(() => {
      setPhase(CASILLAS_FRAMES.length > 0 ? "CASILLAS" : "COMPLETE");
    }, 300);
  };

  const relativeRoll =
    casillasStartRoll != null ? globalRollCount - casillasStartRoll : 0;

  useEffect(() => {
    if (phase !== "CASILLAS") return;
    if (relativeRoll >= CASILLAS_FRAMES.length) {
      setPhase("COMPLETE");
    }
  }, [phase, relativeRoll]);

  if (phase === "VIDEO" && VIDEO_SRC) {
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 9999,
        background: "#000", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <video
          src={VIDEO_SRC}
          autoPlay
          muted={isMuted}
          playsInline
          onEnded={handleVideoEnd}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <button
          type="button"
          onClick={() => setIsMuted((m) => !m)}
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          title={isMuted ? "Activar sonido" : "Silenciar"}
          style={{
            position: "absolute",
            right: 18,
            bottom: 18,
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.35)",
            background: "rgba(0,0,0,0.45)",
            color: "#fff",
            fontSize: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            backdropFilter: "blur(2px)",
          }}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>
      </div>
    );
  }

  if (phase === "CASILLAS" && CASILLAS_FRAMES.length > 0) {
    const idx = Math.min(relativeRoll, CASILLAS_FRAMES.length - 1);
    const img = CASILLAS_FRAMES[idx];
    if (!img) return null;
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none"
      }}>
        <img
          key={idx} src={img} alt=""
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
