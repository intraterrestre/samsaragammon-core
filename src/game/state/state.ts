// src/game/state/state.ts

import { createBehaviorState } from "../behavior/behavior";
import { createPatternEngine } from "../behavior/patternEngine";
// 2026-08-22: GameState/DecisionSignature se usaban como anotación de tipo
// en este archivo sin importarlos nunca — TS no podia resolver el nombre
// (TS2304) y por lo tanto NO estaba comprobando que initialState/
// makeInitialState calzaran de verdad con la forma real de GameState.
// Cualquier desajuste de forma quedaba invisible hasta que reventara en
// runtime. Se importan del unico lugar donde se declaran.
import type { GameState, DecisionSignature } from "../types";

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
actors: {
  bruno: {
    id: "bruno",
    owner: "P1",
    pos: 0,
    inLimbo: false,
    maraLevel: null,
    unlocked: false,
  },
},

  realmTokens: {
    P1: [],
    P2: [],
  },

  selectedPiece: {
    P1: "pig",
    P2: "pig",
  },

  // v27 — ver SelectedVenomState en types.ts.
  selectedVenom: {
    P1: null,
    P2: null,
  },

  captures: {
    P1: 0,
    P2: 0,
  },

  maraVisits: {
    P1: 0,
    P2: 0,
  },
  nidanasActivated: {
    P1: 0,
    P2: 0,
  },
  // v68 — placeholder: RESET lo pisa con Date.now() real (ver
  // reducer.ts case "RESET"). initialState es estático, se evalúa una
  // sola vez al cargar el módulo, así que un timestamp real acá
  // quedaría pegado al momento de carga de la página, no al de cada
  // partida nueva.
  gameStartedAt: 0,
  // v68 — placeholder, mismo criterio que gameStartedAt.
  gameId: "",

  realmProgress: {
    P1: {
      currentRealmStep: 1,
      completedLoopsInRealm: 0,
      currentLoopProgress: 0,
      realmTransitions: 0,
      stageStartedAtRoll: 0,
      capturesInStage: 0,
      movesInStage: 0,
    },
    P2: {
      currentRealmStep: 1,
      completedLoopsInRealm: 0,
      currentLoopProgress: 0,
      realmTransitions: 0,
      stageStartedAtRoll: 0,
      capturesInStage: 0,
      movesInStage: 0,
    },
  },

  level: 3,
  currentNidana: null,
  lastNidanaAtTurn: -999,
  activeNidanaEffect: null,

  boardNidanas: {},
  avatarNidana: {
    P1: {},
    P2: {},
  },
  formedLinks: {
    P1: [],
    P2: [],
  },

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

  // v2: configuración por defecto
  config: {
    skipGenesis: false,
    victoryMode: "4x1",
    transitionEventSelection: "round_robin",
  },

  curvature: {
    P1: 20,
    P2: 80,
  },

  venomTrio: null,

  coinBank: {
    karma: 0,
    dharma: 0,
  },
realmAscension: null,

  // v4 — RFC Cosmic Clock (APLAZADO). Bruno es la primera Era; el
  // Orquestador actualiza esto cuando revela el siguiente Avatar
  // (ver reducer.ts, CONSCIOUS_MOVE). Nada más lee ni escribe este campo.
  cosmicClock: {
    era: "bruno",
    progress: 0,
    transitionSequence: 0,
  },

  // v5 — Acto 0. Ver types.ts para la explicación completa.
  genesisNovelty: {
    hasRolled: false,
    hasMoved: false,
    hasCaptured: false,
    hasMaraReturn: false,
  },
  brunoRevealed: false,
  genesisUIComplete: false,

  // v49 — Rooster/Snake/Pig v0. Ver types.ts para la explicación completa.
  justReturnedFromMara: {
    P1: {},
    P2: {},
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
    actors: {
  ...initialState.actors,
  ...(overrides.actors ?? {}),
},

    realmTokens: {
      ...initialState.realmTokens,
      ...(overrides.realmTokens ?? {}),
    },

    selectedPiece: {
      ...initialState.selectedPiece,
      ...(overrides.selectedPiece ?? {}),
    },

    selectedVenom: {
      ...initialState.selectedVenom,
      ...(overrides.selectedVenom ?? {}),
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

    justReturnedFromMara: {
      ...initialState.justReturnedFromMara,
      ...(overrides.justReturnedFromMara ?? {}),
      P1: {
        ...initialState.justReturnedFromMara.P1,
        ...(overrides.justReturnedFromMara?.P1 ?? {}),
      },
      P2: {
        ...initialState.justReturnedFromMara.P2,
        ...(overrides.justReturnedFromMara?.P2 ?? {}),
      },
    },

    boardNidanas: {
      ...initialState.boardNidanas,
      ...(overrides.boardNidanas ?? {}),
    },
    avatarNidana: {
      ...initialState.avatarNidana,
      ...(overrides.avatarNidana ?? {}),
      P1: {
        ...initialState.avatarNidana.P1,
        ...(overrides.avatarNidana?.P1 ?? {}),
      },
      P2: {
        ...initialState.avatarNidana.P2,
        ...(overrides.avatarNidana?.P2 ?? {}),
      },
    },
    formedLinks: {
      ...initialState.formedLinks,
      ...(overrides.formedLinks ?? {}),
      P1: overrides.formedLinks?.P1 ?? initialState.formedLinks.P1,
      P2: overrides.formedLinks?.P2 ?? initialState.formedLinks.P2,
    },
  };
}