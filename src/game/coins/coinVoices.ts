export type CoinVoice = {
  id: string;
  title: string;
  illusion: string;
  truth: string;
};

export const COIN_VOICES: Record<string, CoinVoice> = {
  hungry_ghost: {
    id: "hungry_ghost",
    title: "Endless Hunger",
    illusion: "I need more to feel complete.",
    truth: "Nothing external will fill what is empty within.",
  },

  hell: {
    id: "hell",
    title: "Fire of Resistance",
    illusion: "This should not be happening.",
    truth: "The pain persists because you resist it.",
  },

  animal: {
    id: "animal",
    title: "Instinct Loop",
    illusion: "I act naturally.",
    truth: "You are moving without awareness.",
  },

  human: {
    id: "human",
    title: "Crossroads",
    illusion: "I am choosing freely.",
    truth: "You are pulled between forces you do not yet see.",
  },

  asura: {
    id: "asura",
    title: "Age of Enlightenment",
    illusion: "I understand. I see clearly.",
    truth: "You see… but you still need to win.",
  },

  deva: {
    id: "deva",
    title: "Harmonic Realm",
    illusion: "I have reached balance.",
    truth: "You are attached to peace itself.",
  },

  nirvana: {
    id: "nirvana",
    title: "No Return",
    illusion: "",
    truth: "Nothing to remove. Nothing to attain.",
  },
};
export function getCoinVoice(coinId: string): CoinVoice | null {
  return COIN_VOICES[coinId] ?? null;
}