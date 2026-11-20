// src/game/rules/nidanaLink.ts — 20 nov 2026, regla aprobada por Federico.
//
// ENLACE DE NIDANAS: un jugador tiene un enlace mientras sus Avatares
// llevan dos Nidanas de números seguidos (3 y 4, por ejemplo). Se calcula
// SIEMPRE a partir de las Nidanas que posee ahora mismo: no hay registro
// histórico ni botón. Si pierde una, el enlace desaparece; si recupera el
// par, vuelve a existir.
//
// Efecto (único): cuando capturan a uno de sus Avatares, si en ESE
// instante tiene un enlace, el Avatar pasa MARA_LINK_ROLLS lances en Mara
// en vez de 6. La espera queda fijada en la captura (ver reducer.ts).
// Los Venenos no cambian.
import { NIDANA_LIST, type NidanaId } from "../nidanas";
import type { RealmPieceKind } from "../types";

export const MARA_ROLLS = 6;
export const MARA_LINK_ROLLS = 3;

type Carried = Partial<Record<RealmPieceKind, NidanaId | null | undefined>>;

export const nidanaNumber = (id: NidanaId): number => NIDANA_LIST.indexOf(id) + 1;

/** Números bajos de cada enlace que forman las Nidanas que se llevan (3 = enlace 3–4). */
export function nidanaLinkLows(carried: Carried | undefined): number[] {
  const nums = new Set<number>();
  for (const id of Object.values(carried ?? {})) if (id) nums.add(nidanaNumber(id));
  const lows: number[] = [];
  for (let n = 1; n <= 11; n++) if (nums.has(n) && nums.has(n + 1)) lows.push(n);
  return lows;
}

export function hasNidanaLink(carried: Carried | undefined): boolean {
  return nidanaLinkLows(carried).length > 0;
}

// ---------------------------------------------------------------------------
// 20 nov 2026 — "¿Me conviene?" (Fandango). Consecuencias de un trato de
// Nidanas para los dos jugadores, calculadas con lo que lleva cada uno.
// Un trato es 1x1 y cada Avatar se queda donde está: solo cambia qué Nidana
// lleva. Por eso lo único que puede cambiar son los enlaces.
// No recomienda nada: describe.

export type TradeEffects = {
  /** Enlaces (número bajo) que gana / pierde quien ENTREGA `give` y RECIBE `receive`. */
  myGain: number[];
  myLoss: number[];
  /** Lo mismo, para el otro jugador. */
  rivalGain: number[];
  rivalLoss: number[];
};

function swapped(carried: Carried, out: NidanaId, inn: NidanaId): Carried {
  const next: Carried = { ...carried };
  for (const k of Object.keys(next) as RealmPieceKind[]) {
    if (next[k] === out) next[k] = inn;
  }
  return next;
}

export function analyzeTrade(
  mine: Carried | undefined,
  theirs: Carried | undefined,
  give: NidanaId,
  receive: NidanaId
): TradeEffects {
  const meBefore = new Set(nidanaLinkLows(mine));
  const themBefore = new Set(nidanaLinkLows(theirs));
  const meAfter = new Set(nidanaLinkLows(swapped(mine ?? {}, give, receive)));
  const themAfter = new Set(nidanaLinkLows(swapped(theirs ?? {}, receive, give)));
  return {
    myGain: [...meAfter].filter((l) => !meBefore.has(l)),
    myLoss: [...meBefore].filter((l) => !meAfter.has(l)),
    rivalGain: [...themAfter].filter((l) => !themBefore.has(l)),
    rivalLoss: [...themBefore].filter((l) => !themAfter.has(l)),
  };
}

export const linkLabel = (low: number) => `${low}–${low + 1}`;
