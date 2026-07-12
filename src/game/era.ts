// src/game/era.ts
//
// GENESIS INTRO — ERA SYSTEM (sprint scaffold)
//
// Samsara Gammon tells the story of human evolution. Each major era of that
// story unlocks its own cast of base pieces, its own dice family, and
// eventually its own sounds and board dressing. This module is the single
// source of truth for "what is unlocked right now."
//
// This sprint only implements Era 1 — Ignorance (Palaeolithic). Snake and
// Rooster, and every era after this one, stay fully coded but dormant until
// a future sprint wires real unlock conditions (character awakenings, realm
// progress, etc.) into CURRENT_ERA below.
//
// Nothing here deletes or rewrites the existing piece/dice code — it only
// gates what's currently active.

import type { BasePieceKind } from "./types";

export type EraId = "ignorance";
// Future eras will extend this union, e.g.:
// export type EraId = "ignorance" | "formations" | "consciousness" | ...;

export interface EraConfig {
  id: EraId;
  label: string;
  /** Base pieces (pig/snake/rooster) visible + selectable during this era. */
  allowedBasePieces: BasePieceKind[];
}

export const ERAS: Record<EraId, EraConfig> = {
  ignorance: {
    id: "ignorance",
    label: "Ignorance",
    allowedBasePieces: ["pig"],
  },
};

/**
 * The era currently active for the whole game.
 * Hardcoded to "ignorance" for this sprint — every game now starts (and, for
 * now, stays) in Era 1. Wiring this to real progression is future work.
 */
export const CURRENT_ERA: EraId = "ignorance";

export function getActiveEraConfig(era: EraId = CURRENT_ERA): EraConfig {
  return ERAS[era];
}

export function isBasePieceUnlocked(
  kind: BasePieceKind,
  era: EraId = CURRENT_ERA
): boolean {
  return ERAS[era].allowedBasePieces.includes(kind);
}

export function getUnlockedBasePieces(
  all: BasePieceKind[],
  era: EraId = CURRENT_ERA
): BasePieceKind[] {
  return all.filter((kind) => isBasePieceUnlocked(kind, era));
}
