/**
 * Calcula la nueva posición en una rueda circular (Samsara)
 * - Movimiento continuo en anillo de 24 casillas
 * - Soporta direcciones opuestas (horario / antihorario)
 * - Aritmética circular segura para números negativos
 *
 * v2: añade normalizeBoardPosition y soporte de dirección
 */

export const TRACK_SIZE = 24;

/**
 * Aritmética circular segura.
 * Garantiza resultado en [0, trackSize) para cualquier entero.
 */
export function normalizeBoardPosition(
  pos: number,
  trackSize: number = TRACK_SIZE
): number {
  return ((pos % trackSize) + trackSize) % trackSize;
}

/**
 * Calcula destino desde una posición origen con una tirada.
 * @param from     Posición de origen (del Veneno, no del Avatar)
 * @param roll     Valor de la tirada de dados
 * @param trackSize Número de casillas del tablero
 * @param direction "clockwise" (P1) | "counterclockwise" (P2)
 */
export function previewMove(
  from: number,
  roll: number,
  trackSize: number,
  direction: "clockwise" | "counterclockwise" = "clockwise"
): number {
  const delta = direction === "clockwise" ? roll : -roll;
  return normalizeBoardPosition(from + delta, trackSize);
}
