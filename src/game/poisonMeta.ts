import type { BasePieceKind } from "./types";

export type PoisonMeta = {
  label: string;
  icon: string;
};

export const POISON_META: Record<BasePieceKind, PoisonMeta> = {
  pig: { label: "IGNORANCE", icon: "🐷" },
  snake: { label: "ANGER", icon: "🐍" },
  rooster: { label: "IMPULSE", icon: "🐓" },
};
