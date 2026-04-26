// src/game/realm/realmCanon.ts
import type { RealmId } from "../realms";

export type RealmCanonEntry = {
  step: number;
  id: RealmId;
  label: string;
  color: string;
  hex: string;
  era: string;
  state: string;
};

export const REALM_CANON: RealmCanonEntry[] = [
  {
    step: 1,
    id: "HUNGRY_GHOST",
    label: "Hungry Ghost",
    color: "Black",
    hex: "#1a1a1a",
    era: "Palaeolithic",
    state: "Instinct & Survival",
  },
  {
    step: 2,
    id: "HELL",
    label: "Hell",
    color: "Purple",
    hex: "#6f42c1",
    era: "Neolithic",
    state: "Painful experiences",
  },
  {
    step: 3,
    id: "ANIMALS",
    label: "Animals",
    color: "Gold",
    hex: "#d4af37",
    era: "Metal Age",
    state: "Impulse & Routine",
  },
  {
    step: 4,
    id: "HUMANS",
    label: "Humans",
    color: "Blue",
    hex: "#2563eb",
    era: "Antiquity",
    state: "Self-awareness",
  },
  {
    step: 5,
    id: "ASURA",
    label: "Titans",
    color: "Red",
    hex: "#dc2626",
    era: "Renaissance",
    state: "Conflict & Ambition",
  },
  {
    step: 6,
    id: "DEVA",
    label: "SemiGods",
    color: "White",
    hex: "#f3f4f6",
    era: "Enlightenment",
    state: "Refinement & Power",
  },
  {
    step: 7,
    id: "NIRVANA",
    label: "Buddha",
    color: "Rainbow",
    hex: "#22c55e",
    era: "Curvist Golden Era",
    state: "Liberation",
  },
];