// src/game/rules/humansReveal.ts
//
// 6 oct 2026 — Federico: las 4 casillas de Humanos no están pintadas
// (destapadas) en el mural hasta que llega Marino. Antes de eso nadie
// puede ganar un loto: ni por llegada limpia, ni por 666, ni por 777.
// Cuando Humanos se destapa, florecen los Avatares que ya estaban ahí
// sin haber sido capturados nunca (ver revealHumansLotuses).

import type { GameState, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { canonicalRealmFromPos } from "../../UI/realm";

const HUMANS_OPEN_ERAS = ["marino", "rufus", "whitman"];

export function humansRevealed(state: GameState): boolean {
  return (
    state.cosmicClock.transitionSequence > 0 &&
    HUMANS_OPEN_ERAS.includes(state.cosmicClock.era as string)
  );
}

// En el instante en que Humanos se destapa: loto para cada Avatar que
// ya está en Humanos sin haber sido capturado nunca.
export function revealHumansLotuses(prev: GameState, next: GameState): GameState {
  if (humansRevealed(prev) || !humansRevealed(next)) return next;
  let consolidated = next.consolidatedAvatars;
  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const kind of REALM_PIECE_ORDER as readonly RealmPieceKind[]) {
      const piece = next.realmPieces[player]?.[kind];
      if (!piece?.unlocked || piece.inLimbo || piece.everCaptured) continue;
      if (canonicalRealmFromPos(piece.pos) !== "humans") continue;
      if (consolidated[player]?.[kind]) continue;
      consolidated = {
        ...consolidated,
        [player]: { ...consolidated[player], [kind]: true },
      };
    }
  }
  return consolidated === next.consolidatedAvatars
    ? next
    : { ...next, consolidatedAvatars: consolidated };
}
