import type {
  DecisionSignature,
  LastMove,
  MoveOption,
  Realm,
  PieceKind,
} from "../types";

type KarmaBreakdown = {
  combo: number;
  context: number;
  realm: number;
  pattern: number;
  purification: number;
  total: number;
};

type KarmaInput = {
  lastMove: LastMove | null;
  currentMove: MoveOption;
  didCapture: boolean;
  realm: Realm;
  decisionSignature: DecisionSignature;
  capturedPieceKind: PieceKind | null;
};

function getComboValue(
  lastMove: LastMove | null,
  currentMove: MoveOption
): number {
  if (!lastMove) return 0;

  const a = lastMove.pieceKind;
  const b = currentMove.pieceKind;

  if (
    (a === "pig" && b === "rooster") ||
    (a === "rooster" && b === "pig")
  ) {
    return 3;
  }

  if (
    (a === "pig" && b === "snake") ||
    (a === "snake" && b === "pig")
  ) {
    return 5;
  }

  if (
    (a === "snake" && b === "rooster") ||
    (a === "rooster" && b === "snake")
  ) {
    return 8;
  }

  return 0;
}

function getContextValue(didCapture: boolean): number {
  return didCapture ? 2 : 0;
}

function getRealmModifier(realm: Realm): number {
  switch (realm) {
    case "HUNGRY_GHOST":
      return -2;
    case "HELL":
      return -1;
    case "ANIMALS":
      return 0;
    case "HUMANS":
      return 1;
    case "TITANS":
      return 2;
    case "SEMIGODS":
      return 1;
    case "BUDDHA":
      return 3;
    default:
      return 0;
  }
}

function getPatternValue(decisionSignature: DecisionSignature): number {
  let patternBonus = 0;

  const totalPieces =
    decisionSignature.pigTrace +
    decisionSignature.snakeTrace +
    decisionSignature.roosterTrace;

  if (totalPieces <= 0) return 0;

  const pigPct = decisionSignature.pigTrace / totalPieces;
  const snakePct = decisionSignature.snakeTrace / totalPieces;
  const roosterPct = decisionSignature.roosterTrace / totalPieces;

  const maxUse = Math.max(pigPct, snakePct, roosterPct);
  const minUse = Math.min(pigPct, snakePct, roosterPct);

  // abuso de una sola ficha
  if (maxUse > 0.6) {
    patternBonus -= 2;
  }

  // balance real entre las tres
  if (maxUse < 0.5 && minUse > 0.2) {
    patternBonus += 3;
  }
  // variedad ligera
  else if (maxUse < 0.7) {
    patternBonus += 1;
  }

  return patternBonus;
}

function getPurificationValue(capturedPieceKind: PieceKind | null): number {
  if (!capturedPieceKind) return 0;

  switch (capturedPieceKind) {
    case "pig":
      return 4;
    case "snake":
      return 2;
    case "rooster":
      return 1;
    default:
      return 0;
  }
}

export function computeKarmaTurn(input: KarmaInput): KarmaBreakdown {
  const combo = getComboValue(input.lastMove, input.currentMove);
  const context = getContextValue(input.didCapture);
  const realm = getRealmModifier(input.realm);
  const pattern = getPatternValue(input.decisionSignature);
  const purification = getPurificationValue(input.capturedPieceKind);

  const total = combo + context + realm + pattern + purification;

  return {
    combo,
    context,
    realm,
    pattern,
    purification,
    total,
  };
}