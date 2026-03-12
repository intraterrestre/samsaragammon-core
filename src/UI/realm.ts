// src/game/ui/realm.ts
import type { Realm } from "../types";

/**
 * Canonical order (6 realms x 4 cells):
 * 0–3 NARAKA, 4–7 PRETA, 8–11 ANIMAL, 12–15 HUMAN, 16–19 ASURA, 20–23 DEVA
 */
export const REALMS: Realm[] = ["NARAKA", "PRETA", "ANIMAL", "HUMAN", "ASURA", "DEVA"];

export function realmFromPos(pos: number): Realm {
  const idx = Math.max(0, Math.min(5, Math.floor(pos / 4)));
  return REALMS[idx] ?? "HUMAN";
}

export const REALM_LABEL: Record<Realm, string> = {
  NARAKA: "Naraka (Hell)",
  PRETA: "Preta (Hungry Ghost)",
  ANIMAL: "Animal (Beasts)",
  HUMAN: "Human (Mortals)",
  ASURA: "Asura (Titans)",
  DEVA: "Deva (Semi-gods)",
};

const REALM_LINES: Record<Realm, string[]> = {
  NARAKA: ["Instinct rules.", "Survival speaks first.", "Darkness sharpens awareness."],
  PRETA: ["Desire without end.", "Hunger remembers.", "Longing shapes the path."],
  ANIMAL: ["Power seeks control.", "Instinct learns structure.", "Force without reflection."],
  HUMAN: ["Choice begins here.", "Balance is a weapon.", "The heart hesitates."],
  ASURA: ["Conflict fuels growth.", "Pride tests strength.", "Victory is not peace."],
  DEVA: ["Pleasure veils impermanence.", "Light without freedom.", "Bliss is not liberation."],
};

export function pickLine(r: Realm) {
  const arr = REALM_LINES[r] ?? REALM_LINES.HUMAN;
  return arr[Math.floor(Math.random() * arr.length)];
}