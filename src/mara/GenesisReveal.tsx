// src/mara/GenesisReveal.tsx
// Sistema de revelación progresiva del tablero durante el Genesis
// Cada realmStep desvela una capa nueva de la pintura original

import { useEffect, useState } from "react";
import type { RealmPieceKind } from "../game/types";

// Las imágenes del Genesis se cargan bajo demanda
// Estructura: genesis/genesis_01_cave.webp ... genesis_08_whitman.webp
// El jugador las prepara y las sube a src/assets/genesis/

// Por ahora usamos la imagen del tablero completo como fallback
// y overlays CSS para las zonas no reveladas
import samsaraPainting from "../assets/samsara/samsara-painting-panel.webp";

// Mapa de realmStep → color de casillas reveladas (según Canon v1.3)
const REALM_COLORS: Record<number, string> = {
  2: "#1a1a1a",   // Bruno → Negro (Hungry Ghost)
  3: "#4a1a6e",   // Margot → Morado (Hell)
  4: "#b8860b",   // Oriol → Amarillo/Oro (Animals)
  5: "#1a3a6e",   // Marino → Azul (Humans)
  6: "#8b0000",   // Rufus → Rojo (Asuras)
  7: "#f0f0f0",   // Whitman → Blanco (Devas)
};

// Zonas grises (no reveladas) — coordenadas aproximadas en %
// sobre el panel de 1100×620px
// Corresponden a los 3 rectángulos grises visibles en la screenshot
const UNREVEALED_ZONES = [
  { id: "top-left",   left: "30%", top: "0%",   width: "18%", height: "28%" },
  { id: "top-center", left: "48%", top: "0%",   width: "18%", height: "28%" },
  { id: "top-right",  left: "66%", top: "0%",   width: "14%", height: "22%" },
];

type Props = {
  realmStep: number;          // currentRealmStep de P1 o P2 (el mayor)
  lastRealmKey: RealmPieceKind | null;
  // Imágenes del Genesis — opcionales, fallback a CSS si no existen
  genesisImages?: Partial<Record<number, string>>;
};

export function GenesisReveal({ realmStep, lastRealmKey, genesisImages }: Props) {
  const [revealedStep, setRevealedStep] = useState(realmStep);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (realmStep > revealedStep) {
      setIsTransitioning(true);
      const t = setTimeout(() => {
        setRevealedStep(realmStep);
        setIsTransitioning(false);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [realmStep, revealedStep]);

  // Cuántas zonas siguen ocultas según el step actual
  const hiddenZones = UNREVEALED_ZONES.slice(
    Math.min(revealedStep - 1, UNREVEALED_ZONES.length)
  );

  return (
    <>
      {/* Overlay oscuro sobre zonas no reveladas */}
      {hiddenZones.map(zone => (
        <div
          key={zone.id}
          style={{
            position: "absolute",
            left: zone.left,
            top: zone.top,
            width: zone.width,
            height: zone.height,
            background: "linear-gradient(135deg, #0a0a0a 0%, #1a1208 50%, #0d0d0d 100%)",
            opacity: isTransitioning ? 0 : 0.92,
            transition: "opacity 0.8s ease",
            zIndex: 1,
            pointerEvents: "none",
            // Textura cavernícola con CSS
            backgroundImage: `
              radial-gradient(ellipse at 20% 30%, rgba(40,25,10,0.6) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 70%, rgba(20,15,5,0.4) 0%, transparent 40%),
              linear-gradient(135deg, #0a0905 0%, #1a1208 50%, #0d0a06 100%)
            `,
          }}
        />
      ))}

      {/* Indicador de color del reino revelado */}
      {revealedStep >= 2 && revealedStep <= 7 && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: REALM_COLORS[revealedStep] ?? "transparent",
            boxShadow: `0 0 8px 2px ${REALM_COLORS[revealedStep] ?? "transparent"}`,
            opacity: 0.8,
            zIndex: 2,
            pointerEvents: "none",
            transition: "all 0.6s ease",
          }}
        />
      )}
    </>
  );
}

export default GenesisReveal;
