// src/game/ui/geometry.ts
import type React from "react";

/**
 * Geometry for the circular ring layout.
 * Keep it isolated so Board.tsx stays clean.
 */

export const RING_SIZE = 520; // container size in px
export const CELL = 44;       // cell button size in px
export const CENTER = RING_SIZE / 2;

// Correct radius: ring radius minus half cell minus a little padding
export const RADIUS = RING_SIZE / 2 - CELL / 2 - 14;

/**
 * 24 cells = full circle. i=0 at bottom (6 o'clock), clockwise.
 */
export function cellStyle(i: number, size: number): React.CSSProperties {
  const n = Math.max(1, size);

  // + PI/2 => starts at bottom
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

export function piecePosition(pos: number, size: number): React.CSSProperties {
  const n = Math.max(1, size);

  const angle = (pos / n) * (Math.PI * 2) + Math.PI / 2;

  const x = CENTER + RADIUS * Math.cos(angle);
  const y = CENTER + RADIUS * Math.sin(angle);

  return {
    position: "absolute",
    left: x,
    top: y,
    transform: "translate(-50%, -50%)",
    transition:
      "left 420ms cubic-bezier(.25,.8,.25,1), top 420ms cubic-bezier(.25,.8,.25,1)",
  };
}