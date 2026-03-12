// src/game/karma/karmaOracle.ts

export type OraclePoison = "ignorance" | "desire" | "aversion";
export type OracleNidana =
  | "Avidya"
  | "Samskara"
  | "Vijnana"
  | "Sparsha"
  | "Vedana"
  | "Trishna"
  | "Upadana"
  | "Bhava"
  | "Jati"
  | "Jara-Marana";

export type OraclePattern =
  | "STEADY"
  | "WANDERING"
  | "REACTIVE"
  | "UNKNOWN";

export type OracleRealm =
  | "HUNGRY_GHOST"
  | "HELL"
  | "ANIMALS"
  | "HUMANS"
  | "TITANS"
  | "SEMIGODS"
  | "BUDDHA"
  | "UNKNOWN";

export type KarmaOracleInput = {
  pattern?: string | null;
  realm?: string | null;
  didCapture?: boolean;
  choice?: string | null;
};

export type KarmaOracleReading = {
  poison: OraclePoison;
  nidana: OracleNidana;
  multiplier: number;
  realm: OracleRealm;
  summary: string;
};

function normalizePattern(pattern?: string | null): OraclePattern {
  const p = (pattern ?? "").toUpperCase();

  if (p.includes("STEADY")) return "STEADY";
  if (p.includes("WANDERING")) return "WANDERING";
  if (p.includes("REACTIVE")) return "REACTIVE";

  return "UNKNOWN";
}

function normalizeRealm(realm?: string | null): OracleRealm {
  const r = (realm ?? "").toUpperCase();

  if (r.includes("HUNGRY_GHOST")) return "HUNGRY_GHOST";
  if (r.includes("HELL")) return "HELL";
  if (r.includes("ANIMALS")) return "ANIMALS";
  if (r.includes("HUMANS")) return "HUMANS";
  if (r.includes("TITANS")) return "TITANS";
  if (r.includes("SEMIGODS")) return "SEMIGODS";
  if (r.includes("BUDDHA")) return "BUDDHA";

  return "UNKNOWN";
}

export function karmaOracle(input: KarmaOracleInput): KarmaOracleReading {
  const pattern = normalizePattern(input.pattern);
  const realm = normalizeRealm(input.realm);
  const didCapture = !!input.didCapture;
  const choice = (input.choice ?? "").toUpperCase();

  let poison: OraclePoison = "ignorance";
  let nidana: OracleNidana = "Avidya";
  let multiplier = 1.0;
  let summary = "The wheel turns in silence.";

  if (didCapture) {
    poison = "aversion";
    nidana = "Sparsha";
    multiplier = 1.15;
    summary = "A cutting move sharpens karmic tension.";
  } else if (pattern === "WANDERING") {
    poison = "desire";
    nidana = "Trishna";
    multiplier = 1.18;
    summary = "Restless movement feeds craving.";
  } else if (pattern === "REACTIVE") {
    poison = "aversion";
    nidana = "Bhava";
    multiplier = 1.12;
    summary = "Reaction hardens into becoming.";
  } else if (pattern === "STEADY") {
    poison = "ignorance";
    nidana = "Vijnana";
    multiplier = 0.95;
    summary = "Steady awareness softens the wheel.";
  }

  if (choice === "ECO") {
    poison = "ignorance";
    nidana = "Avidya";
    multiplier = Math.max(multiplier, 1.05);
    summary = "An echo of choice conceals the same outcome.";
  }

  if (realm === "HELL") {
    multiplier += 0.05;
  }

  if (realm === "HUMANS" && pattern === "STEADY") {
    multiplier -= 0.05;
  }

  if (realm === "BUDDHA") {
    multiplier = 0.9;
    summary = "The wheel loosens its grip.";
  }

  multiplier = Math.max(0.7, Math.min(1.4, Number(multiplier.toFixed(2))));

  return {
    poison,
    nidana,
    multiplier,
    realm,
    summary,
  };
}