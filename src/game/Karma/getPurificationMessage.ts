import type { PieceKind } from "../types";

export function getPurificationMessage(
  capturedPieceKind: PieceKind | null
): string | null {
  if (!capturedPieceKind) return null;

  switch (capturedPieceKind) {
    case "pig":
      return "The root was cut.";
    case "snake":
      return "Anger loosened.";
    case "rooster":
      return "Impulse lost ground.";
    default:
      return null;
  }
}