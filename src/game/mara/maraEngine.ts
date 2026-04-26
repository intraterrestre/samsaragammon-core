import type { PlayerId, PieceKind } from "../types";

const ALL_PIECES: PieceKind[] = ["pig", "snake", "rooster"];

export function sendToMara(pieces: any, player: PlayerId, kind: PieceKind) {
  const next = structuredClone(pieces);

  next[player][kind] = {
    ...next[player][kind],
    pos: 0,
    inLimbo: true,
    maraLevel: 0,
  };

  return next;
}

export function stepMara(pieces: any) {
  const next = structuredClone(pieces);

  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const kind of ALL_PIECES) {
      const piece = next[player][kind];

      if (!piece.inLimbo) continue;

      piece.maraLevel += 1;

      if (piece.maraLevel >= 6) {
        piece.inLimbo = false;
        piece.maraLevel = 0;
        piece.pos = 0; // luego mejoras spawn
      }
    }
  }

  return next;
}