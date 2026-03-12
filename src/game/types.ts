// src/game/types.ts
import type { PatternEngineState } from "./behavior/patternEngine";
import type { BehaviorState } from "./behavior/types";

export type PlayerId = "P1" | "P2";

export type Phase = "idle" | "rolled";

export type PieceState = {
  pos: number;
};

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
 * Snapshot del último movimiento
 * Se usa para UI + logging + análisis de patrones
 */
export type LastMove = {
  at: number;

  player: PlayerId;

  a: number;
  b: number;

  chosenValue: number;
  choice: Choice;

  fromPos: number;
  toPos: number;

  didCapture: boolean;

  fromRealm: Realm;
  toRealm: Realm;

  turnIndex: number;
  cycleIndex: number;

  level: number;
};

/**
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
 * Estado completo del juego
 */
export type GameState = {
  // telemetría / psicología
  behavior: BehaviorState;
  pattern: PatternEngineState;

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
  pieces: Record<PlayerId, PieceState>;

  // capturas
  captures: Record<PlayerId, number>;

  // progreso samsárico
  realmProgress: Record<PlayerId, RealmProgress>;

  // nivel del motor
  level: number;

  // snapshot del último movimiento
  lastMove: LastMove | null;

  // ganador
  winner: PlayerId | null;
};