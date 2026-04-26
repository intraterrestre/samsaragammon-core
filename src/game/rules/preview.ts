/**
 * Calcula la nueva posición en una rueda circular (Samsara)
 * - No hay rebote
 * - Movimiento continuo
 * - La casilla actual NO cuenta como paso
 */
export function previewMove(
  from: number,
  roll: number,
  trackSize: number
): number {
  return (from + roll) % trackSize;
}