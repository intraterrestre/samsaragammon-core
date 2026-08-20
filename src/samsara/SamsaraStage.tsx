import MaraLayer from "../mara/MaraLayer";
import type { RealmPieceKind } from "../game/types";

type SamsaraStageProps = {
  dharmaMessage?: string;
  dharmaBig?: boolean;
  // v36 (13 agosto 2026) — el cartel del buda ahora es un evento
  // efímero (~5s + fade) en vez de una condición pegada — GameShell
  // calcula cuándo está en la fase de desvanecerse y la pasa acá para
  // que DharmaBubble le aplique la clase CSS de fade-out.
  dharmaFading?: boolean;
  realmStep?: number;
  lastRealmKey?: RealmPieceKind | null;
  globalRollCount?: number;
  genesisComplete?: boolean;
  // 2026-08-05: la pintura del tablero (samsara-painting-panel) debe
  // quedar visible apenas terminan las 24 casillas verdes (mismo punto
  // donde antes desaparecía el último frame cv24), aunque genesisComplete
  // ahora tarde 2 clics más en llegar (revelado de Venenos por jugador).
  // Si no se pasa, usa genesisComplete como antes (compatibilidad).
  boardPainted?: boolean;
  // 2026-08-05: era real (state.cosmicClock.era) — decide cuál de las 7
  // etapas del mural se muestra (ver MaraLayer.tsx).
  era?: string;
  onGenesisComplete?: () => void;
  onGenesisPhaseChange?: (phase: string) => void;
  onGenesisSkip?: () => void;
};

export function SamsaraStage({
  dharmaMessage,
  dharmaBig,
  dharmaFading,
  realmStep = 1,
  lastRealmKey = null,
  globalRollCount = 0,
  genesisComplete = false,
  boardPainted,
  era,
  onGenesisComplete,
  onGenesisPhaseChange,
  onGenesisSkip,
}: SamsaraStageProps) {
  return (
    <MaraLayer
      dharmaMessage={dharmaMessage}
      dharmaBig={dharmaBig}
      dharmaFading={dharmaFading}
      realmStep={realmStep}
      lastRealmKey={lastRealmKey}
      globalRollCount={globalRollCount}
      genesisComplete={genesisComplete}
      boardPainted={boardPainted}
      era={era}
      onGenesisComplete={onGenesisComplete}
      onGenesisPhaseChange={onGenesisPhaseChange}
      onGenesisSkip={onGenesisSkip}
    />
  );
}

export default SamsaraStage;
