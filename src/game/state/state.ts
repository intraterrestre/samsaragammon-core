// src/game/state/state.ts
import type { GameState } from "../types";
import { createBehaviorState } from "../behavior/behavior";
import { createPatternEngine } from "../behavior/patternEngine";

/**
 * Estado inicial del juego
 * - trackSize: 24 (6 reinos × 4 casillas)
 * - level: 3 (A+B ya disponible)
 */
export const initialState: GameState = {
  // invisible engines
  behavior: createBehaviorState(),
  pattern: createPatternEngine(),

  // counters
  turnIndex: 0,
  cycleIndex: 0,

  // board / turn
  trackSize: 24,
  turn: "P1",
  phase: "idle",
  rollOptions: null,

  pieces: {
    P1: { pos: 0 },
    P2: { pos: 0 },
  },

  captures: {
    P1: 0,
    P2: 0,
  },

  // realm loop progress
  realmProgress: {
    P1: {
      currentRealmStep: 1,
      completedLoopsInRealm: 0,
      currentLoopProgress: 0,
      realmTransitions: 0,
    },
    P2: {
      currentRealmStep: 1,
      completedLoopsInRealm: 0,
      currentLoopProgress: 0,
      realmTransitions: 0,
    },
  },

  level: 3,

  // last movement snapshot
  lastMove: null,

  winner: null,
};

/**
 * Helper para crear estados iniciales personalizados
 */
export function makeInitialState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialState,
    ...overrides,

    behavior: overrides.behavior ?? initialState.behavior,
    pattern: overrides.pattern ?? initialState.pattern,

    pieces: {
      ...initialState.pieces,
      ...(overrides.pieces ?? {}),
      P1: {
        ...initialState.pieces.P1,
        ...(overrides.pieces?.P1 ?? {}),
      },
      P2: {
        ...initialState.pieces.P2,
        ...(overrides.pieces?.P2 ?? {}),
      },
    },

    captures: {
      ...initialState.captures,
      ...(overrides.captures ?? {}),
    },

    realmProgress: {
      ...initialState.realmProgress,
      ...(overrides.realmProgress ?? {}),
      P1: {
        ...initialState.realmProgress.P1,
        ...(overrides.realmProgress?.P1 ?? {}),
      },
      P2: {
        ...initialState.realmProgress.P2,
        ...(overrides.realmProgress?.P2 ?? {}),
      },
    },

    lastMove:
      overrides.lastMove === undefined
        ? initialState.lastMove
        : overrides.lastMove,
  };
}