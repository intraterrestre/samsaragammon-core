import type {
  GameState,
  MoveMeaning,
  MoveOption,
  PieceKind,
  PlayerId,
} from "../types";
import { previewMove } from "./preview";
import { applyRealmEffect } from "../realm/realmEffects";

const ALL_PIECES: PieceKind[] = ["pig", "snake", "rooster"];

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

function resolveFinalPreviewPos(params: {
  fromPos: number;
  value: number;
  trackSize: number;
  level: number;
  player: PlayerId;
}): number {
  const basePos = previewMove(params.fromPos, params.value, params.trackSize);

  const realmEffect = applyRealmEffect({
    level: params.level,
    trackSize: params.trackSize,
    toPos: basePos,
    didCapture: false,
    mover: params.player,
  });

  return typeof realmEffect.finalPos === "number"
    ? realmEffect.finalPos
    : basePos;
}

function countEnemyPiecesAtPos(
  state: GameState,
  player: PlayerId,
  targetPos: number
): number {
  const opp = otherPlayer(player);

  return ALL_PIECES.filter((kind) => {
    const piece = state.pieces[opp][kind];
    return !piece.inLimbo && piece.pos === targetPos;
  }).length;
}

function inferMeaning(
  target: number,
  enemyCountAtTarget: number,
  enemyPositions: number[],
  isSame: boolean
): MoveMeaning {
  if (isSame) return "SAME";
  if (enemyCountAtTarget === 1) return "IMPACT";
  if (enemyCountAtTarget >= 2) return "";
  if (enemyPositions.some((p) => Math.abs(p - target) <= 1)) return "RISK";
  return "";
}

export function getMoveOptionsForPlayer(
  state: GameState,
  player: PlayerId
): MoveOption[] {
  if (!state.rollOptions) return [];

  const [a, b] = state.rollOptions;
  const isDouble = a === b;
  const opp = otherPlayer(player);

  const enemyPositions = ALL_PIECES
    .filter((kind) => !state.pieces[opp][kind].inLimbo)
    .map((kind) => state.pieces[opp][kind].pos);

  const options: MoveOption[] = [];

  for (const pieceKind of ALL_PIECES) {
    const piece = state.pieces[player][pieceKind];
    if (piece.inLimbo) continue;

    const fromPos = piece.pos;

    const toA = resolveFinalPreviewPos({
      fromPos,
      value: a,
      trackSize: state.trackSize,
      level: state.level,
      player,
    });

    const enemyCountA = countEnemyPiecesAtPos(state, player, toA);

    // A siempre existe
    options.push({
      pieceKind,
      choice: "A",
      value: a,
      fromPos,
      toPos: toA,
      meaning: inferMeaning(toA, enemyCountA, enemyPositions, false),
    });

    // B solo si no es doble
    if (!isDouble) {
      const toB = resolveFinalPreviewPos({
        fromPos,
        value: b,
        trackSize: state.trackSize,
        level: state.level,
        player,
      });

      const enemyCountB = countEnemyPiecesAtPos(state, player, toB);

      options.push({
        pieceKind,
        choice: "B",
        value: b,
        fromPos,
        toPos: toB,
        meaning: inferMeaning(toB, enemyCountB, enemyPositions, false),
      });
    }

    // ECO solo si los dados son distintos pero el destino coincide
    if (!isDouble) {
      const toB = resolveFinalPreviewPos({
        fromPos,
        value: b,
        trackSize: state.trackSize,
        level: state.level,
        player,
      });

      if (toA === toB) {
        const enemyCountSame = countEnemyPiecesAtPos(state, player, toA);

        options.push({
          pieceKind,
          choice: "ECO",
          value: a,
          fromPos,
          toPos: toA,
          meaning: inferMeaning(toA, enemyCountSame, enemyPositions, true),
        });
      }
    }

    // AB siempre permitida a partir del nivel 3
    if (state.level >= 3) {
      const sum = a + b;

      const toAB = resolveFinalPreviewPos({
        fromPos,
        value: sum,
        trackSize: state.trackSize,
        level: state.level,
        player,
      });

      const enemyCountAB = countEnemyPiecesAtPos(state, player, toAB);

      options.push({
        pieceKind,
        choice: "AB",
        value: sum,
        fromPos,
        toPos: toAB,
        meaning: inferMeaning(toAB, enemyCountAB, enemyPositions, false),
      });
    }
  }

  return options;
}