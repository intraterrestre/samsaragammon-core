import MaraLayer from "../mara/MaraLayer";
import type { RealmPieceKind } from "../game/types";

type SamsaraStageProps = {
  dharmaMessage?: string;
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
  onGenesisComplete?: () => void;
  onGenesisPhaseChange?: (phase: string) => void;
};

export function SamsaraStage({
  dharmaMessage,
  realmStep = 1,
  lastRealmKey = null,
  globalRollCount = 0,
  genesisComplete = false,
  boardPainted,
  onGenesisComplete,
  onGenesisPhaseChange,
}: SamsaraStageProps) {
  return (
    <MaraLayer
      dharmaMessage={dharmaMessage}
      realmStep={realmStep}
      lastRealmKey={lastRealmKey}
      globalRollCount={globalRollCount}
      genesisComplete={genesisComplete}
      boardPainted={boardPainted}
      onGenesisComplete={onGenesisComplete}
      onGenesisPhaseChange={onGenesisPhaseChange}
    />
  );
}

export default SamsaraStage;
