// src/game/stacking.ts
// v31 (11 agosto 2026) — extraído de Board.tsx: lógica pura (sin JSX, sin
// imports de imágenes) de cómo se reparten visualmente las fichas que
// comparten una casilla. Vivía dentro de Board.tsx, pero eso arrastraba
// ~30 imports de .webp/.png que Node/tsx no puede resolver fuera de Vite
// — imposible escribir una prueba real sobre ella. Extraída tal cual,
// sin cambiar ningún comportamiento, para poder probarla directamente.
import { CELL } from "../UI/geometry";
import { getUnlockedBasePieces } from "./era";
import type { BasePieceKind, GameState, PieceKind, PlayerId } from "./types";

const ACTIVE_PIECE_KINDS: PieceKind[] = getUnlockedBasePieces(
  ["pig", "snake", "rooster"] as BasePieceKind[]
);

export function getStackedTokenPosition({
  base,
  pieceSize,
  indexInStack,
  totalInStack,
  wheelCenter,
  spacing = 26,
  extraRadialOffset = 0,
}: {
  base: { left: number; top: number };
  pieceSize: number;
  indexInStack: number;
  totalInStack: number;
  wheelCenter: { x: number; y: number };
  spacing?: number;
  extraRadialOffset?: number;
}) {
  const cellCenterX = base.left + CELL / 2;
  const cellCenterY = base.top + CELL / 2;

  if (totalInStack <= 1) {
    return {
      left: cellCenterX - pieceSize / 2,
      top: cellCenterY - pieceSize / 2,
      zIndex: 40,
    };
  }

  const dx = wheelCenter.x - cellCenterX;
  const dy = wheelCenter.y - cellCenterY;

  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len;
  const uy = dy / len;

  const px = -uy;
  const py = ux;

  const compressedSpacing =
    totalInStack >= 6 ? 18 :
    totalInStack === 5 ? 21 :
    totalInStack === 4 ? 25 :
    totalInStack === 3 ? 30 :
    spacing;

  const radialOffset =
    indexInStack * compressedSpacing - extraRadialOffset;

  const midIndex = (totalInStack - 1) / 2;

  const lateralOffset =
    totalInStack > 4
      ? (indexInStack - midIndex) * 10
      : 0;

  return {
    left:
      cellCenterX +
      ux * radialOffset +
      px * lateralOffset -
      pieceSize / 2,

    top:
      cellCenterY +
      uy * radialOffset +
      py * lateralOffset -
      pieceSize / 2,

    zIndex: 40 + indexInStack,
  };
}

// v31 (11 agosto 2026) — decisión de diseño cerrada con Federico/Chat:
// separación visual (NO lógica) cuando un Veneno comparte casilla con
// un Avatar RIVAL — reutiliza el sistema radial existente en vez de
// crear un componente nuevo. No toca pos, reducer, captura, Mara,
// Orquestador, Karma ni selección — solo el cálculo de píxeles.
export const VENOM_ENEMY_AVATAR_OFFSET = 22;

export function buildUnifiedStackMap(
  state: GameState
): Map<string, { stackIndex: number; stackTotal: number; extraRadialOffset: number }> {
  const byPos = new Map<
    number,
    { player: PlayerId; kind: string; system: "base" | "realm" }[]
  >();

  const addToken = (
    pos: number,
    player: PlayerId,
    kind: string,
    system: "base" | "realm"
  ) => {
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos)!.push({ player, kind, system });
  };

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
    ACTIVE_PIECE_KINDS.forEach((kind) => {
      const piece = state.pieces[player][kind as BasePieceKind];

      if (!piece.inLimbo) {
        addToken(piece.pos, player, kind, "base");
      }
    });
  });

  const realmOrder = [
    "hungry_ghost",
    "hell",
    "animals",
    "humans",
    "asura",
    "deva",
  ] as const;

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
    realmOrder.forEach((kind) => {
      const piece = state.realmPieces?.[player]?.[kind];

      if (piece && !piece.inLimbo && piece.unlocked) {
        addToken(piece.pos, player, kind, "realm");
      }
    });
  });

  const result = new Map<
    string,
    { stackIndex: number; stackTotal: number; extraRadialOffset: number }
  >();

  byPos.forEach((tokens) => {
    const stackTotal = tokens.length;

    tokens.forEach(({ player, kind, system }, stackIndex) => {
      const hasEnemyAvatarSameCell =
        system === "base" &&
        tokens.some((t) => t.system === "realm" && t.player !== player);

      result.set(`${player}-${kind}`, {
        stackIndex,
        stackTotal,
        extraRadialOffset: hasEnemyAvatarSameCell
          ? VENOM_ENEMY_AVATAR_OFFSET
          : 0,
      });
    });
  });

  return result;
}
