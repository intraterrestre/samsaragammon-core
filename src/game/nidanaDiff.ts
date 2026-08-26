// src/game/nidanaDiff.ts
// Paso 1 (26 agosto 2026) — Nidanas fisicas. Logica pura (sin React,
// sin imports de Vite) para detectar "did something new just happen"
// entre dos snapshots consecutivos de GameState, para que App.tsx
// pueda disparar la misma moneda grande (triggerNidanaCoin) que ya
// existia para el sistema narrativo. Extraido a su propio modulo por
// el mismo motivo que stacking.ts (ver Board.tsx): poder probarla
// directo con tsx sin arrastrar los imports de assets/import.meta.glob
// de App.tsx.
import { REALM_PIECE_ORDER } from "./types";
import type { GameState } from "./types";
import type { NidanaId } from "./nidanas";

// ¿Aparecio una Nidana fisica NUEVA en el tablero? (una casilla que
// ahora tiene una Nidana y antes no tenia esa misma — nace, o cambio
// por el caso limite de reemplazo documentado en reducer.ts). Si hay
// mas de una casilla nueva a la vez (no deberia pasar en una sola
// jugada con el diseño actual), devuelve la primera que encuentra.
export function findNewlySpawnedNidana(
  prev: GameState["boardNidanas"],
  current: GameState["boardNidanas"]
): NidanaId | undefined {
  for (const [posKey, nidanaId] of Object.entries(current)) {
    if (nidanaId && prev[Number(posKey)] !== nidanaId) return nidanaId;
  }
  return undefined;
}

// ¿Un Avatar recogio una Nidana nueva? (paso de "no porta ninguna/otra"
// a portar una real). Mismo criterio de "primera que encuentra" que
// findNewlySpawnedNidana.
export function findNewlyCarriedNidana(
  prev: GameState["avatarNidana"],
  current: GameState["avatarNidana"]
): NidanaId | undefined {
  for (const player of ["P1", "P2"] as const) {
    for (const kind of REALM_PIECE_ORDER) {
      const before = prev[player]?.[kind];
      const now = current[player]?.[kind];
      if (now && now !== before) return now;
    }
  }
  return undefined;
}
