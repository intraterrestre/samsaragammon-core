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

import { humansRevealed } from "../rules/humansReveal";
import type { GameState, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { canonicalRealmFromPos } from "../../UI/realm";
import { REALM_AVATAR_NAME } from "../realmAvatarNames";
import { getAllLegalMoves, isPhase2 } from "../rules/legalMoves";
import { getPigForcedAvatar } from "../rules/getMoveOptionsForPlayer";
import type { MessageKey } from "../../i18n/en";
import { fandangoIsCalling } from "../../fandango/nidanaLinks";

export type LessonId =
  | "noMove"
  | "fandango"
  | "maraClue"
  | "maraName"
  | "maraHolds"
  | "rebirth"
  | "maraRepeat"
  // No es una lección del globo: marca el recorrido de Fandango ya hecho
  // (vive en el mismo contador, así se reinicia con cada partida).
  | "fandangoTour"
  // Ceremonia del Buddha DJ ya hecha (completa / versión corta).
  | "djFull"
  | "djRival"
  // Primera entrada a THE BIG HEAD SCHOOL™ ya hecha.
  | "bigHeadIntro"
  | "mirrorTouch"
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
  | "rivalAvatar"
  | "phase2"
  | "optionsPanel"
  | "howToMove"
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
  // 6 oct 2026 — solo puede salir cuando la lección indicada ya salió
  // (la presentación de Mara es una secuencia).
  after?: LessonId;
  // No la interrumpe ninguna lección urgente (AHORA CONOCES A MARA →
  // MARA TE ATRAPA es una sola revelación, sin nada en medio).
  steady?: boolean;
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
// El mural ya está en la etapa de ese Avatar (o más allá).
function muralAtLeast(state: GameState, era: string): boolean {
  if (state.cosmicClock.transitionSequence === 0) return false;
  return ERA_ORDER.indexOf(state.cosmicClock.era as string) >= ERA_ORDER.indexOf(era);
}

// Algún Avatar acaba de renacer y todavía no se movió.
function someoneJustReborn(state: GameState): boolean {
  return anyPlayer((pl) => Object.values(state.justReturnedFromMara?.[pl] ?? {}).some(Boolean));
}

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

// Avatares (menos Bruno, que nace para los dos a la vez) que ya tienen
// los DOS jugadores, en orden de aparición.
function sharedAvatars(state: GameState): RealmPieceKind[] {
  return REALM_PIECE_ORDER.filter(
    (kind) =>
      kind !== "hungry_ghost" &&
      !!state.realmPieces.P1?.[kind]?.unlocked &&
      !!state.realmPieces.P2?.[kind]?.unlocked
  );
}

// Avatar que con la ÚLTIMA jugada entró en Humanos habiendo sido
// capturado alguna vez (y sigue sin loto). null si no es el caso.
// Margot es la única Avatar femenina (para "capturado/capturada").
const FEMININE_AVATARS: ReadonlySet<RealmPieceKind> = new Set<RealmPieceKind>(["hell"]);

function unsealedArrival(state: GameState): RealmPieceKind | null {
  const m = state.lastMove;
  if (!m || !(REALM_PIECE_ORDER as readonly string[]).includes(m.pieceKind)) return null;
  const kind = m.pieceKind as RealmPieceKind;
  const piece = state.realmPieces[m.player]?.[kind];
  if (!piece || piece.inLimbo || piece.pos !== m.toPos || !inHumans(m.toPos)) return null;
  if (!piece.everCaptured || state.consolidatedAvatars[m.player]?.[kind]) return null;
  // 6 oct 2026 — de lotos no se habla hasta que Humanos se destapa.
  if (!humansRevealed(state)) return null;
  return kind;
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
  // 4 oct 2026 — primera vez que suena el spray de Fandango ("PSSSS…
  // PSSSS…"): se enseña la asociación sonido → Fandango → alguien te
  // propone algo. A partir de la segunda vez, solo el sonido.
  // ===== MARA (6 oct 2026, Federico + ChatGPT) =====================
  // EXPERIENCIA → MISTERIO → REVELACIÓN → NOMBRE → SIGNIFICADO.
  // Hasta Whitman ningún texto de JUEGA CON BUDDHA dice "Mara": las
  // capturas se explican como "sale del Samsara 6 lances y renace".
  // Margot destapa el primer par de ojos extraños → pista sin nombre.
  // Whitman destapa el último → AHORA CONOCES A MARA + MARA TE ATRAPA
  // (dos tarjetas seguidas: MARA TE ATRAPA va primera en la lista para
  // salir justo después, y AHORA CONOCES A MARA no se interrumpe).
  // Luego: primer renacimiento → EL RENACIMIENTO (excepto Humanos);
  // primera captura después → MARA NO NECESITA DETENERTE.
  {
    id: "maraHolds",
    holds: (s) => muralAtLeast(s, "whitman"),
    after: "maraName",
    steady: true,
  },
  {
    id: "maraRepeat",
    holds: lastCaptureWentToMara,
    after: "rebirth",
    urgent: true,
  },
  {
    id: "fandango",
    holds: (s, p) => fandangoIsCalling(s, p),
    urgent: true,
  },
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
  // 6 oct 2026 — segunda tarjeta del Espejo, justo después: dónde se
  // toca (el Buddha Azul pulsa mientras está en pantalla).
  {
    id: "mirrorTouch",
    holds: (s) => oriolEntered(s),
    after: "mirror",
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
  // 4 oct 2026 — Federico: cuando el SEGUNDO jugador consigue un Avatar
  // que el otro ya tenía, no hay video (solo aplausos y risas) y no se
  // entiende qué pasó. Buddha da la bienvenida al Avatar del adversario.
  // Justo después de MARGOT HA LLEGADO: el mural acaba de destapar el
  // primer par de ojos que no es humano.
  {
    id: "maraClue",
    holds: (s) => muralAtLeast(s, "margot"),
  },
  {
    id: "rivalAvatar",
    holds: (s) => sharedAvatars(s).length > 0,
    repeat: 6,
    eventKey: (s) => sharedAvatars(s).join(","),
    vars: (s, _p, t) => {
      const shared = sharedAvatars(s);
      const kind = shared[shared.length - 1];
      // El que lo consiguió después es quien empezó su etapa más tarde.
      const second: PlayerId =
        (s.realmProgress.P2.stageStartedAtRoll ?? 0) >=
        (s.realmProgress.P1.stageStartedAtRoll ?? 0)
          ? "P2"
          : "P1";
      return {
        name: kind ? REALM_AVATAR_NAME[kind] : "",
        color: t(`color.${second}` as MessageKey),
        // 7 oct 2026 — Federico: "¡BIENVENIDA, MARGOT!" (femenino).
        welcome: t(kind && FEMININE_AVATARS.has(kind) ? "lesson.welcomeF" : "lesson.welcomeM"),
      };
    },
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
  // 4 oct 2026 — Federico: en Fase 2, arriba a la izquierda salen
  // botones con las casillas posibles; nadie sabía que se pueden pulsar.
  // Sale cuando el panel está en pantalla (Avatar y animal elegidos).
  {
    id: "optionsPanel",
    holds: (s, p) =>
      rolled(s) &&
      isPhase2(s, p) &&
      !!s.selectedPiece[p] &&
      !!s.selectedVenom?.[p] &&
      getAllLegalMoves(s, p).length > 0,
    urgent: true,
    // El Avatar que el jugador tiene elegido (normalmente Bruno).
    vars: (s, p) => {
      const kind = s.selectedPiece[p] as RealmPieceKind | null;
      return { name: kind && REALM_AVATAR_NAME[kind] ? REALM_AVATAR_NAME[kind] : "Bruno" };
    },
  },
  // 4 oct 2026 — Federico: recordatorio que se repite en Fase 2 (hasta
  // 3 veces, como mucho cada 6 turnos), cuando el jugador todavía no ha
  // elegido Avatar en esta tirada.
  {
    id: "howToMove",
    holds: (s, p) =>
      rolled(s) &&
      isPhase2(s, p) &&
      !s.selectedPiece[p] &&
      getAllLegalMoves(s, p).length > 0,
    repeat: 3,
    eventKey: (s) => String(Math.floor((s.turnIndex ?? 0) / 6)),
  },
  {
    id: "whitman",
    holds: (s) => anyPlayer((pl) => !!s.realmPieces[pl]?.deva?.unlocked),
  },
  {
    id: "maraName",
    holds: (s) => muralAtLeast(s, "whitman"),
    after: "whitman",
    steady: true,
  },
  {
    id: "rebirth",
    holds: someoneJustReborn,
    after: "maraHolds",
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
    // 4 oct 2026 — Federico no entendió el cartel: no decía de QUÉ Avatar
    // hablaba y podía referirse a uno que estaba en Humanos desde hacía
    // rato. Ahora sale justo cuando un Avatar ya capturado alguna vez
    // ENTRA en Humanos con esta jugada, y lo nombra.
    holds: (s) => unsealedArrival(s) !== null,
    repeat: 2,
    eventKey: (s) => `${s.turnIndex}:${unsealedArrival(s) ?? ""}`,
    vars: (s, _p, t) => {
      const kind = unsealedArrival(s);
      return {
        name: kind ? REALM_AVATAR_NAME[kind] : "",
        captured: t(kind && FEMININE_AVATARS.has(kind) ? "lesson.capturedF" : "lesson.capturedM"),
      };
    },
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
    if (lesson.after && times(lesson.after) === 0) continue;
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
