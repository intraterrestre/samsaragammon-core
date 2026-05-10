import type { BasePieceKind, PlayerId } from "../types";

export type MirrorConflictState = {
  P1: Record<BasePieceKind, number>;
  P2: Record<BasePieceKind, number>;
};

export function createMirrorState(): MirrorConflictState {
  return {
    P1: {
      pig: 0,
      snake: 0,
      rooster: 0,
    },
    P2: {
      pig: 0,
      snake: 0,
      rooster: 0,
    },
  };
}

export function registerMirrorConflict(
  state: MirrorConflictState,
  player: PlayerId,
  kind: BasePieceKind
): MirrorConflictState {
  return {
    ...state,
    [player]: {
      ...state[player],
      [kind]: state[player][kind] + 1,
    },
  };
}