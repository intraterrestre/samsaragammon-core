// src/game/tutorial/lessons.ts
//
// PLAY WITH BUDDHA — lecciones de Buddha (30 septiembre 2026).
//
// Cada lección es UNA frase corta que Buddha dice la primera vez que la
// situación aparece de verdad en la partida. No hay un guion: en cada
// momento se elige la lección de mayor prioridad que (1) todavía no se
// vio en este dispositivo y (2) se cumple AHORA MISMO en el estado real.
// Si una lección esperaba turno y su situación ya pasó, simplemente no se
// muestra y queda para la próxima vez que ocurra.
//
// Todo son lecturas del GameState: ninguna lección cambia el juego.

import type { GameState, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { canonicalRealmFromPos } from "../../UI/realm";
import { REALM_AVATAR_NAME } from "../realmAvatarNames";
import { getAllLegalMoves, isPhase2 } from "../rules/legalMoves";
import { getPigForcedAvatar } from "../rules/getMoveOptionsForPlayer";
import type { MessageKey } from "../../i18n/en";

export type LessonId =
  | "noMove"
  | "threePoisons"
  | "sixRealms"
  | "brunoEra"
  | "oriol"
  | "mirror"
  | "nidanaCarry"
  | "nidanaSpawn"
  | "nidanaMirror"
  | "firstAvatar"
  | "evoClock"
  | "secondAvatar"
  | "phase2"
  | "whitman"
  | "sealed"
  | "unsealed"
  | "pig"
  | "mara"
  | "maraReturn"
  | "capture"
  | "nidanaCollect"
  | "block"
  | "threeAnimals"
  | "brunoWaiting"
  | "move"
  | "roll";

export type Lesson = {
  id: LessonId;
  // player = quien tiene el turno (hot-seat: la pantalla es de los dos).
  holds: (state: GameState, player: PlayerId) => boolean;
  // 3 oct 2026 (playtest de Federico): algunas lecciones se repiten para
  // que la idea se grabe. repeat = cuántas veces como máximo en este
  // dispositivo (por defecto 1).
  repeat?: number;
  // Para las que se repiten: identifica el ACONTECIMIENTO concreto
  // (p. ej. esta captura). La misma lección no vuelve a salir mientras
  // el acontecimiento sea el mismo.
  eventKey?: (state: GameState) => string;
  // Urgente: el momento dura poco (una línea roja, una captura). Puede
  // interrumpir una lección no urgente que esté en pantalla, en vez de
  // esperar a que termine y llegar tarde.
  urgent?: boolean;
  // Variables del texto ({missing}, etc.), ya traducidas.
  vars?: (state: GameState, player: PlayerId, t: (key: MessageKey) => string) => Record<string, string>;
};

// Cuántas veces se vio cada lección (por dispositivo).
export type SeenLessons = Map<LessonId, number>;

const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

// 3 oct 2026 — Federico: "salió Margot pero no hubo cartelito". Los
// nacimientos se miraban solo para el jugador con el turno; Margot nace
// en la jugada de un color y el turno pasa enseguida al otro, así que la
// lección esperaba (o se perdía). En hot-seat la pantalla es de los dos:
// basta con que le haya pasado a cualquiera.
const anyPlayer = (f: (pl: PlayerId) => boolean) => f("P1") || f("P2");

function inHumans(pos: number): boolean {
  return canonicalRealmFromPos(pos) === "humans";
}

function ownAvatars(state: GameState, player: PlayerId) {
  return REALM_PIECE_ORDER.map((kind) => ({
    kind,
    piece: state.realmPieces[player]?.[kind],
  })).filter(
    (a): a is { kind: RealmPieceKind; piece: NonNullable<typeof a.piece> } =>
      !!a.piece && a.piece.unlocked
  );
}

// ¿El rival tiene alguna casilla bloqueada (2+ piezas que cuentan para el
// bloqueo)? Mismo criterio que getMoveOptionsForPlayer: desde la Fase 2
// del RIVAL solo cuentan sus Avatares; antes, Venenos + Avatares.
function rivalHasBlock(state: GameState, player: PlayerId): boolean {
  const opp = other(player);
  const counts = new Map<number, number>();
  const add = (pos: number) => counts.set(pos, (counts.get(pos) ?? 0) + 1);
  if (!isPhase2(state, opp)) {
    for (const kind of ["pig", "snake", "rooster"] as const) {
      const p = state.pieces[opp][kind];
      if (!p.inLimbo) add(p.pos);
    }
  }
  for (const { piece } of ownAvatars(state, opp)) {
    if (!piece.inLimbo) add(piece.pos);
  }
  return [...counts.values()].some((n) => n >= 2);
}

const rolled = (state: GameState) => state.phase === "rolled";

const ERA_ORDER = ["bruno", "margot", "oriol", "marino", "rufus", "whitman"];
function oriolEntered(state: GameState): boolean {
  return ERA_ORDER.indexOf(state.cosmicClock.era as string) >= ERA_ORDER.indexOf("oriol");
}

// La última jugada capturó y la víctima está de verdad en Mara (si
// llevaba Nidana, el escudo la salvó y no fue a Mara).
function lastCaptureWentToMara(state: GameState): boolean {
  const m = state.lastMove;
  if (!m?.didCapture || !m.capturedPieceKind) return false;
  const rival = other(m.player);
  const kind = m.capturedPieceKind;
  const victim = (REALM_PIECE_ORDER as readonly string[]).includes(kind)
    ? state.realmPieces[rival]?.[kind as RealmPieceKind]
    : state.pieces[rival][kind as "pig" | "snake" | "rooster"];
  return !!victim?.inLimbo;
}

// Animales que cada jugador todavía no movió nunca (requisito de Bruno).
function missingAnimals(state: GameState): [PlayerId, ("pig" | "snake" | "rooster")[]][] {
  const out: [PlayerId, ("pig" | "snake" | "rooster")[]][] = [];
  for (const pl of ["P1", "P2"] as PlayerId[]) {
    const sig = state.decisionSignature?.[pl];
    if (!sig) continue;
    const ks: ("pig" | "snake" | "rooster")[] = [];
    if (sig.pigTrace === 0) ks.push("pig");
    if (sig.snakeTrace === 0) ks.push("snake");
    if (sig.roosterTrace === 0) ks.push("rooster");
    if (ks.length) out.push([pl, ks]);
  }
  return out;
}

function carriedNidanasKey(state: GameState): string {
  return (["P1", "P2"] as PlayerId[])
    .map((pl) =>
      Object.entries(state.avatarNidana[pl] ?? {})
        .filter(([, n]) => Boolean(n))
        .map(([k, n]) => `${pl}:${k}:${n}`)
        .sort()
        .join(",")
    )
    .join("|");
}

// Orden = prioridad. Los momentos de historia (nace un Avatar, Fase 2)
// van primero; lo básico (tirar, mover) va al final porque solo se
// cumple al principio de la partida de todos modos.
export const LESSONS: Lesson[] = [
  {
    id: "noMove",
    holds: (s, p) => rolled(s) && getAllLegalMoves(s, p).length === 0,
    urgent: true,
  },
  // 3 oct 2026, pedido de Federico: lo primero que oye un principiante
  // es qué son los tres animales, antes de tirar.
  {
    id: "threePoisons",
    holds: (s) => s.phase === "idle" && !s.brunoRevealed,
  },
  // 3 oct 2026, Federico: sin saber que el tablero se vuelve seis reinos,
  // "renace en cualquier sitio menos Humanos" no le dice nada al novato.
  {
    id: "sixRealms",
    holds: (s) => s.phase === "idle" && !s.brunoRevealed,
  },
  // ...y al llegar Bruno, cuánto tiempo pasó en esa introducción rápida.
  {
    id: "brunoEra",
    holds: (s) => s.brunoRevealed,
  },
  // 3 oct 2026 — semilla de Oriol (Curvismo sin nombrarlo): el
  // desacople entre el entorno recto y un cerebro que evolucionó en curvas.
  // Sale justo antes de EL ESPEJO SE ABRE.
  {
    id: "oriol",
    holds: (s) => oriolEntered(s),
  },
  // 3 oct 2026 — al entrar Oriol se abre el espejo del Buda azul.
  {
    id: "mirror",
    holds: (s) => oriolEntered(s),
  },
  // Una pieza acaba de ser capturada (esta jugada exacta). Se repite
  // 4 veces: "al comerte una ficha se va a Mara" tiene que grabarse.
  {
    id: "mara",
    holds: lastCaptureWentToMara,
    repeat: 4,
    urgent: true,
    eventKey: (s) => `${s.turnIndex}:${s.lastMove?.toPos}:${s.lastMove?.capturedPieceKind}`,
  },
  // Monedas de Nidana (la moneda grande que sale por las dos caras).
  // Antes de Bruno no aparecen en el modo principiante (ver App.tsx).
  {
    id: "nidanaCarry",
    holds: (s) => s.brunoRevealed && carriedNidanasKey(s) !== "|",
    repeat: 2,
    eventKey: carriedNidanasKey,
  },
  {
    id: "nidanaSpawn",
    holds: (s) => s.brunoRevealed && Object.keys(s.boardNidanas).length > 0,
    repeat: 2,
    eventKey: (s) => Object.keys(s.boardNidanas).sort().join(","),
  },
  {
    id: "nidanaMirror",
    holds: (s) =>
      oriolEntered(s) &&
      !!s.currentNidana &&
      s.turnIndex - s.lastNidanaAtTurn <= 1,
    repeat: 2,
    eventKey: (s) => String(s.lastNidanaAtTurn),
  },
  {
    id: "firstAvatar",
    holds: (s) => anyPlayer((pl) => !!s.realmPieces[pl]?.hungry_ghost?.unlocked),
  },
  // 4 oct 2026 — el Reloj de la Evolución aparece con Bruno; Buddha lo
  // señala con una flecha la primera vez (ver EvolutionClockIndicator).
  {
    id: "evoClock",
    holds: (s) => s.brunoRevealed,
  },
  {
    id: "secondAvatar",
    holds: (s) => anyPlayer((pl) => !!s.realmPieces[pl]?.hell?.unlocked),
  },
  {
    id: "phase2",
    // 3 oct 2026 — Federico: "MUEVE A BRUNO". Desde la Fase 2 un Avatar
    // se mueve en dos toques (Avatar → animal). Sale cuando Bruno puede
    // moverse de verdad, para que el cartel nunca nombre algo imposible.
    holds: (s, p) =>
      rolled(s) &&
      isPhase2(s, p) &&
      getAllLegalMoves(s, p).some((m) => m.avatar === "hungry_ghost"),
  },
  {
    id: "whitman",
    holds: (s) => anyPlayer((pl) => !!s.realmPieces[pl]?.deva?.unlocked),
  },
  {
    id: "sealed",
    // 3 oct 2026 — Federico + ChatGPT: en la interfaz "sello" pasa a ser
    // el LOTO 🪷 (internamente sigue siendo consolidatedAvatars).
    holds: (s) =>
      anyPlayer((pl) => Object.values(s.consolidatedAvatars[pl] ?? {}).some(Boolean)),
    vars: (s) => {
      for (const pl of ["P1", "P2"] as PlayerId[]) {
        for (const kind of REALM_PIECE_ORDER) {
          if (s.consolidatedAvatars[pl]?.[kind]) return { name: REALM_AVATAR_NAME[kind] };
        }
      }
      return { name: "" };
    },
  },
  {
    id: "unsealed",
    holds: (s, p) =>
      ownAvatars(s, p).some(
        ({ kind, piece }) =>
          !piece.inLimbo &&
          inHumans(piece.pos) &&
          piece.everCaptured &&
          !s.consolidatedAvatars[p]?.[kind]
      ),
  },
  {
    id: "pig",
    holds: (s, p) => rolled(s) && getPigForcedAvatar(s, p) !== null,
    urgent: true,
  },
  {
    id: "maraReturn",
    holds: (s) => s.genesisNovelty.hasMaraReturn,
  },
  {
    id: "capture",
    holds: (s, p) =>
      rolled(s) &&
      getAllLegalMoves(s, p).some((m) => m.option.meaning === "IMPACT"),
    repeat: 3,
    urgent: true,
    eventKey: (s) => String(s.turnIndex),
  },
  {
    id: "nidanaCollect",
    holds: (s, p) =>
      rolled(s) &&
      getAllLegalMoves(s, p).some(
        (m) =>
          m.avatar !== null &&
          !s.avatarNidana[p]?.[m.avatar] &&
          !!s.boardNidanas[m.option.toPos] &&
          canonicalRealmFromPos(m.option.toPos) === m.avatar
      ),
  },
  {
    id: "block",
    holds: (s, p) => rolled(s) && rivalHasBlock(s, p),
  },
  {
    id: "threeAnimals",
    holds: (s, p) => {
      if (!rolled(s) || isPhase2(s, p) || s.brunoRevealed) return false;
      const sig = s.decisionSignature[p];
      return (
        sig.totalMoves >= 3 &&
        (sig.pigTrace === 0 || sig.snakeTrace === 0 || sig.roosterTrace === 0)
      );
    },
  },
  // 3 oct 2026 — Federico: "llevo muchísimo tiempo jugando y no llega
  // Bruno". Bruno solo despierta cuando LOS DOS jugadores movieron sus
  // tres animales (Orchestrator.evaluateGenesisToBruno); si uno nunca
  // usa la Serpiente, Bruno no llega nunca. Buddha dice qué falta.
  {
    id: "brunoWaiting",
    holds: (s) =>
      !s.brunoRevealed &&
      s.globalRollCount >= 6 &&
      missingAnimals(s).length > 0,
    repeat: 4,
    eventKey: (s) => missingAnimals(s).map(([pl, ks]) => pl + ks.join("")).join("|"),
    vars: (s, _p, t) => ({
      missing: missingAnimals(s)
        .map(([pl, ks]) => `${t(`color.${pl}` as MessageKey)}: ${ks.map((k) => t(`venom.${k}` as MessageKey)).join(", ")}`)
        .join(" · "),
    }),
  },
  {
    id: "move",
    holds: (s, p) => rolled(s) && getAllLegalMoves(s, p).length > 0,
  },
  {
    id: "roll",
    holds: (s) => s.phase === "idle",
  },
];

// Texto de cada lección: clave "lesson.<id>" en src/i18n (en.ts, es.ts).
export function lessonKey(id: LessonId): MessageKey {
  return `lesson.${id}` as MessageKey;
}

// Primera lección de la lista que todavía puede salir y se cumple ahora.
// seen: veces que ya salió cada una. lastKeys: el último acontecimiento
// por el que salió cada lección repetible.
export function pickLesson(
  state: GameState,
  player: PlayerId,
  seen: ReadonlyMap<LessonId, number> | ReadonlySet<LessonId>,
  lastKeys: ReadonlyMap<LessonId, string> = new Map(),
  onlyUrgent = false
): Lesson | null {
  if (state.winner) return null;
  const times = (id: LessonId) =>
    seen instanceof Map ? seen.get(id) ?? 0 : (seen as ReadonlySet<LessonId>).has(id) ? 1 : 0;
  for (const lesson of LESSONS) {
    if (onlyUrgent && !lesson.urgent) continue;
    if (times(lesson.id) >= (lesson.repeat ?? 1)) continue;
    if (!lesson.holds(state, player)) continue;
    if (lesson.eventKey && lastKeys.get(lesson.id) === lesson.eventKey(state)) continue;
    return lesson;
  }
  return null;
}

// ----- tutorialSeen, por dispositivo (localStorage) -----
// Fuera de GameState a propósito: no se sincroniza a Supabase ni se
// borra con RESET. Envuelto en try/catch: en modo privado o con el
// almacenamiento bloqueado, simplemente no se recuerda entre partidas.

const SEEN_KEY = "samsara_tutorial_seen_v1";

// Formato actual: { "<id>": veces }. Formato viejo (30 sept): [ids].
export function loadSeenLessons(): SeenLessons {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (Array.isArray(parsed)) {
      return new Map((parsed as LessonId[]).map((id) => [id, 1]));
    }
    if (parsed && typeof parsed === "object") {
      return new Map(
        Object.entries(parsed as Record<string, unknown>)
          .filter(([, n]) => typeof n === "number")
          .map(([id, n]) => [id as LessonId, n as number])
      );
    }
    return new Map();
  } catch {
    return new Map();
  }
}

export function saveSeenLessons(seen: ReadonlyMap<LessonId, number>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(Object.fromEntries(seen)));
  } catch {
    // sin almacenamiento: nada que hacer
  }
}

export function resetSeenLessons(): void {
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch {
    // sin almacenamiento: nada que hacer
  }
}
