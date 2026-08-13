import type {
  DecisionSignature,
  LastMove,
  MoveOption,
  CanonicalRealmId,
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
  realm: CanonicalRealmId;
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

// v47 (13 agosto 2026) — cierre de deuda tecnica a pedido de Federico.
// Esta funcion comparaba contra "HUNGRY_GHOST"/"HELL"/"TITANS"/
// "SEMIGODS"/"BUDDHA" (vocabulario que ni siquiera pertenecia al tipo
// Realm real de game/types.ts — ya daba error de TypeScript,
// TS2678, ignorado como "ruido de siempre"), mientras que el valor
// que de verdad le llegaba en tiempo de ejecucion (via
// src/UI/realm.ts, que tenia su import roto) era otro vocabulario
// distinto ("NARAKA"/"HUMAN"/etc). Ningun caso coincidia jamas: esta
// funcion SIEMPRE devolvio 0 por el default, para cualquier reino,
// desde que se escribio. Con el import de UI/realm.ts arreglado y
// canonicalRealmFromPos() como unico traductor, ahora compara contra
// los 6 IDs canonicos reales (RealmPieceKind) y queda correctamente
// tipada — pero a proposito TODOS los casos siguen devolviendo 0, tal
// cual pidio Federico ("aunque todos los modificadores sigan siendo
// 0... asi cuando algun dia pongas un +1/-1 no despiertas un sistema
// roto"). Ajustar estos valores es una decision de diseño aparte, no
// parte de esta normalizacion.
function getRealmModifier(realm: CanonicalRealmId): number {
  switch (realm) {
    case "hungry_ghost":
      return 0;
    case "hell":
      return 0;
    case "animals":
      return 0;
    case "humans":
      return 0;
    case "asura":
      return 0;
    case "deva":
      return 0;
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