// src/game/snakeBet.ts
// v82 (1 septiembre 2026) — Snake Bet V0, decisión de diseño cerrada con
// Federico/Chat. Ver types.ts (campo snakeBet) y reducer.ts para el
// resto de la mecánica.

// Fácilmente calibrable — pedido explícito: probar luego 2/3/4 rondas
// sin tener que buscar el número disperso por el reducer.
export const SNAKE_BET_ROUNDS = 3;

// 20 nov 2026 — el pago al perder quedó cerrado con Federico: las
// Nidanas apostadas que el apostador todavía porta vuelven al tablero
// (no pasan al rival). Ver resolveSnakeBetEnd en reducer.ts.
