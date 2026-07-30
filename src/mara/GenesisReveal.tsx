// src/mara/GenesisReveal.tsx
// Genesis — usa import.meta.glob para que Vite procese el asset correctamente
//
// 2026-07-30: el video genesis_dados.mp4 ahora es un video fusionado
// (cosmos + reveal del tablero pintado a mano). Ya no necesitamos ciclar
// 44 frames estáticos (genesis_f0..f20 + genesis_cv01..24) sincronizados
// con las tiradas de dado — esa animación vive ahora dentro del video.
// El flujo queda: VIDEO reproduce -> onEnded -> COMPLETE (genesisComplete).

import React, { useState } from "react";

// import.meta.glob procesa el asset en build time — funciona en producción
const videoModules = import.meta.glob(
  "../assets/genesis/genesis_dados.mp4",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const VIDEO_SRC = Object.values(videoModules)[0] ?? "";

type GenesisPhase = "VIDEO" | "COMPLETE";

type Props = {
  globalRollCount: number;
  realmStep: number;
  onComplete?: () => void;
  onPhaseChange?: (phase: GenesisPhase) => void;
};

export function GenesisReveal({ onComplete, onPhaseChange }: Props) {
  const [phase, setPhase] = useState<GenesisPhase>(
    VIDEO_SRC ? "VIDEO" : "COMPLETE"
  );

  // Notificar fase inicial al montar. Si no hay VIDEO_SRC (asset faltante),
  // completar Genesis de inmediato en vez de dejar el juego bloqueado en negro.
  React.useEffect(() => {
    if (VIDEO_SRC) {
      onPhaseChange?.("VIDEO");
    } else {
      onPhaseChange?.("COMPLETE");
      onComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVideoEnd = () => {
    // Pequeño delay para que no haya un frame en negro entre el fin del
    // video y el fade-in del tablero real.
    setTimeout(() => {
      setPhase("COMPLETE");
      onPhaseChange?.("COMPLETE");
      onComplete?.();
    }, 300);
  };

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

  return null;
}

export default GenesisReveal;
