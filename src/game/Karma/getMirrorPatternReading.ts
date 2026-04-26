import type { DecisionSignature } from "../types";

type MirrorPatternReading = {
  title: string;
  body: string;
  tags: string[];
};

export function getMirrorPatternReading(input: {
  pattern: number;
  decisionSignature: DecisionSignature;
}): MirrorPatternReading {
  const { pattern, decisionSignature } = input;

  const totalPieces =
    decisionSignature.pigTrace +
    decisionSignature.snakeTrace +
    decisionSignature.roosterTrace;

  const pigPct = totalPieces > 0 ? decisionSignature.pigTrace / totalPieces : 0;
  const snakePct = totalPieces > 0 ? decisionSignature.snakeTrace / totalPieces : 0;
  const roosterPct =
    totalPieces > 0 ? decisionSignature.roosterTrace / totalPieces : 0;

  const maxUse = Math.max(pigPct, snakePct, roosterPct);

  if (pattern <= -2) {
    return {
      title: "Mirror of Fixation",
      body: "One force is beginning to dominate your decisions. Repetition is shaping the path more than awareness.",
      tags: ["rigidity", "repetition", "imbalance"],
    };
  }

  if (pattern >= 3) {
    return {
      title: "Mirror of Balance",
      body: "Your three forces are beginning to move with unusual equilibrium. Variety is no longer random.",
      tags: ["balance", "variety", "coherence"],
    };
  }

  if (pattern >= 1) {
    return {
      title: "Mirror of Variation",
      body: "You are not trapped in a single creature. Movement is opening into more than one tendency.",
      tags: ["variation", "opening", "shift"],
    };
  }

  if (maxUse > 0.6) {
    return {
      title: "Mirror of Dependence",
      body: "You rely too often on one creature. It may feel efficient, but it narrows the inner field.",
      tags: ["dependence", "habit", "narrowing"],
    };
  }

  return {
    title: "Mirror of Formation",
    body: "The wheel notes your movement, but your pattern is still forming.",
    tags: ["forming"],
  };
}