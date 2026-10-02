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
import { getAllLegalMoves, isPhase2 } from "../rules/legalMoves";
import { getPigForcedAvatar } from "../rules/getMoveOptionsForPlayer";
import type { MessageKey } from "../../i18n/en";

export type LessonId =
  | "noMove"
  | "firstAvatar"
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
  | "move"
  | "roll";

export type Lesson = {
  id: LessonId;
  // player = quien tiene el turno (hot-seat: la pantalla es de los dos).
  holds: (state: GameState, player: PlayerId) => boolean;
};

const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

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

// Orden = prioridad. Los momentos de historia (nace un Avatar, Fase 2)
// van primero; lo básico (tirar, mover) va al final porque solo se
// cumple al principio de la partida de todos modos.
export const LESSONS: Lesson[] = [
  {
    id: "noMove",
    holds: (s, p) => rolled(s) && getAllLegalMoves(s, p).length === 0,
  },
  {
    id: "firstAvatar",
    holds: (s, p) => !!s.realmPieces[p]?.hungry_ghost?.unlocked,
  },
  {
    id: "secondAvatar",
    holds: (s, p) => !!s.realmPieces[p]?.hell?.unlocked,
  },
  {
    id: "phase2",
    holds: (s, p) => rolled(s) && isPhase2(s, p),
  },
  {
    id: "whitman",
    holds: (s, p) => !!s.realmPieces[p]?.deva?.unlocked,
  },
  {
    id: "sealed",
    holds: (s, p) =>
      Object.values(s.consolidatedAvatars[p] ?? {}).some(Boolean),
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
  },
  {
    id: "mara",
    holds: (s) =>
      (["P1", "P2"] as PlayerId[]).some(
        (pl) =>
          (["pig", "snake", "rooster"] as const).some(
            (k) => s.pieces[pl][k].inLimbo
          ) || ownAvatars(s, pl).some(({ piece }) => piece.inLimbo)
      ),
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

// Primera lección de la lista que no se vio y se cumple ahora.
export function pickLesson(
  state: GameState,
  player: PlayerId,
  seen: ReadonlySet<LessonId>
): Lesson | null {
  if (state.winner) return null;
  for (const lesson of LESSONS) {
    if (seen.has(lesson.id)) continue;
    if (lesson.holds(state, player)) return lesson;
  }
  return null;
}

// ----- tutorialSeen, por dispositivo (localStorage) -----
// Fuera de GameState a propósito: no se sincroniza a Supabase ni se
// borra con RESET. Envuelto en try/catch: en modo privado o con el
// almacenamiento bloqueado, simplemente no se recuerda entre partidas.

const SEEN_KEY = "samsara_tutorial_seen_v1";

export function loadSeenLessons(): Set<LessonId> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? (parsed as LessonId[]) : []);
  } catch {
    return new Set();
  }
}

export function saveSeenLessons(seen: ReadonlySet<LessonId>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
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
