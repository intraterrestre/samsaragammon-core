import MaraLayer from "../mara/MaraLayer";
import type { RealmPieceKind } from "../game/types";

type SamsaraStageProps = {
  dharmaMessage?: string;
  realmStep?: number;
  lastRealmKey?: RealmPieceKind | null;
  globalRollCount?: number;
  genesisComplete?: boolean;
  onGenesisComplete?: () => void;
};

export function SamsaraStage({
  dharmaMessage,
  realmStep = 1,
  lastRealmKey = null,
  globalRollCount = 0,
  genesisComplete = false,
  onGenesisComplete,
}: SamsaraStageProps) {
  return (
    <MaraLayer
      dharmaMessage={dharmaMessage}
      realmStep={realmStep}
      lastRealmKey={lastRealmKey}
      globalRollCount={globalRollCount}
      genesisComplete={genesisComplete}
      onGenesisComplete={onGenesisComplete}
    />
  );
}

export default SamsaraStage;
