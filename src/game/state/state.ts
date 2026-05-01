// src/game/state/state.ts

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
 */
export const initialState: GameState = {
  behavior: createBehaviorState(),
  pattern: createPatternEngine(),

  decisionSignature: {
    P1: initialDecisionSignature(),
    P2: initialDecisionSignature(),
  },

  turnIndex: 0,
  cycleIndex: 0,
  globalRollCount: 0,

  trackSize: 24,
  turn: "P1",
  phase: "idle",
  rollOptions: null,
  emojiEvents: [],

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

realmPieces: {
  P1: {},
  P2: {},
},

  realmTokens: {
    P1: [],
    P2: [],
  },

  selectedPiece: {
    P1: "pig",
    P2: "pig",
  },

  captures: {
    P1: 0,
    P2: 0,
  },

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
  currentNidana: null,
  activeNidanaEffect: null,

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

  coinBank: {
    karma: 0,
    dharma: 0,
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
      },
      P2: {
        ...initialState.pieces.P2,
        ...(overrides.pieces?.P2 ?? {}),
      },
    },

    realmPieces: {
      ...initialState.realmPieces,
      ...(overrides.realmPieces ?? {}),
      P1: {
        ...initialState.realmPieces.P1,
        ...(overrides.realmPieces?.P1 ?? {}),
      },
      P2: {
        ...initialState.realmPieces.P2,
        ...(overrides.realmPieces?.P2 ?? {}),
      },
    },

    realmTokens: {
      ...initialState.realmTokens,
      ...(overrides.realmTokens ?? {}),
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

    karmaTotal: {
      ...initialState.karmaTotal,
      ...(overrides.karmaTotal ?? {}),
    },

    coinBank: {
      ...initialState.coinBank,
      ...(overrides.coinBank ?? {}),
    },
  };
}