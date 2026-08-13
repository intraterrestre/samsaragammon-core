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
//
// v40 (13 agosto 2026) — bug real reportado por Federico: un Veneno
// que viaja con SU PROPIO Avatar (mismo jugador, ej. la serpiente con
// Bruno) quedaba pegado casi 100% debajo del Avatar — imposible de
// clickear para el segundo paso de selección (selectedVenom, ver v27
// en Board.tsx). La separación de acá arriba solo se activaba para
// Avatar RIVAL, nunca para el propio. Se extiende el mismo offset a
// cualquier Avatar en la casilla (propio o rival) — sigue siendo solo
// separación visual, mismo mecanismo ya aprobado, nada nuevo.
export const VENOM_ENEMY_AVATAR_OFFSET = 22;

// v40 (13 agosto 2026) — bug real reportado por Federico: el cochino
// (pig) es visualmente el doble de grande que serpiente/gallo
// (PIECE_VISUAL_SIZE en Board.tsx: pig=90, snake/rooster=50 — "para que
// se lea como el unico drive activo de la Era 1"). Cuando un pig
// comparte casilla con otro Veneno (propio o rival), su tamano extra
// se comia el offset radial normal y el otro Veneno quedaba tapado del
// todo, sin borde clickeable — mismo sintoma que el caso Avatar+Veneno
// de arriba, causa distinta (tamano, no z-index). La mitad de la
// diferencia de tamano (90-50)/2=20, con un margen chico, alcanza para
// dejar un borde visible.
export const PIG_OVERSIZE_OFFSET = 24;

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
      // v40 (13 agosto 2026) — antes: "&& t.player !== player" (solo
      // avatar rival). Ahora separa al Veneno de CUALQUIER Avatar en
      // la casilla, sea propio o rival, para que siempre quede un
      // borde clickable.
      const hasAvatarSameCell =
        system === "base" && tokens.some((t) => t.system === "realm");

      // v40 (13 agosto 2026) — separacion extra cuando comparte casilla
      // con un pig (propio o rival) y esta pieza NO es el pig — el pig
      // ya es casi el doble de grande, no necesita offset propio.
      const hasPigPeerSameCell =
        system === "base" &&
        kind !== "pig" &&
        tokens.some((t) => t.system === "base" && t.kind === "pig");

      const extraRadialOffset =
        (hasAvatarSameCell ? VENOM_ENEMY_AVATAR_OFFSET : 0) +
        (hasPigPeerSameCell ? PIG_OVERSIZE_OFFSET : 0);

      result.set(`${player}-${kind}`, {
        stackIndex,
        stackTotal,
        extraRadialOffset,
      });
    });
  });

  return result;
}
