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

// v55 (17 agosto 2026) — pedido de Federico, coreografía correcta del
// cierre (la vuelta pasada la había entendido mal): NO son 7 etapas,
// son 8. Entre "6 entra whitman" (Whitman ya jugable) y "7 nirvana dj"
// (formación completa, 6/6 en Humans, luna destapada) hay una etapa
// intermedia — "7 A one more.webp" — que se muestra apenas un jugador
// llega a 5/6 en Humans (mismo evento que ya dispara el cartel "ONLY
// ONE MORE" + Buda DJ + scratch, ver GameShell). Destapa el turbante
// pero todavía NO la luna — esa queda exclusiva para "7 nirvana dj".
const oneMoreMuralModules = import.meta.glob(
  "../assets/intro/*one more*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

// v65 (20 agosto 2026) — entre que se revelan los Venenos y que
// Bruno aparece de verdad, el tablero debe verse "totalmente
// pintado de verde, sin ningún Avatar todavía" — no en blanco.
// Federico restauró genesis_cv24.webp en assets/genesis/ (no en
// intro/ donde vivía antes).
import boardBaseMural from "../assets/genesis/genesis_cv24.webp";

// Fallback genérico: usa el tablero base neutro en vez de mostrar
// por error el mural de un Avatar específico.
const fallbackMural = boardBaseMural;

const ERA_KEYS = ["bruno", "margot", "oriol", "marino", "rufus", "whitman"] as const;
type EraKey = (typeof ERA_KEYS)[number] | "nirvana" | "one_more" | "none";

function findMuralFor(era: string): string {
  if (era === "nirvana") {
    const key = Object.keys(nirvanaMuralModules)[0];
    return key ? nirvanaMuralModules[key] : fallbackMural;
  }
  if (era === "one_more") {
    const key = Object.keys(oneMoreMuralModules)[0];
    return key ? oneMoreMuralModules[key] : fallbackMural;
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
  one_more: findMuralFor("one_more"),
  nirvana: findMuralFor("nirvana"),
  none: boardBaseMural,
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
  onGenesisSkip?: () => void;
}

export function MaraLayer({
  dharmaMessage = "",
  dharmaBig = false,
  dharmaFading = false,
  realmStep = 1,
  globalRollCount = 0,
  genesisComplete = false,
  boardPainted,
  era = "bruno",
  onGenesisComplete,
  onGenesisPhaseChange,
  onGenesisSkip,
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
    <>
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
            onSkip={onGenesisSkip}
          />
        )}
      </div>

      {/* v50 (14 agosto 2026) — DharmaConnector/DharmaBubble sacados de
          .maraLayer a .maraDharmaOverlay (mismo tamaño/posicion exacta,
          ver mara.css) para que puedan quedar por encima de las fichas
          apiladas de Board.tsx. layerRef sigue apuntando a .maraLayer
          para medir layerRect — ambos divs tienen la misma geometria,
          asi que el calculo de connectorEnd no cambia. */}
      <div className="maraDharmaOverlay">
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
    </>
  );
}

export default MaraLayer;
