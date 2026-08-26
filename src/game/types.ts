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

// v48 (13 agosto 2026) — a pedido de Federico: un unico tipo canonico
// compartido, para que ningun modulo (UI, Karma, movimiento, victoria)
// pueda volver a declarar su propia version de "que reinos existen".
// Es un alias intencional de RealmPieceKind, no un tipo nuevo — ambos
// preguntan lo mismo (que reino, de los 6) desde dos angulos distintos
// (identidad del Avatar vs ubicacion espacial de una ficha), asi que
// comparten una sola fuente de verdad en vez de mantenerse
// sincronizados a mano. "asura"/"deva" quedan como los IDs canonicos
// reales (son los que ya usa REALM_PIECE_ORDER y las claves de
// state.realmPieces[jugador] en todo el reducer/Orchestrator — cambiar
// esos nombres es un rename de la forma del GameState, no una
// normalizacion de vocabulario, y por eso no se toca aca). "Titans" y
// "SemiGods" quedan como nombres de PRESENTACION unicamente — ver
// CANONICAL_REALM_LABEL en src/UI/realm.ts.
export type CanonicalRealmId = RealmPieceKind;

// Orden canónico de las 6 fichas de reino (una por Avatar/era). Única
// fuente de verdad — reducer.ts y el módulo de victoria (src/game/victory)
// importan esta lista en vez de declararla cada uno por su cuenta.
export const REALM_PIECE_ORDER: RealmPieceKind[] = [
  "hungry_ghost",
  "hell",
  "animals",
  "humans",
  "asura",
  "deva",
];

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

// 2026-08-22: era Record<PlayerId, string> (demasiado ancho); tanto la
// acción SELECT_PIECE (piece: PieceKind) como el reset tras un
// movimiento ("pig", literal) siempre guardan un PieceKind real acá —
// se ajusta al tipo que de verdad tiene.
export type SelectedPieceState = Record<PlayerId, PieceKind>;
// v27 (11 agosto 2026) — decisión de diseño cerrada con Federico/Chat:
// en Fase 2 (desde Oriol), la selección de movimiento es un par
// AVATAR + VENENO acumulado en dos clics, no un valor único que se
// sobreescribe. selectedPiece sigue representando el Avatar elegido
// (igual que hoy); este campo nuevo guarda el Veneno elegido en el
// segundo clic — null cuando todavía no se eligió ninguno.
export type SelectedVenomState = Record<PlayerId, BasePieceKind | null>;

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

  // 2026-08-22: este campo declaraba el tipo "Realm" (mayúsculas —
  // HUNGRY_GHOST/HELL/ANIMALS/HUMANS/ASURA/DEVA/NIRVANA), pero es el
  // ÚNICO lugar en todo el código real que usa ese vocabulario — nada
  // lo produce de verdad (reducer.ts guardaba aquí el valor de
  // realmFromPos(), que es MuralZoneId — NARAKA/PRETA/... — tapado con
  // "as any"). El vocabulario que sí existe y se calcula de verdad en
  // cada posición es CanonicalRealmId (= RealmPieceKind, el mismo que
  // usa realmPieces[player][kind] en todo el resto del juego), vía
  // canonicalRealmFromPos(). Se retipa a ese, el real.
  fromRealm: CanonicalRealmId;
  toRealm: CanonicalRealmId;

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
  // v10 — reparación de identidad de etapa (10 agosto 2026): globalRollCount
  // que tenía la partida cuando el Avatar ACTUAL de este jugador apareció.
  // Permite calcular rollsInCurrentStage = globalRollCount - stageStartedAtRoll
  // en el Orquestador, para que una etapa no pueda heredar lances ya
  // acumulados por etapas anteriores (evita transiciones en cascada cuando
  // un Avatar tarda en aparecer). minTurns/minGlobalRolls sigue existiendo
  // como guardrail absoluto — esto es un guardrail relativo adicional.
  stageStartedAtRoll: number;
  // v58 (17 agosto 2026) — arreglo de fondo pedido por Federico: el
  // Orquestador (captureRateMin de rufus_to_whitman, sección 2 en
  // evaluateOrchestrator) usaba decisionSignature.capturesMade/totalMoves,
  // contadores de TODA la partida que nunca se resetean (los necesita el
  // Karma/Mirror Panel tal cual, ver getMirrorPatternReading.ts — no se
  // pueden tocar). Divididos entre turnsInStage (que SÍ se resetea junto
  // con completedLoopsInRealm en cada ascenso real), la tasa de captura
  // se volvía cada vez MÁS difícil de alcanzar cuanto más se jugaba sin
  // capturar — el sistema empeoraba con el tiempo en vez de reflejar lo
  // que pasó en la etapa actual. Estos dos campos son el par exclusivo
  // del Orquestador: se resetean a 0 en cada ascenso real (igual que
  // completedLoopsInRealm), no en el atajo DEV_SKIP_TO_RUFUS le
  // corresponde el mismo reseteo por tratarse de un "inicio de etapa".
  capturesInStage: number;
  movesInStage: number;
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
  // v27 — ver SelectedVenomState arriba.
  selectedVenom: SelectedVenomState;

  captures: Record<PlayerId, number>;

  realmProgress: Record<PlayerId, RealmProgress>;

  level: number;
  currentNidana: NidanaId | null;
  // v36 (12 agosto 2026) — turnIndex en el que se mostró la última
  // Nidana real, para el enfriamiento entre Nidanas (no dos pegadas
  // aunque dos eventos del Pattern Engine ocurran en turnos seguidos).
  lastNidanaAtTurn: number;
  activeNidanaEffect: "CLARITY" | "DISTORTION" | "TENSION" | null;

  // Paso 1 (26 agosto 2026) — Nidanas fisicas: aparicion y recoleccion
  // (separado del currentNidana/lastNidanaAtTurn narrativo de arriba,
  // que sigue funcionando igual, sin tocar). boardNidanas: por
  // posicion de casilla (0..trackSize-1), que Nidana esta ahi
  // esperando ser recogida, si alguna. avatarNidana: por jugador y
  // por Avatar (RealmPieceKind), que Nidana porta ese Avatar ahora
  // mismo, si alguna — un Avatar solo puede portar una a la vez
  // (regla 3 del paso 1).
  boardNidanas: Partial<Record<number, NidanaId>>;
  avatarNidana: Record<PlayerId, Partial<Record<RealmPieceKind, NidanaId>>>;

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
  // v10 — faltaba en el tipo (bug real: el reducer siempre lo asignó,
  // pero TypeScript nunca lo comprobó porque el tsc real del proyecto
  // no se estaba corriendo — ver commit de reparación de identidad de
  // etapa). App.tsx depende de este campo para decidir qué video/mural
  // mostrar; sin tipo, un error de este tipo pasa silencioso.
  realmKey: RealmPieceKind;
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
  genesisUIComplete: boolean; // true cuando el Genesis visual terminó (clic 8)

  // v49 — Venenos como impulsos (Rooster/Snake/Pig v0, RFC "physics not
  // powers" cerrado con Federico/Gemini/Chat). Marca transitoria: este
  // Avatar acaba de regresar de Mara y todavía no se ha movido desde
  // entonces. Mientras esté en true:
  //   - PIG: si tiene algún movimiento legal, el jugador está obligado a
  //     elegir ESE Avatar (ver getMoveOptionsForPlayer).
  // Se enciende en el reducer (case "ROLL", liberación de Avatares de
  // Mara) y se apaga en CONSCIOUS_MOVE en cuanto ese Avatar se mueve de
  // verdad (se haya movido por elección propia o porque Pig lo forzó —
  // el "susto" dura un solo Avatar-turno, no una vuelta completa).
  justReturnedFromMara: Record<PlayerId, Partial<Record<RealmPieceKind, boolean>>>;
};