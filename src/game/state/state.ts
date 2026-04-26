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
  globalRollCount: 0,

  // board / turn
  trackSize: 24,
  turn: "P1",
  phase: "idle",
  rollOptions: null,

  // 3 fichas por jugador
 pieces: {
  P1: {
    pig: { pos: 0, inLimbo: false, maraLevel: null },
    snake: { pos: 1, inLimbo: false, maraLevel: null },
    rooster: { pos: 2, inLimbo: false, maraLevel: null },
  },
  P2: {
    pig: { pos: 12, inLimbo: false, maraLevel: null },
    snake: { pos: 13, inLimbo: false, maraLevel: null },
    rooster: { pos: 14, inLimbo: false, maraLevel: null },
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
emojiEvents: [],
  level: 3,
  currentNidana: null,

  // last movement snapshot
  lastMove: null,
  lastKarma: null,

  karmaTotal: {
    P1: 0,
    P2: 0,
  },

  ledgerOpen: false,
  ledgerEntry: null,

  introSeen: false,

  winner: null,

  curvature: {
    P1: 20,
    P2: 80,
  },
  venomTrio: null,
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

globalRollCount:
  overrides.globalRollCount === undefined
    ? initialState.globalRollCount
    : overrides.globalRollCount,

emojiEvents:
  overrides.emojiEvents === undefined
    ? initialState.emojiEvents
    : overrides.emojiEvents,

currentNidana:
  overrides.currentNidana === undefined
    ? initialState.currentNidana
    : overrides.currentNidana,

    lastMove:
      overrides.lastMove === undefined
        ? initialState.lastMove
        : overrides.lastMove,

    lastKarma:
      overrides.lastKarma === undefined
        ? initialState.lastKarma
        : overrides.lastKarma,

    karmaTotal: {
      ...initialState.karmaTotal,
      ...(overrides.karmaTotal ?? {}),
    },

    ledgerOpen:
      overrides.ledgerOpen === undefined
        ? initialState.ledgerOpen
        : overrides.ledgerOpen,

    ledgerEntry:
      overrides.ledgerEntry === undefined
        ? initialState.ledgerEntry
        : overrides.ledgerEntry,

    introSeen:
      overrides.introSeen === undefined
        ? initialState.introSeen
        : overrides.introSeen,
        
        venomTrio:
      overrides.venomTrio === undefined
       ? initialState.venomTrio
       : overrides.venomTrio,
  };
}