// src/game/historicalClock.ts
//
// v59 (20 agosto 2026) — Historical Time Counter, a pedido de Federico.
// Capa de PRESENTACIÓN únicamente: los años acumulados que siguen no
// existen en ningún lado del código (confirmado con grep en todo el
// repo antes de este archivo — no había ningún valor numérico de años,
// solo nombres de era en REALM_CANON). Son valores canónicos que
// Federico cerró explícitamente para el contador, no fechas BCE/CE:
// representan AÑOS ACUMULADOS DRAMATIZADOS desde que aparece Bruno,
// no una cronología arqueológica real. REALM_CANON sigue siendo la
// ÚNICA fuente de verdad para Avatar/Realm/Era/color — este archivo
// solo le agrega el valor temporal de presentación a cada checkpoint,
// nunca redeclara el orden ni los nombres de era.
import { REALM_CANON } from "./realm/realmCanon";

export type AvatarId =
  | "bruno"
  | "margot"
  | "oriol"
  | "marino"
  | "rufus"
  | "whitman";

// Mismo orden que ERA_ORDER (GameShell.tsx) y REALM_PIECE_ORDER
// (game/types.ts) — los tres describen la misma secuencia de 6 desde
// ángulos distintos (era activa / ficha de reino / checkpoint
// histórico). AVATAR_ORDER[i] corresponde a REALM_CANON[i] (step i+1).
export const AVATAR_ORDER: AvatarId[] = [
  "bruno",
  "margot",
  "oriol",
  "marino",
  "rufus",
  "whitman",
];

// Años acumulados en el momento en que CADA avatar aparece (no lo que
// dura su propia era — el valor ya incluye todo lo recorrido antes).
export const HISTORICAL_CHECKPOINTS: Record<AvatarId, number> = {
  bruno: 0,
  margot: 2_500_000,
  oriol: 2_510_000,
  marino: 2_513_000,
  rufus: 2_516_500,
  whitman: 2_516_800,
};

// Checkpoint final, posterior a Whitman — no corresponde a ningún
// avatar/evento adicional del juego (Whitman es el último de los 6).
// Ver nota en HistoricalTimeCounter.tsx sobre cómo se dispara esta
// transición sin un evento canónico propio.
export const PRESENT_COUNTER = 2_517_100;
export const PRESENT_LABEL = "THE PRESENT";

// A partir de qué avatar (índice en AVATAR_ORDER) se activa el
// tratamiento visual intensificado (glow de color de era + cambios de
// color en cada checkpoint). Originalmente arrancaba en Oriol —pedido
// explícito de Federico de dejar Bruno/Margot en el rojo LED clásico—
// pero el 24 de agosto pidió lo contrario: que TODOS los avatares
// tengan su color (incluidos Bruno en negro y Margot en morado, los
// mismos de REALM_CANON), "eso también ayuda en la comunicación de la
// idea". Se arranca desde Bruno (índice 0) — ya no hay tramo "sobrio".
export const INTENSIFIED_FROM_AVATAR: AvatarId = "bruno";
export const INTENSIFIED_FROM_INDEX = AVATAR_ORDER.indexOf(
  INTENSIFIED_FROM_AVATAR
);

// Color LED antes del primer lance (todavía no hay ningún avatar
// activo) — ya no se usa para Bruno/Margot (ver arriba), solo como
// valor inicial de React.useState en HistoricalTimeCounter.tsx.
export const BASE_LED_COLOR = "#ff2b2b";

export type HistoricalCheckpointEntry = {
  avatar: AvatarId;
  counter: number;
  eraName: string;
  color: string;
  intensified: boolean;
};

// Une AVATAR_ORDER + HISTORICAL_CHECKPOINTS + REALM_CANON en una sola
// lista ordenada, sin redeclarar nombres de era ni colores — los lee
// de REALM_CANON (única fuente de verdad, pedido explícito de
// Federico: "Claude debería leer esos colores de REALM_CANON, no
// volver a hardcodearlos en el contador").
export const HISTORICAL_TIMELINE: HistoricalCheckpointEntry[] =
  AVATAR_ORDER.map((avatar, i) => {
    const canon = REALM_CANON[i]; // step i+1, mismo índice que AVATAR_ORDER
    return {
      avatar,
      counter: HISTORICAL_CHECKPOINTS[avatar],
      eraName: canon?.era ?? "",
      color: i >= INTENSIFIED_FROM_INDEX ? (canon?.hex ?? BASE_LED_COLOR) : BASE_LED_COLOR,
      intensified: i >= INTENSIFIED_FROM_INDEX,
    };
  });

export function getCheckpointByAvatar(
  avatar: AvatarId
): HistoricalCheckpointEntry | undefined {
  return HISTORICAL_TIMELINE.find((c) => c.avatar === avatar);
}

export function getCheckpointIndex(avatar: AvatarId | null): number {
  if (!avatar) return -1;
  return AVATAR_ORDER.indexOf(avatar);
}
