import { useEffect, useRef, useState } from "react";
import "./mara.css";
// 2026-08-05: el mural NO es una sola imagen — son 7 etapas, una por cada
// avatar que entra de verdad (Bruno→Margot→Oriol→Marino→Rufus→Whitman→
// Nirvana), cada una más pintada que la anterior (confirmado por el
// usuario con las 7 fotos "N entra <avatar>.webp" / "7 nirvana dj.webp").
// Reemplaza el enfoque anterior de una sola imagen fija (genesis_cv24 /
// samsara-painting-panel). Se selecciona según state.cosmicClock.era.
const eraMuralModules = import.meta.glob(
  "../assets/intro/*entra*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const nirvanaMuralModules = import.meta.glob(
  "../assets/intro/*nirvana*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

// Fallback: el último frame de las 24 casillas verdes, por si algún
// mural de era todavía no está disponible.
import fallbackMural from "../assets/intro/genesis_cv24.webp";

const ERA_KEYS = ["bruno", "margot", "oriol", "marino", "rufus", "whitman"] as const;
type EraKey = (typeof ERA_KEYS)[number] | "nirvana";

function findMuralFor(era: string): string {
  if (era === "nirvana") {
    const key = Object.keys(nirvanaMuralModules)[0];
    return key ? nirvanaMuralModules[key] : fallbackMural;
  }
  const key = Object.keys(eraMuralModules).find((k) =>
    k.toLowerCase().includes(era.toLowerCase())
  );
  return key ? eraMuralModules[key] : fallbackMural;
}

const ERA_MURALS: Record<EraKey, string> = {
  bruno: findMuralFor("bruno"),
  margot: findMuralFor("margot"),
  oriol: findMuralFor("oriol"),
  marino: findMuralFor("marino"),
  rufus: findMuralFor("rufus"),
  whitman: findMuralFor("whitman"),
  nirvana: findMuralFor("nirvana"),
};

import DharmaBubble from "../components/DharmaBubble";
import DharmaConnector from "../components/DharmaConnector";
import { GenesisReveal } from "./GenesisReveal";
import type { RealmPieceKind } from "../game/types";

interface MaraLayerProps {
  dharmaMessage?: string;
  dharmaBig?: boolean;
  dharmaFading?: boolean;
  realmStep?: number;
  lastRealmKey?: RealmPieceKind | null;
  globalRollCount?: number;
  genesisComplete?: boolean;
  boardPainted?: boolean;
  // 2026-08-05: era real de progresión (state.cosmicClock.era), decide
  // qué etapa del mural (de las 7) se muestra. Default "bruno" — la
  // primera etapa, la que corresponde apenas se pinta el tablero.
  era?: string;
  onGenesisComplete?: () => void;
  onGenesisPhaseChange?: (phase: string) => void;
}

export function MaraLayer({
  dharmaMessage = "",
  dharmaBig = false,
  dharmaFading = false,
  realmStep = 1,
  lastRealmKey = null,
  globalRollCount = 0,
  genesisComplete = false,
  boardPainted,
  era = "bruno",
  onGenesisComplete,
  onGenesisPhaseChange,
}: MaraLayerProps) {
  const isBoardPainted = boardPainted ?? genesisComplete;
  const currentMural = ERA_MURALS[(era as EraKey)] ?? fallbackMural;
  const layerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const [connectorEnd, setConnectorEnd] = useState({ x: 36, y: 63 });

  useEffect(() => {
    function updateConnector() {
      const layer = layerRef.current;
      const bubble = bubbleRef.current;
      if (!layer || !bubble) return;
      const layerRect = layer.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();
      setConnectorEnd({
        x: ((bubbleRect.left + bubbleRect.width / 2 - layerRect.left) / layerRect.width) * 100,
        y: ((bubbleRect.bottom - layerRect.top) / layerRect.height) * 100,
      });
    }
    updateConnector();
    window.addEventListener("resize", updateConnector);
    return () => window.removeEventListener("resize", updateConnector);
  }, [dharmaMessage]);

  return (
    <div ref={layerRef} className="maraLayer">
      <img
        src={currentMural}
        alt="Samsara Painting"
        className="maraPainting"
        style={{ opacity: isBoardPainted ? 1 : 0, transition: "opacity 0.8s ease" }}
      />

      {/* v2: Genesis — import.meta.glob resuelve assets en build y runtime */}
      {!genesisComplete && (
        <GenesisReveal
          globalRollCount={globalRollCount}
          realmStep={realmStep}
          onComplete={onGenesisComplete}
          onPhaseChange={onGenesisPhaseChange}
        />
      )}

      {/* 2026-08-05: estaban gateados solo en genesisComplete (true a los
          pocos clics de Genesis), independiente de si dharmaMessage tenía
          contenido real — el conector se dibujaba igual aunque la burbuja
          no tuviera nada que decir todavía. dharmaMessage ya es "" hasta
          que brunoRevealed es real (ver GameShell buddhaMessage), así que
          basta con exigir que además haya mensaje. */}
      {genesisComplete && dharmaMessage && (
        <DharmaConnector
          fromX={46}
          fromY={79}
          toX={connectorEnd.x}
          toY={connectorEnd.y}
          fading={dharmaFading}
        />
      )}

      {genesisComplete && dharmaMessage && (
        <DharmaBubble
          ref={bubbleRef}
          message={dharmaMessage}
          big={dharmaBig}
          fading={dharmaFading}
        />
      )}
    </div>
  );
}

export default MaraLayer;
