// src/game/rules/getMoveOptionsForPlayer.ts
// v2: destinos calculados desde posición del VENENO (no del Avatar)
//     soporte de dirección opuesta entre jugadores

import type {
  BasePieceKind,
  GameState,
  MoveMeaning,
  MoveOption,
  PieceKind,
  PlayerId,
  RealmPieceKind,
} from "../types";
import { previewMove } from "./preview";
import { applyRealmEffect } from "../realm/realmEffects";
import { getUnlockedBasePieces } from "../era";

const BASE_PIECES: BasePieceKind[] = ["pig", "snake", "rooster"];

const ACTIVE_BASE_PIECES: BasePieceKind[] = getUnlockedBasePieces(BASE_PIECES);

const REALM_PIECES: RealmPieceKind[] = [
  "hungry_ghost",
  "hell",
  "animals",
  "humans",
  "asura",
  "deva",
];

const isBasePiece = (kind: PieceKind): kind is BasePieceKind =>
  BASE_PIECES.includes(kind as BasePieceKind);

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

// v2: P1 va horario, P2 va antihorario
function getPlayerDirection(
  player: PlayerId
): "clockwise" | "counterclockwise" {
  return player === "P1" ? "clockwise" : "counterclockwise";
}

function resolveFinalPreviewPos(params: {
  fromPos: number;
  value: number;
  trackSize: number;
  level: number;
  player: PlayerId;
}): number {
  const direction = getPlayerDirection(params.player);

  // v2: usar previewMove con dirección
  const basePos = previewMove(
    params.fromPos,
    params.value,
    params.trackSize,
    direction
  );

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

  return ACTIVE_BASE_PIECES.filter((kind) => {
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
  if (enemyPositions.some((p) => Math.abs(p - target) <= 1)) return "RISK";
  return "";
}

function pushMoveIfLegal(params: {
  state: GameState;
  options: MoveOption[];
  player: PlayerId;
  pieceKind: PieceKind;
  choice: MoveOption["choice"];
  value: number;
  fromPos: number;  // posición del Veneno (origen del movimiento)
  toPos: number;
  enemyPositions: number[];
  isSame?: boolean;
}) {
  const enemyCount = countEnemyPiecesAtPos(
    params.state,
    params.player,
    params.toPos
  );

  // 2+ enemigos = casilla bloqueada
  if (enemyCount >= 2) return;

  params.options.push({
    pieceKind: params.pieceKind,
    choice: params.choice,
    value: params.value,
    fromPos: params.fromPos,
    toPos: params.toPos,
    meaning: inferMeaning(
      params.toPos,
      enemyCount,
      params.enemyPositions,
      params.isSame ?? false
    ),
  });
}

export function getMoveOptionsForPlayer(
  state: GameState,
  player: PlayerId
): MoveOption[] {
  if (!state.rollOptions) return [];

  const [a, b] = state.rollOptions;
  const isDouble = a === b;
  const opp = otherPlayer(player);

  const enemyPositions = ACTIVE_BASE_PIECES.filter(
    (kind) => !state.pieces[opp][kind].inLimbo
  ).map((kind) => state.pieces[opp][kind].pos);

  const options: MoveOption[] = [];

  const activePieceKinds: PieceKind[] = [
    ...ACTIVE_BASE_PIECES,
    ...REALM_PIECES.filter(
      (kind) => state.realmPieces[player]?.[kind]?.unlocked
    ),
  ];

  for (const pieceKind of activePieceKinds) {
    // v2: el origen del movimiento es la posición del VENENO (BasePiece)
    // Si el pieceKind ES un Veneno → usa su propia posición
    // Si el pieceKind es un Avatar realm → usa la posición del Veneno activo
    // Por ahora los realm pieces usan su propia posición (compatibilidad)
    const piece = isBasePiece(pieceKind)
      ? state.pieces[player][pieceKind]
      : state.realmPieces[player]?.[pieceKind];

    if (!piece || piece.inLimbo) continue;

    const fromPos = piece.pos;

    const toA = resolveFinalPreviewPos({
      fromPos,
      value: a,
      trackSize: state.trackSize,
      level: state.level,
      player,
    });

    pushMoveIfLegal({
      state,
      options,
      player,
      pieceKind,
      choice: "A",
      value: a,
      fromPos,
      toPos: toA,
      enemyPositions,
    });

    if (!isDouble) {
      const toB = resolveFinalPreviewPos({
        fromPos,
        value: b,
        trackSize: state.trackSize,
        level: state.level,
        player,
      });

      pushMoveIfLegal({
        state,
        options,
        player,
        pieceKind,
        choice: "B",
        value: b,
        fromPos,
        toPos: toB,
        enemyPositions,
      });

      if (toA === toB) {
        pushMoveIfLegal({
          state,
          options,
          player,
          pieceKind,
          choice: "ECO",
          value: a,
          fromPos,
          toPos: toA,
          enemyPositions,
          isSame: true,
        });
      }
    }

    if (state.level >= 3) {
      const sum = a + b;

      const toAB = resolveFinalPreviewPos({
        fromPos,
        value: sum,
        trackSize: state.trackSize,
        level: state.level,
        player,
      });

      pushMoveIfLegal({
        state,
        options,
        player,
        pieceKind,
        choice: "AB",
        value: sum,
        fromPos,
        toPos: toAB,
        enemyPositions,
      });
    }
  }

  return options;
}
