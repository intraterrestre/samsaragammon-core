// src/game/Karma/getOracleReading.ts
import { getMasterMessage } from "./getMasterMessage";
import type { LastMove } from "../types";
import type { KarmaBreakdown } from "../engine/computeKarmaTurn";

// Fase 2B — Buda Azul (7 septiembre 2026), pedido de Federico: función
// canónica y ÚNICA para producir la lectura del Oracle. La usan tanto
// el Oracle global (getGameDerivedState.ts, memoria global lastMove/
// lastKarma) como el Oracle personal del Buda (GameShell.tsx, memoria
// por jugador lastMoveByPlayer/lastKarmaByPlayer) — una sola definición,
// dos consumidores, para que nunca puedan divergir.
//
// Auditoría previa a esta fase (ver conversación): getMasterMessage
// SIEMPRE devuelve texto no vacío en sus cuatro ramas, así que el
// fallback (karmaOracle/masterOracleLine) que hoy existe en
// getGameDerivedState.ts es código muerto garantizado, no solo
// empíricamente. A propósito NO se incorpora ese fallback acá: esta
// función encapsula únicamente la lectura que realmente se produce hoy.
//
// Si no hay memoria (lastMove null — el jugador todavía no movió, o
// todavía no tiene memoria PERSONAL propia), no hay nada real que
// decir: se devuelve null explícito, nunca un texto fabricado. Probado
// en la auditoría: getMasterMessage(null, "", 0) NO explota ni devuelve
// vacío — devuelve "You remained within your path.", una lectura falsa
// para quien nunca jugó. El chequeo de acá evita que eso llegue a
// pantalla.
export function getOracleReading(
  lastMove: LastMove | null,
  lastKarma: KarmaBreakdown | null
): string | null {
  if (!lastMove) return null;

  return getMasterMessage(
    lastMove.capturedPieceKind,
    lastMove.meaning,
    lastKarma?.pattern ?? 0
  );
}
