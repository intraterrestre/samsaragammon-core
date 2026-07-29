// src/game/era.ts
// GENESIS INTRO — ERA SYSTEM
//
// v2: desbloquea las tres fichas base (pig, snake, rooster)
// La Era del Sistema de Eras se conectará con el Orquestador
// cuando esté implementado. Por ahora todas las fichas están activas.

import type { BasePieceKind } from "./types";

export type EraId = "ignorance" | "formations" | "consciousness";

export interface EraConfig {
  id: EraId;
  label: string;
  allowedBasePieces: BasePieceKind[];
}

export const ERAS: Record<EraId, EraConfig> = {
  ignorance: {
    id: "ignorance",
    label: "Ignorance — Bruno",
    // v2: solo cerdo en la era más primitiva (futuro — cuando Orquestador active)
    allowedBasePieces: ["pig"],
  },
  formations: {
    id: "formations",
    label: "Formations — Margot",
    allowedBasePieces: ["pig", "snake"],
  },
  consciousness: {
    id: "consciousness",
    label: "Consciousness — Oriol",
    // Desde Oriol: las tres fichas activas
    allowedBasePieces: ["pig", "snake", "rooster"],
  },
};

// v2: era actual = consciousness (las tres fichas activas)
// Cuando el Orquestador esté implementado, esto lo controlará dinámicamente
export const CURRENT_ERA: EraId = "consciousness";

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
