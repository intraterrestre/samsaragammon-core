import type { PieceKind } from "./types";

export type CreatureDef = {
  id: PieceKind;
  label: string;
  drive: string;
  shadow: string;
};

export const CREATURES: Record<PieceKind, CreatureDef> = {
  pig: {
    id: "pig",
    label: "Pig",
    drive: "inertia",
    shadow: "attachment without clarity",
  },
  snake: {
    id: "snake",
    label: "Snake",
    drive: "reaction",
    shadow: "defense through aversion",
  },
  rooster: {
    id: "rooster",
    label: "Rooster",
    drive: "impulse",
    shadow: "movement before wisdom",
  },
};