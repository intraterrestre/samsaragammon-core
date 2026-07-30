// src/mara/GenesisReveal.tsx
// Genesis — usa import.meta.glob para que Vite procese los assets correctamente

import React, { useEffect, useState } from "react";

// import.meta.glob procesa los assets en build time — funciona en producción
const nebulaModules = import.meta.glob(
  "../assets/genesis/genesis_f*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const casillasModules = import.meta.glob(
  "../assets/genesis/genesis_cv*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const videoModules = import.meta.glob(
  "../assets/genesis/genesis_dados.mp4",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

// Ordenar frames de nebulosa
const NEBULA_FRAMES = Object.entries(nebulaModules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, url]) => url);

// Casillas cada 4 (cv04, cv08, cv12, cv16, cv20, cv24)
const CASILLAS_FRAMES = [
  "genesis_cv04", "genesis_cv08", "genesis_cv12",
  "genesis_cv16", "genesis_cv20", "genesis_cv24"
].map(name => {
  const key = Object.keys(casillasModules).find(k => k.includes(name));
  return key ? casillasModules[key] : "";
});

const VIDEO_SRC = Object.values(videoModules)[0] ?? "";

type GenesisPhase = "VIDEO" | "NEBULA" | "CASILLAS" | "COMPLETE";

type Props = {
  globalRollCount: number;
  realmStep: number;
  onComplete?: () => void;
  onPhaseChange?: (phase: GenesisPhase) => void;
};

export function GenesisReveal({ globalRollCount, onComplete, onPhaseChange }: Props) {
  // Notificar fase inicial al montar
  React.useEffect(() => {
    onPhaseChange?.("VIDEO");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [phase, setPhase] = useState<GenesisPhase>(
    VIDEO_SRC ? "VIDEO" : "NEBULA"
  );
  const [nebulaIndex, setNebulaIndex] = useState(0);
  // Guardar el rollCount inicial para calcular lances relativos al Genesis
  const [startRoll] = useState(globalRollCount);
  const relativeRoll = globalRollCount - startRoll;

  const handleVideoEnd = () => {
    // Delay para que el primer frame de nebulosa cargue antes de mostrar el boardLayer
    setTimeout(() => {
      setPhase("NEBULA");
      onPhaseChange?.("NEBULA");
    }, 300);
  };

  useEffect(() => {
    if (phase !== "NEBULA") return;
    if (NEBULA_FRAMES.length === 0) {
      setPhase("CASILLAS");
      return;
    }
    const idx = Math.min(
      Math.floor((relativeRoll / 6) * NEBULA_FRAMES.length),
      NEBULA_FRAMES.length - 1
    );
    setNebulaIndex(idx);
    if (relativeRoll >= 6) setPhase("CASILLAS");
  }, [relativeRoll, phase]);

  useEffect(() => {
    if (phase !== "CASILLAS") return;
    if (relativeRoll >= 12) {
      setPhase("COMPLETE");
      onComplete?.();
    }
  }, [relativeRoll, phase, onComplete]);

  if (phase === "VIDEO" && VIDEO_SRC) {
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

  if (phase === "NEBULA" && NEBULA_FRAMES.length > 0) {
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none"
      }}>
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
    const rollsIn = Math.max(globalRollCount - 6, 0);
    const idx = Math.min(rollsIn, CASILLAS_FRAMES.length - 1);
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

  // COMPLETE — mostrar imagen final del tablero con fade-in
  // El MaraLayer ya tiene samsaraPaintingPanel debajo, solo quitamos el overlay
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 99,
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 1s ease',
      }}
    />
  );
}

export default GenesisReveal;
