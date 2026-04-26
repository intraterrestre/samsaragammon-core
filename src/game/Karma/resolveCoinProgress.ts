export type CoinId =
  | "hungry_ghost"
  | "hell"
  | "animal"
  | "human"
  | "asura"
  | "deva"
  | "nirvana";

export type CoinProgressResult = {
  coin: CoinId;
  qualified: boolean;
  reason: string;
};

type Input = {
  karmaTotal: number;
  cyclesDone: number;
  transitions: number;
};

export function resolveCoinProgress(input: Input): CoinProgressResult {
  const { karmaTotal, cyclesDone, transitions } = input;

  if (cyclesDone >= 1 && karmaTotal >= 0) {
    return {
      coin: "hungry_ghost",
      qualified: true,
      reason: "First cycle completed. The wheel has begun.",
    };
  }

  if (cyclesDone >= 2 && karmaTotal >= 4) {
    return {
      coin: "hell",
      qualified: true,
      reason: "You endured repetition and kept moving.",
    };
  }

  if (cyclesDone >= 3 && karmaTotal >= 8) {
    return {
      coin: "animal",
      qualified: true,
      reason: "Instinct is no longer blind.",
    };
  }

  if (cyclesDone >= 4 && karmaTotal >= 12) {
    return {
      coin: "human",
      qualified: true,
      reason: "Choice begins to outweigh impulse.",
    };
  }

  if (cyclesDone >= 5 && karmaTotal >= 16) {
    return {
      coin: "asura",
      qualified: true,
      reason: "Power has appeared, but so has conflict.",
    };
  }

  if (cyclesDone >= 6 && karmaTotal >= 20 && transitions >= 1) {
    return {
      coin: "deva",
      qualified: true,
      reason: "Balance rises above reaction.",
    };
  }

  if (cyclesDone >= 7 && karmaTotal >= 28 && transitions >= 2) {
    return {
      coin: "nirvana",
      qualified: true,
      reason: "The pattern loosens. The circle opens.",
    };
  }

  return {
    coin: "hungry_ghost",
    qualified: false,
    reason: "Keep turning the wheel.",
  };
}