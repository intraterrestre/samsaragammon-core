type LastKarmaLike = {
  combo: number;
  context: number;
  realm: number;
  total: number;
};

export type KarmaMessage = {
  title: string;
  body: string;
  tone: "low" | "mid" | "high";
};

export function getKarmaMessage(
  lastKarma: LastKarmaLike | null | undefined
): KarmaMessage | null {
  if (!lastKarma) return null;

  const { combo, context, realm, total } = lastKarma;

  if (combo >= 8) {
    return {
      title: "Explosive combination",
      body: "Two strong forces met. Power rose fast.",
      tone: "high",
    };
  }

  if (context > 0 && total >= 4) {
    return {
      title: "Impact with gain",
      body: "You acted with force and the turn gained weight.",
      tone: "high",
    };
  }

  if (realm < 0 && total <= 0) {
    return {
      title: "Heavy terrain",
      body: "The realm resisted you. Not every move can bloom here.",
      tone: "low",
    };
  }

  if (realm > 0 && total >= 1) {
    return {
      title: "Favorable passage",
      body: "The realm supported your move. Flow increased.",
      tone: "mid",
    };
  }

  if (combo > 0 && total > 0) {
    return {
      title: "Useful combination",
      body: "Your forces combined with some coherence.",
      tone: "mid",
    };
  }

  if (total <= 0) {
    return {
      title: "Low-yield move",
      body: "The move happened, but little opened.",
      tone: "low",
    };
  }

  return {
    title: "Small shift",
    body: "A modest move. The wheel still turns.",
    tone: "mid",
  };
}