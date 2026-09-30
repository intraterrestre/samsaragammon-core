// src/game/rules/legalMoves.ts
//
// PLAY WITH BUDDHA — paso 1 (30 septiembre 2026).
//
// Lista TODAS las jugadas legales de un jugador en este instante, sin
// depender de lo que tenga seleccionado. No es una regla nueva: es un
// envoltorio de solo lectura sobre getMoveOptionsForPlayer, que sigue
// siendo la única fuente de verdad (el reducer valida cada jugada con
// ella). Así que lo que devuelve este archivo es, por construcción, lo
// mismo que el reducer aceptaría.
//
// Por qué hace falta: en Fase 2 getMoveOptionsForPlayer devuelve []
// hasta que el jugador eligió Avatar Y Veneno. Para poder iluminar qué
// Avatares tienen jugada (y, tras tocar uno, qué Venenos le sirven), o
// para detectar una tirada sin ninguna jugada posible, hay que probar
// todas las combinaciones. Se prueban sobre una COPIA del estado con la
// selección cambiada — el estado real nunca se toca.
//
// PIG queda cubierto solo: si un Avatar recién vuelto de Mara está
// obligado, cualquier otra selección da [] en getMoveOptionsForPlayer,
// así que aquí solo aparecen las jugadas del Avatar forzado.

import type {
  BasePieceKind,
  GameState,
  MoveOption,
  PieceKind,
  PlayerId,
  RealmPieceKind,
} from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { getUnlockedBasePieces } from "../era";
import { getMoveOptionsForPlayer } from "./getMoveOptionsForPlayer";

const BASE_PIECES: BasePieceKind[] = ["pig", "snake", "rooster"];

export type LegalMove = {
  // Avatar que se mueve, o null si es un Veneno moviéndose solo (Fase 1).
  avatar: RealmPieceKind | null;
  // Veneno que origina el destino: el propio Veneno en Fase 1, o el
  // Veneno elegido como motor del Avatar.
  venom: BasePieceKind | null;
  option: MoveOption;
};

const isBasePiece = (kind: PieceKind): kind is BasePieceKind =>
  BASE_PIECES.includes(kind as BasePieceKind);

// Mismo criterio exacto que getMoveOptionsForPlayer y SELECT_PIECE.
export function isPhase2(state: GameState, player: PlayerId): boolean {
  return state.realmProgress[player].currentRealmStep >= 3;
}

function withSelection(
  state: GameState,
  player: PlayerId,
  avatar: RealmPieceKind,
  venom: BasePieceKind
): GameState {
  return {
    ...state,
    selectedPiece: { ...state.selectedPiece, [player]: avatar },
    selectedVenom: { ...state.selectedVenom, [player]: venom },
  };
}

export function getAllLegalMoves(
  state: GameState,
  player: PlayerId
): LegalMove[] {
  if (!state.rollOptions) return [];

  if (!isPhase2(state, player)) {
    // Fase 1: la función ya devuelve todo, sin mirar la selección.
    return getMoveOptionsForPlayer(state, player).map((option) =>
      isBasePiece(option.pieceKind)
        ? { avatar: null, venom: option.pieceKind, option }
        : {
            avatar: option.pieceKind as RealmPieceKind,
            venom: option.venomId ?? null,
            option,
          }
    );
  }

  const moves: LegalMove[] = [];
  for (const avatar of REALM_PIECE_ORDER) {
    if (!state.realmPieces[player]?.[avatar]?.unlocked) continue;
    for (const venom of getUnlockedBasePieces(BASE_PIECES)) {
      const options = getMoveOptionsForPlayer(
        withSelection(state, player, avatar, venom),
        player
      );
      for (const option of options) moves.push({ avatar, venom, option });
    }
  }
  return moves;
}

export function hasAnyLegalMove(state: GameState, player: PlayerId): boolean {
  return getAllLegalMoves(state, player).length > 0;
}

// Piezas que el jugador puede tocar para empezar una jugada: en Fase 1
// Venenos y Avatares que tienen alguna opción; en Fase 2 solo Avatares.
export function getMovablePieces(
  state: GameState,
  player: PlayerId
): Set<PieceKind> {
  const pieces = new Set<PieceKind>();
  for (const move of getAllLegalMoves(state, player)) {
    pieces.add(move.option.pieceKind);
  }
  return pieces;
}

// Fase 2, segundo paso: con este Avatar, qué Venenos dan alguna jugada.
export function getUsefulVenomsForAvatar(
  state: GameState,
  player: PlayerId,
  avatar: RealmPieceKind
): Set<BasePieceKind> {
  const venoms = new Set<BasePieceKind>();
  for (const move of getAllLegalMoves(state, player)) {
    if (move.avatar === avatar && move.venom) venoms.add(move.venom);
  }
  return venoms;
}
