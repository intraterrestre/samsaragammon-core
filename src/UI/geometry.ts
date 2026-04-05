import type React from "react";

/**
 * Geometry for the circular ring layout.
 * Shared by cells and pieces so both align perfectly.
 */

export const RING_SIZE = 520;
export const CELL = 44;
export const CENTER = RING_SIZE / 2;
export const RADIUS = RING_SIZE / 2 - CELL / 2 - 14;

/**
 * 24 cells around the circle.
 * i = 0 starts at bottom (6 o'clock), clockwise.
 */
export function cellStyle(i: number, size: number): React.CSSProperties {
  const n = Math.max(1, size);
  const angle = (i / n) * (Math.PI * 2) + Math.PI / 2;

  const x = CENTER + RADIUS * Math.cos(angle);
  const y = CENTER + RADIUS * Math.sin(angle);

  return {
    position: "absolute",
    left: x - CELL / 2,
    top: y - CELL / 2,
    width: CELL,
    height: CELL,
  };
}

/**
 * Piece uses the SAME box geometry as the cell,
 * but pushed slightly outward so it doesn't cover the cell center.
 */
export function piecePosition(pos: number, size: number): React.CSSProperties {
  const n = Math.max(1, size);
  const angle = (pos / n) * (Math.PI * 2) + Math.PI / 2;

  const baseX = CENTER + RADIUS * Math.cos(angle);
  const baseY = CENTER + RADIUS * Math.sin(angle);

  // empuje hacia afuera
  const outwardOffset = 14;

  const x = baseX + Math.cos(angle) * outwardOffset;
  const y = baseY + Math.sin(angle) * outwardOffset;

  return {
    position: "absolute",
    left: x - CELL / 2,
    top: y - CELL / 2,
    width: CELL,
    height: CELL,
    transition:
      "left 420ms cubic-bezier(.25,.8,.25,1), top 420ms cubic-bezier(.25,.8,.25,1)",
  };
}