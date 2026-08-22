// src/game/rules/venomImpulse.ts
// v49 — Rooster/Snake/Pig v0 ("physics not powers"). Diseño cerrado con
// Federico/Gemini/Chat: el Veneno ya no es un botón que el jugador activa —
// es el estado mental que el propio Avatar tiene AL EMPEZAR el turno, según
// su situación en el tablero. Tres reglas, cero fichas nuevas, cero estados
// nuevos aparte de una marca transitoria (justReturnedFromMara, ver types.ts):
//
//   ROOSTER (estaba apilado con otro Avatar propio) — si se mueve, no puede
//   terminar apilado de nuevo con un Avatar propio.
//
//   SNAKE (estaba solo) — no puede capturar.
//
//   PIG (recién volvió de Mara) — si tiene algún movimiento legal, debe ser
//   el Avatar elegido este turno (el jugador no puede elegir otro en su
//   lugar). Lo que PIG le permita hacer una vez elegido lo deciden Rooster/
//   Snake normalmente si aplican — son capas distintas (selección vs.
//   resultado), no una cadena de prioridad: no hace falta desambiguar cuál
//   "gana" cuando un Avatar recién vuelto de Mara también está solo.
//
// Solo aplica a Avatares (RealmPieceKind) en Fase 2 — antes de Oriol los
// Venenos son piezas físicas normales y no hay "Avatar" seleccionable al que
// aplicarles un impulso (ver getMoveOptionsForPlayer.ts).

import type { GameState, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";

export type PositionalImpulse = "ROOSTER" | "SNAKE";

// ¿Cuántos Avatares PROPIOS (nunca Venenos) del jugador ocupan esta casilla,
// sin contar al propio `excludeKind`?
function countOwnAvatarsAtPos(
  state: GameState,
  player: PlayerId,
  pos: number,
  excludeKind?: RealmPieceKind
): number {
  return REALM_PIECE_ORDER.filter((kind) => {
    if (kind === excludeKind) return false;
    const p = state.realmPieces[player]?.[kind];
    return Boolean(p && p.unlocked && !p.inLimbo && p.pos === pos);
  }).length;
}

// ¿Este Avatar está apilado AHORA MISMO con otro Avatar propio? (estado al
// empezar el turno — se llama con el `state` previo a cualquier movimiento
// de este turno, así que "ahora" y "al empezar el turno" son lo mismo).
export function isAvatarStacked(
  state: GameState,
  player: PlayerId,
  pieceKind: RealmPieceKind
): boolean {
  const piece = state.realmPieces[player]?.[pieceKind];
  if (!piece || piece.inLimbo) return false;
  return countOwnAvatarsAtPos(state, player, piece.pos, pieceKind) >= 1;
}

// ¿Terminaría este Avatar apilado con otro Avatar propio si llegara a `toPos`?
export function wouldEndStacked(
  state: GameState,
  player: PlayerId,
  pieceKind: RealmPieceKind,
  toPos: number
): boolean {
  return countOwnAvatarsAtPos(state, player, toPos, pieceKind) >= 1;
}

// ROOSTER si estaba apilado al empezar el turno; SNAKE en cualquier otro
// caso (incluido "recién volvió de Mara y está solo" — PIG es una capa
// aparte, ver mustMoveDueToPig).
export function getPositionalImpulse(
  state: GameState,
  player: PlayerId,
  pieceKind: RealmPieceKind
): PositionalImpulse {
  return isAvatarStacked(state, player, pieceKind) ? "ROOSTER" : "SNAKE";
}

// PIG — ¿este Avatar debe ser el elegido este turno (si puede moverse)?
export function mustMoveDueToPig(
  state: GameState,
  player: PlayerId,
  pieceKind: RealmPieceKind
): boolean {
  return Boolean(state.justReturnedFromMara?.[player]?.[pieceKind]);
}
