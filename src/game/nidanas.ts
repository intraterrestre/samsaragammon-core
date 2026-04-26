// src/game/nidanas.ts

export type NidanaId =
  | "IGNORANCE"
  | "FORMATIONS"
  | "CONSCIOUSNESS"
  | "NAME_AND_FORM"
  | "SIX_SENSES"
  | "CONTACT"
  | "FEELING"
  | "CRAVING"
  | "CLINGING"
  | "BECOMING"
  | "BIRTH"
  | "DEATH";

export type NidanaDef = {
  id: NidanaId;
  label: string;
  short: string;
};

export const NIDANAS: Record<NidanaId, NidanaDef> = {
  IGNORANCE: {
    id: "IGNORANCE",
    label: "Ignorance",
    short: "Seeing is clouded.",
  },
  FORMATIONS: {
    id: "FORMATIONS",
    label: "Formations",
    short: "Old patterns prepare the move.",
  },
  CONSCIOUSNESS: {
    id: "CONSCIOUSNESS",
    label: "Consciousness",
    short: "Awareness touches the field.",
  },
  NAME_AND_FORM: {
    id: "NAME_AND_FORM",
    label: "Name & Form",
    short: "Identity takes shape.",
  },
  SIX_SENSES: {
    id: "SIX_SENSES",
    label: "Six Senses",
    short: "Perception opens outward.",
  },
  CONTACT: {
    id: "CONTACT",
    label: "Contact",
    short: "Something meets the world.",
  },
  FEELING: {
    id: "FEELING",
    label: "Feeling",
    short: "Pleasure, pain, or neither.",
  },
  CRAVING: {
    id: "CRAVING",
    label: "Craving",
    short: "You reached."
  },
  CLINGING: {
    id: "CLINGING",
    label: "Clinging",
    short: "Holding creates weight.",
  },
  BECOMING: {
    id: "BECOMING",
    label: "Becoming",
    short: "The pattern seeks to solidify.",
  },
  BIRTH: {
    id: "BIRTH",
    label: "Birth",
    short: "A new cycle takes form.",
  },
  DEATH: {
    id: "DEATH",
    label: "Death",
    short: "What formed must pass.",
  },
};

export const NIDANA_LIST: NidanaId[] = [
  "IGNORANCE",
  "FORMATIONS",
  "CONSCIOUSNESS",
  "NAME_AND_FORM",
  "SIX_SENSES",
  "CONTACT",
  "FEELING",
  "CRAVING",
  "CLINGING",
  "BECOMING",
  "BIRTH",
  "DEATH",
];