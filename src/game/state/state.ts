// src/game/state/state.ts
import type { DecisionSignature, GameState } from "../types";
import { createBehaviorState } from "../behavior/behavior";
import { createPatternEngine } from "../behavior/patternEngine";

const initialDecisionSignature = (): DecisionSignature => ({
  pigTrace: 0,
  snakeTrace: 0,
  roosterTrace: 0,

  impactChoices: 0,
  riskChoices: 0,
  sameChoices: 0,
  safeChoices: 0,
  progressChoices: 0,

  compassionSkips: 0,
  capturesMade: 0,
  captureOpportunitiesSeen: 0,
  capturesAvoided: 0,

  abChoices: 0,
  aChoices: 0,
  bChoices: 0,
  ecoChoices: 0,

  totalMoves: 0,
});

/**
 * Estado inicial del juego
 * - trackSize: 24 (6 reinos × 4 casillas)
 * - level: 3 (A+B ya disponible)
 */
export const initialState: GameState = {
  // invisible engines
  behavior: createBehaviorState(),
  pattern: createPatternEngine(),

  // firma conductual
  decisionSignature: {
    P1: initialDecisionSignature(),
    P2: initialDecisionSignature(),
  },

  // counters
  turnIndex: 0,
  cycleIndex: 0,

  // board / turn
  trackSize: 24,
  turn: "P1",
  phase: "idle",
  rollOptions: null,

  // 3 fichas por jugador
  pieces: {
    P1: {
      pig: { pos: 0 },
      snake: { pos: 1 },
      rooster: { pos: 2 },
    },
    P2: {
      pig: { pos: 12 },
      snake: { pos: 13 },
      rooster: { pos: 14 },
    },
  },

  // ficha seleccionada por jugador
  selectedPiece: {
    P1: "pig",
    P2: "pig",
  },

  // capturas totales por jugador
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
  ledgerOpen: false,
  ledgerEntry: null,
  winner: null,

  curvature: {
    P1: 20,
    P2: 80,
  },
};

/**
 * Helper para crear estados iniciales personalizados
 */
export function makeInitialState(
  overrides: Partial<GameState> = {}
): GameState {
  return {
    ...initialState,
    ...overrides,

    behavior: overrides.behavior ?? initialState.behavior,
    pattern: overrides.pattern ?? initialState.pattern,

    decisionSignature: {
      ...initialState.decisionSignature,
      ...(overrides.decisionSignature ?? {}),
      P1: {
        ...initialState.decisionSignature.P1,
        ...(overrides.decisionSignature?.P1 ?? {}),
      },
      P2: {
        ...initialState.decisionSignature.P2,
        ...(overrides.decisionSignature?.P2 ?? {}),
      },
    },

    pieces: {
      ...initialState.pieces,
      ...(overrides.pieces ?? {}),
      P1: {
        ...initialState.pieces.P1,
        ...(overrides.pieces?.P1 ?? {}),
        pig: {
          ...initialState.pieces.P1.pig,
          ...(overrides.pieces?.P1?.pig ?? {}),
        },
        snake: {
          ...initialState.pieces.P1.snake,
          ...(overrides.pieces?.P1?.snake ?? {}),
        },
        rooster: {
          ...initialState.pieces.P1.rooster,
          ...(overrides.pieces?.P1?.rooster ?? {}),
        },
      },
      P2: {
        ...initialState.pieces.P2,
        ...(overrides.pieces?.P2 ?? {}),
        pig: {
          ...initialState.pieces.P2.pig,
          ...(overrides.pieces?.P2?.pig ?? {}),
        },
        snake: {
          ...initialState.pieces.P2.snake,
          ...(overrides.pieces?.P2?.snake ?? {}),
        },
        rooster: {
          ...initialState.pieces.P2.rooster,
          ...(overrides.pieces?.P2?.rooster ?? {}),
        },
      },
    },

    selectedPiece: {
      ...initialState.selectedPiece,
      ...(overrides.selectedPiece ?? {}),
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

    curvature: {
      ...initialState.curvature,
      ...(overrides.curvature ?? {}),
    },

    lastMove:
      overrides.lastMove === undefined
        ? initialState.lastMove
        : overrides.lastMove,
            ledgerOpen:
      overrides.ledgerOpen === undefined
        ? initialState.ledgerOpen
        : overrides.ledgerOpen,

    ledgerEntry:
      overrides.ledgerEntry === undefined
        ? initialState.ledgerEntry
        : overrides.ledgerEntry,
  };
}