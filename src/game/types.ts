// src/game/types.ts
import type { PatternEngineState } from "./behavior/patternEngine";
import type { BehaviorState } from "./behavior/types";

export type PlayerId = "P1" | "P2";

export type Phase = "idle" | "rolled";

/**
 * Tipos de ficha por jugador
 */
export type PieceKind = "pig" | "snake" | "rooster";

/**
 * Estado de una ficha individual
 */
export type SinglePieceState = {
  pos: number;
};

/**
 * Las 3 fichas de un jugador
 */
export type PlayerPiecesState = {
  pig: SinglePieceState;
  snake: SinglePieceState;
  rooster: SinglePieceState;
};

/**
 * Qué ficha tiene seleccionada cada jugador
 */
export type SelectedPieceState = Record<PlayerId, PieceKind>;

/**
 * Reinos del Samsara
 * Ordenados según REALM_CANON
 */
export type Realm =
  | "HUNGRY_GHOST"
  | "HELL"
  | "ANIMALS"
  | "HUMANS"
  | "TITANS"
  | "SEMIGODS"
  | "BUDDHA";

/**
 * Opciones de movimiento
 */
export type Choice = "A" | "B" | "AB" | "ECO";

/**
 * Significado táctico / kármico de una opción
 */
export type MoveMeaning =
  | "IMPACT"
  | "RISK"
  | "SAME"
  | "SAFE"
  | "PROGRESS"
  | "";

/**
 * Una posibilidad concreta de movimiento antes de elegir
 */
export type MoveOption = {
  pieceKind: PieceKind;
  choice: Choice;
  value: number;
  fromPos: number;
  toPos: number;
  meaning: MoveMeaning;
};

/**
 * Snapshot del último movimiento
 * Se usa para UI + logging + análisis de patrones
 */
export type LastMove = {
  at: number;

  player: PlayerId;
  pieceKind: PieceKind;

  // dados originales
  a: number;
  b: number;

  // decisión tomada
  chosenValue: number;
  choice: Choice;
  meaning: MoveMeaning;

  // movimiento
  fromPos: number;
  toPos: number;

  // captura
  didCapture: boolean;
  capturedPieceKind: PieceKind | null;

  // reinos
  fromRealm: Realm;
  toRealm: Realm;

  // tiempo / progreso
  turnIndex: number;
  cycleIndex: number;
  level: number;

  // contexto de decisión
  availableOptions: MoveOption[];
  availableOptionsCount: number;
}; 

/**
 * Progreso espiritual dentro del reino actual
 */
export type RealmProgress = {
  currentRealmStep: number; // 1..7 según REALM_CANON
  completedLoopsInRealm: number; // vueltas completas dentro del reino
  currentLoopProgress: number; // progreso dentro de la vuelta actual
  realmTransitions: number; // cuántas veces ha ascendido de reino
};

/**
 * Curvatura / morph visual por jugador
 * Lo dejamos por jugador por ahora, no por ficha.
 */
export type CurvatureState = {
  P1: number;
  P2: number;
};

/**
 * Firma conductual de una partida
 */
export type DecisionSignature = {
  pigTrace: number;
  snakeTrace: number;
  roosterTrace: number;

  impactChoices: number;
  riskChoices: number;
  sameChoices: number;
  safeChoices: number;
  progressChoices: number;

  compassionSkips: number;
  capturesMade: number;
  captureOpportunitiesSeen: number;
  capturesAvoided: number;

  abChoices: number;
  aChoices: number;
  bChoices: number;
  ecoChoices: number;

  totalMoves: number;
};

/**
 * Lectura resumida del estilo de decisión del jugador
 */
export type KarmaReport = {
  dominantAnimal: "pig" | "snake" | "rooster" | "balanced";
  dominantStyle: "impact" | "risk" | "safe" | "progress" | "mixed";
  summary: string;
  observations: string[];
  metrics: {
    pigPct: number;
    snakePct: number;
    roosterPct: number;
    impactPct: number;
    riskPct: number;
    safePct: number;
    progressPct: number;
    compassionPct: number;
  };
};

/**
 * Estado completo del juego
 */
export type GameState = {
  // telemetría / psicología
  behavior: BehaviorState;
  pattern: PatternEngineState;

  // firma conductual
  decisionSignature: Record<PlayerId, DecisionSignature>;

  // contadores del motor
  turnIndex: number;
  cycleIndex: number;

  // tablero
  trackSize: number;

  // turno
  turn: PlayerId;
  phase: Phase;

  // dados
  rollOptions: [number, number] | null;

  // piezas
  pieces: Record<PlayerId, PlayerPiecesState>;
  selectedPiece: SelectedPieceState;

  // capturas
  captures: Record<PlayerId, number>;

  // progreso samsárico
  realmProgress: Record<PlayerId, RealmProgress>;

  // nivel del motor
  level: number;

  // snapshot del último movimiento
  lastMove: LastMove | null;

  // ledger / revelaciones
  ledgerOpen: boolean;
  ledgerEntry: string | null;

  // ganador
  winner: PlayerId | null;

  // curvatura visual
  curvature: CurvatureState;
};