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
