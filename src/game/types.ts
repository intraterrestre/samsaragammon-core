// src/game/types.ts
import type { PatternEngineState } from "./behavior/patternEngine";
import type { BehaviorState } from "./behavior/types";
import type { NidanaId } from "./nidanas";
import type { ActorId } from "./actors/actorProfiles";

export type PlayerId = "P1" | "P2";
export type Phase = "idle" | "rolled";

export type EmojiEvent = {
  player: PlayerId;
  emoji: string;
  at: number;
};

export type BasePieceKind = "pig" | "snake" | "rooster";

export type RealmPieceKind =
  | "hungry_ghost"
  | "hell"
  | "animals"
  | "humans"
  | "asura"
  | "deva";

export type PieceKind = BasePieceKind | RealmPieceKind;

export type SinglePieceState = {
  pos: number;
  inLimbo: boolean;
  maraLevel: number | null;
};
export type ActorPieceState = SinglePieceState & {
  id: ActorId;
  unlocked: boolean;
  owner: PlayerId;
};

export type ActorPiecesState = Partial<
  Record<ActorId, ActorPieceState>
>;
export type RealmPieceState = SinglePieceState & {
  id: string;
  kind: RealmPieceKind;
  unlocked: boolean;
};

export type VenomTrioState = {
  pos: number;
  kind: "PURE" | "MIXED";
  owners: PlayerId[];
  pieces: { player: PlayerId; kind: PieceKind }[];
};

export type PlayerPiecesState = {
  pig: SinglePieceState;
  snake: SinglePieceState;
  rooster: SinglePieceState;
};
export type PlayerRealmPiecesState = Partial<
  Record<RealmPieceKind, RealmPieceState>
>;

export type SelectedPieceState = Record<PlayerId, string>;

export type Realm =
  | "HUNGRY_GHOST"
  | "HELL"
  | "ANIMALS"
  | "HUMANS"
  | "ASURA"
  | "DEVA"
  | "NIRVANA";

export type Choice = "A" | "B" | "AB" | "ECO";

export type MoveMeaning =
  | "IMPACT"
  | "RISK"
  | "SAME"
  | "SAFE"
  | "PROGRESS"
  | "";

export type MoveOption = {
  pieceKind: PieceKind;
  choice: Choice;
  value: number;
  fromPos: number;
  toPos: number;
  meaning: MoveMeaning;
  // v3 — Actualización Crítica (D-001/D-014): cuando pieceKind es un Avatar
  // (RealmPieceKind), venomId identifica qué Veneno originó este destino —
  // ese Veneno viaja junto con el Avatar al aplicarse la opción.
  // undefined cuando pieceKind ya es un Veneno moviéndose por sí mismo.
  venomId?: BasePieceKind;
};

export type LastMove = {
  at: number;

  player: PlayerId;
  pieceKind: PieceKind;

  // v2: Avatar y Veneno que generaron el movimiento
  avatarId?: import('./actors/actorProfiles').ActorId;
  venomUsed?: import('./actors/actorProfiles').VenomId;

  // v2: posición del Veneno antes y después del movimiento
  venomPositionBefore?: number;
  venomPositionAfter?: number;

  // v2: si había captura disponible y no se tomó (para D-018)
  captureWasAvailable: boolean;
  legalCapturesCount: number;
  turnLost: boolean;

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

export type RealmProgress = {
  currentRealmStep: number;
  completedLoopsInRealm: number;
  currentLoopProgress: number;
  realmTransitions: number;
};

export type CurvatureState = {
  P1: number;
  P2: number;
};

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

export type GameConfig = {
  skipGenesis: boolean;
  victoryMode: "4x1" | "2x2";
  transitionEventSelection: "round_robin" | "context_based" | "random";
};

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
  realmPieces: Record<PlayerId, PlayerRealmPiecesState>;
  actors: ActorPiecesState;
  realmTokens: Record<PlayerId, RealmPieceKind[]>;

  selectedPiece: SelectedPieceState;

  captures: Record<PlayerId, number>;

  realmProgress: Record<PlayerId, RealmProgress>;

  level: number;
  currentNidana: NidanaId | null;
  activeNidanaEffect: "CLARITY" | "DISTORTION" | "TENSION" | null;

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

  // v2: configuración de partida elegida al inicio
  config: GameConfig;

  curvature: CurvatureState;
  venomTrio: VenomTrioState | null;

  coinBank: {
    karma: number;
    dharma: number;
  };

  realmAscension: {
  player: PlayerId;
  realmStep: number;
  at: number;
} | null;

  // v4 — RFC Cosmic Clock (APLAZADO, ver docs/SAMSARAGAMMON_RFC_COSMIC_CLOCK_APLAZADO.md).
  // Estado mínimo para que un futuro componente puramente visual pueda saber
  // en qué Era narrativa está la partida, sin acoplarse al Karma Engine, al
  // Orquestador ni al Reducer. Nada además de este objeto debe agregarse
  // hasta que se decida retomar el RFC — nada de cronología, animaciones,
  // textos ni escalas de tiempo.
  cosmicClock: {
    era: ActorId;
    // Normalizado 0..1. Se deja siempre en 0 al no existir todavía la
    // cronología definitiva (ver RFC) — el futuro sistema visual la
    // calculará cuando el Canon quede estabilizado.
    progress: number;
    // Se incrementa solo cuando cambia `era`. Permite que la UI futura
    // detecte transiciones sin comparar objetos.
    transitionSequence: number;
  };

  // v5 — Acto 0 (Génesis de los animales). La partida empieza con solo
  // los Tres Venenos, sin Avatares, sin colores de reino, sin Mara
  // visible — puro tutorial jugado de verdad, no cosmético. Ver
  // Orchestrator.ts para la condición completa. Estos 4 flags son los
  // "eventos de novedad" mínimos del diseño del usuario (lanzar dados,
  // mover fichas, capturar, regresar de Mara) — cada uno se enciende una
  // sola vez, la primera vez que ocurre.
  genesisNovelty: {
    hasRolled: boolean;
    hasMoved: boolean;
    hasCaptured: boolean;
    hasMaraReturn: boolean;
  };

  // true una sola vez: ambos jugadores movieron los 3 Venenos, hubo
  // suficientes turnos y se cumplieron los 4 eventos de novedad. Dispara
  // el "Bruno despierta" — hasta entonces no existen Avatares, colores
  // de reino ni Mara visual, aunque el sistema ya los soporte por dentro.
  brunoRevealed: boolean;
};