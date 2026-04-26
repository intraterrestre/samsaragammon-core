// src/game/karma/getMasterMessage.ts

import type { PieceKind } from "../types";

export function getMasterMessage(
  captured: PieceKind | null,
  meaning: string,
  pattern: number
): string {
  // ===== PURIFICATION =====
  if (captured) {
    switch (captured) {
      case "pig":
        return "The root was cut.";
      case "snake":
        return "Anger loosened.";
      case "rooster":
        return "Impulse lost ground.";
    }
  }

  // ===== ACTION =====
  let base = "";

  if (meaning === "IMPACT") base = "Force was used.";
  else if (meaning === "RISK") base = "You moved into uncertainty.";
  else base = "You remained within your path.";

  // ===== PATTERN =====
  if (pattern < 0) {
    return base + " Repetition is forming.";
  }

  if (pattern > 1) {
    return base + " Balance is emerging.";
  }

  return base;
}