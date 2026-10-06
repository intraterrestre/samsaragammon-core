// src/game/Karma/oracleKeys.ts
//
// 6 oct 2026 — Federico + ChatGPT: el Oracle (lo que acabas de hacer)
// y el Mirror (lo que el Espejo empieza a ver) los dice el Buddha Azul
// como pistas, no como informe. Misma lógica de lectura que
// getMasterMessage (que sigue intacto), pero devuelve claves de
// traducción; además la captura de un Avatar tiene su propia frase.
// Solo LEE el estado: no cambia nada del juego.

import type { LastMove } from "../types";
import type { KarmaBreakdown } from "../engine/computeKarmaTurn";
import type { MessageKey } from "../../i18n/en";

export type OracleKeys = { main: MessageKey; tail: MessageKey | null };

export function getOracleKeys(
  lastMove: LastMove | null,
  lastKarma: KarmaBreakdown | null
): OracleKeys | null {
  if (!lastMove) return null;
  const captured = lastMove.capturedPieceKind;
  if (captured === "pig" || captured === "snake" || captured === "rooster") {
    return { main: `oracle.${captured}` as MessageKey, tail: null };
  }
  const main: MessageKey = captured
    ? "oracle.avatar"
    : lastMove.meaning === "IMPACT"
      ? "oracle.impact"
      : lastMove.meaning === "RISK"
        ? "oracle.risk"
        : "oracle.safe";
  const pattern = lastKarma?.pattern ?? 0;
  const tail: MessageKey | null =
    pattern < 0 ? "oracle.repeat" : pattern > 1 ? "oracle.balance" : null;
  return { main, tail };
}

const MIRROR_PATTERNS = ["STEADY", "AGGRESSIVE", "REACTIVE", "WANDERING"] as const;

// Texto del Espejo para un patrón estable ya clasificado (o null si el
// Espejo todavía no completó una vuelta). La etiqueta interna nunca se
// muestra al jugador: solo la frase.
export function getMirrorKey(stablePattern: string | null | undefined): MessageKey | null {
  if (!stablePattern) return null;
  return (MIRROR_PATTERNS as readonly string[]).includes(stablePattern)
    ? (`mirror.${stablePattern}` as MessageKey)
    : null;
}
