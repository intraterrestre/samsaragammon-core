// src/game/realms.ts

export type RealmId =
  | "HUNGRY_GHOST"
  | "HELL"
  | "ANIMALS"
  | "HUMANS"
  | "ASURA"
  | "DEVA"
  | "NIRVANA";

export type RealmDef = {
  id: RealmId;
  label: string;
  short: string;
  color: string;
  tone: string;
};

export const REALMS: Record<RealmId, RealmDef> = {
  HUNGRY_GHOST: {
    id: "HUNGRY_GHOST",
    label: "Hungry Ghost",
    short: "Nothing is enough.",
    color: "#f59e0b", // naranja
    tone: "lack",
  },

  HELL: {
    id: "HELL",
    label: "Hell",
    short: "Everything burns against itself.",
    color: "#991b1b", // rojo oscuro
    tone: "pain",
  },

  ANIMALS: {
    id: "ANIMALS",
    label: "Animals",
    short: "Instinct moves before thought.",
    color: "#dc2626", // rojo
    tone: "instinct",
  },

  HUMANS: {
    id: "HUMANS",
    label: "Humans",
    short: "Choice is still possible.",
    color: "#2563eb", // azul
    tone: "choice",
  },

  ASURA: {
    id: "ASURA",
    label: "Asura",
    short: "Comparison sharpens conflict.",
    color: "#16a34a", // verde
    tone: "conflict",
  },

  DEVA: {
    id: "DEVA",
    label: "Deva",
    short: "Pleasure hides impermanence.",
    color: "#eab308", // dorado
    tone: "pleasure",
  },

  NIRVANA: {
    id: "NIRVANA",
    label: "Nirvana",
    short: "Nothing is held.",
    color: "#e5e7eb", // blanco/gris claro
    tone: "release",
  },
};