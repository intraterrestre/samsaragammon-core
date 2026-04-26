import { REALM_CANON } from "./realm/realmCanon";
import { karmaOracle } from "./karma/karmaOracle";
import { masterOracleLine } from "./master/masterEngine";
import { karmaMirror } from "./karma/karmaMirror";
import { getMirrorPatternReading } from "./karma/getMirrorPatternReading";
import { getMasterMessage } from "./karma/getMasterMessage";
import type { GameState, PlayerId } from "./types";

type DerivedState = {
  hasRolled: boolean;
  a: number | null;
  b: number | null;
  sum: number | null;
  realmDataP1: any;
  realmDataP2: any;
  activeRealmData: any;
  activeEra: string;
  cyclesDone: number;
  cyclesNeeded: number;
  transitions: number;
  oracleText: string;
  mirrorData: {
    title: string;
    body: string;
    tags: string[];
  };
};

export function getGameDerivedState(params: {
  state: GameState;
  selectedPos: (player: PlayerId) => number;
}): DerivedState {
  const { state, selectedPos } = params;

  const hasRolled = state.phase === "rolled";
  const a = state.rollOptions?.[0] ?? null;
  const b = state.rollOptions?.[1] ?? null;
  const sum = a == null || b == null ? null : a + b;

  const realmIndexFromPos = (pos: number) => {
    return Math.max(0, Math.min(Math.floor(pos / 4), REALM_CANON.length - 1));
  };

  const realmIndexP1 = realmIndexFromPos(selectedPos("P1"));
  const realmIndexP2 = realmIndexFromPos(selectedPos("P2"));

  const realmDataP1 = REALM_CANON[realmIndexP1];
  const realmDataP2 = REALM_CANON[realmIndexP2];

  const activeRealmData = state.turn === "P1" ? realmDataP1 : realmDataP2;
  const activeEra = activeRealmData?.era ?? "Unknown";
  const activePlayer = state.turn;

  const activeProgress = state.realmProgress[activePlayer];
  const cyclesDone = activeProgress.completedLoopsInRealm;

  const loopsRequiredForRealmStep = (step: number) => {
    if (step >= 7) return 0;
    return step * 7;
  };

  const cyclesNeeded = loopsRequiredForRealmStep(
    activeProgress.currentRealmStep
  );
  const transitions = activeProgress.realmTransitions;

  const activePatternRaw =
    state.turn === "P1"
      ? (state.pattern as any)?.players?.P1?.label ??
        (state.pattern as any)?.P1?.label ??
        "UNKNOWN"
      : (state.pattern as any)?.players?.P2?.label ??
        (state.pattern as any)?.P2?.label ??
        "UNKNOWN";

  const activeChoice = state.lastMove?.choice ?? null;

  const oracleReading = karmaOracle({
    pattern: activePatternRaw,
    realm: activeRealmData?.id ?? "UNKNOWN",
    didCapture: state.lastMove?.didCapture ?? false,
    choice: activeChoice,
  });

  const fallbackOracleText = masterOracleLine(oracleReading, state.level);

  const mirrorData = getMirrorPatternReading({
    pattern: state.lastKarma?.pattern ?? 0,
    decisionSignature: state.decisionSignature[state.turn],
  });

  const oracleText = getMasterMessage(
    state.lastMove?.capturedPieceKind ?? null,
    state.lastMove?.meaning ?? "",
    state.lastKarma?.pattern ?? 0
  ) || fallbackOracleText;

  return {
    hasRolled,
    a,
    b,
    sum,
    realmDataP1,
    realmDataP2,
    activeRealmData,
    activeEra,
    cyclesDone,
    cyclesNeeded,
    transitions,
    oracleText,
    mirrorData,
  };
}