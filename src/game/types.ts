// src/game/types.ts
import type { PatternEngineState } from "./behavior/patternEngine";
import type { BehaviorState } from "./behavior/types";
import type { NidanaId } from "./nidanas";

export type PlayerId = "P1" | "P2";
export type Phase = "idle" | "rolled";
export type EmojiEvent = {
  player: PlayerId;
  emoji: string;
  at: number;
};
/**
 * Tipos de ficha por jugador
 */
export type PieceKind = "pig" | "snake" | "rooster";

/**
 * Estado de una ficha individual
 */
export type SinglePieceState = {
  pos: number;
  inLimbo: boolean;
  maraLevel: number | null; // 0..6
};
export type VenomTrioState = {
  pos: number;
  kind: "PURE" | "MIXED";
  owners: PlayerId[];
  pieces: { player: PlayerId; kind: PieceKind }[];
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
 * Alineados con REALM_CANON / REALMS
 */
export type Realm =
  | "HUNGRY_GHOST"
  | "HELL"
  | "ANIMALS"
  | "HUMANS"
  | "ASURA"
  | "DEVA"
  | "NIRVANA";

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
 */
export type LastMove = {
  at: number;

  player: PlayerId;
  pieceKind: PieceKind;

  a: number;
  b: number;

  chosenValue: number;
  choice: Choice;
  meaning: MoveMeaning;

  fromPos: number;
  toPos: number;

  didCapture: boolean;
  capturedPieceKind: PieceKind | null;

  fromRealm: Realm;
  toRealm: Realm;

  turnIndex: number;
  cycleIndex: number;
  level: number;

  availableOptions: MoveOption[];
  availableOptionsCount: number;
};

/**
 * Progreso espiritual dentro del reino actual
 */
export type RealmProgress = {
  currentRealmStep: number;
  completedLoopsInRealm: number;
  currentLoopProgress: number;
  realmTransitions: number;
};

/**
 * Curvatura / morph visual por jugador
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
  behavior: BehaviorState;
  pattern: PatternEngineState;

  decisionSignature: Record<PlayerId, DecisionSignature>;

  turnIndex: number;
  cycleIndex: number;
  globalRollCount: number;

  trackSize: number;

  turn: PlayerId;
  phase: Phase;

  rollOptions: [number, number] | null;
  emojiEvents: EmojiEvent[];

  
  pieces: Record<PlayerId, PlayerPiecesState>;
  selectedPiece: SelectedPieceState;

  captures: Record<PlayerId, number>;

  realmProgress: Record<PlayerId, RealmProgress>;

  level: number;
  currentNidana: NidanaId | null;

  lastMove: LastMove | null;

  lastKarma: {
    combo: number;
    context: number;
    realm: number;
    pattern: number;
    purification: number;
    total: number;
  } | null;

  karmaTotal: Record<PlayerId, number>;

  ledgerOpen: boolean;
  ledgerEntry: string | null;

  introSeen: boolean;

  winner: PlayerId | null;

  curvature: CurvatureState;
venomTrio: VenomTrioState | null;

coinBank: {
  karma: number;
  dharma: number;
};