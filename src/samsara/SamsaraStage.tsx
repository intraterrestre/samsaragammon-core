import MaraLayer from "../mara/MaraLayer";
import type { RealmPieceKind } from "../game/types";

type SamsaraStageProps = {
  dharmaMessage?: string;
  // v2: Genesis reveal
  realmStep?: number;
  lastRealmKey?: RealmPieceKind | null;
};

export function SamsaraStage({
  dharmaMessage,
  realmStep = 1,
  lastRealmKey = null,
}: SamsaraStageProps) {
  return (
    <MaraLayer
      dharmaMessage={dharmaMessage}
      realmStep={realmStep}
      lastRealmKey={lastRealmKey}
    />
  );
}

export default SamsaraStage;
