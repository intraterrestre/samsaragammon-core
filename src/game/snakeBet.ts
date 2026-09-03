// src/game/snakeBet.ts
// v82 (1 septiembre 2026) — Snake Bet V0, decisión de diseño cerrada con
// Federico/Chat. Ver types.ts (campo snakeBet) y reducer.ts para el
// resto de la mecánica.

// Fácilmente calibrable — pedido explícito: probar luego 2/3/4 rondas
// sin tener que buscar el número disperso por el reducer.
export const SNAKE_BET_ROUNDS = 3;

export type SnakeBetStakeOutcome = {
  byPlayer: "P1" | "P2";
  stake: readonly [string, string];
};

/**
 * v82 — DELIBERADAMENTE SIN RESOLVER. Corrección explícita de Federico
 * sobre la primera versión de este plan: "no quiero que una Nidana que
 * 'gana' P2 termine simplemente suelta en la casilla — eso no es lo
 * mismo que 'P2 ganó la Nidana'". Para este primer prototipo, cuando la
 * apuesta se pierde, el reducer identifica cuáles 2 Nidanas estaban en
 * juego (ver SnakeBetStakeOutcome) y llama a esta función — que hoy NO
 * hace nada con ellas todavía. El objetivo del prototipo es validar si
 * la apuesta en sí genera tensión real jugando; la física exacta del
 * pago (¿pasan al rival? ¿a cuál Avatar? ¿qué pasa si no tiene slot
 * libre?) es una decisión de diseño aparte, pendiente de esa primera
 * ronda de partidas reales.
 *
 * TODO(diseño pendiente): decidir el settlement físico real del stake
 * cuando SNAKE BET LOST. No implementar por intuición — esperar el
 * resultado del playtest de esta V0.
 */
export function settleSnakeBetStake(outcome: SnakeBetStakeOutcome): void {
  // Intencionalmente sin resolver el pago físico — ver TODO arriba.
  // El log deja rastro de que la función se llamó de verdad, útil
  // mientras se decide el settlement real.
  console.log("[snakeBet] stake sin resolver todavía (TODO)", outcome);
}
