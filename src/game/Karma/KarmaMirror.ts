// src/game/Karma/KarmaMirror.ts
import type { KarmaOracleReading } from "./KarmaOracle";

export type KarmaMirrorInput = {
  player: "P1" | "P2";
  patternLabel?: string | null;
  choice?: "A" | "B" | "AB" | "ECO" | null;
  didCapture?: boolean;
  cyclesDone?: number;
  transitions?: number;
  realmLabel?: string | null;
  oracle: KarmaOracleReading;
};

export type KarmaMirrorReading = {
  title: string;
  body: string;
  tags: string[];
};

function normalizePattern(label?: string | null): string {
  return (label ?? "UNKNOWN").toUpperCase();
}

export function karmaMirror(input: KarmaMirrorInput): KarmaMirrorReading {
  const pattern = normalizePattern(input.patternLabel);
  const choice = input.choice ?? null;
  const didCapture = !!input.didCapture;
  const cyclesDone = input.cyclesDone ?? 0;
  const transitions = input.transitions ?? 0;
  const realmLabel = input.realmLabel ?? "Unknown";
  const poison = input.oracle.poison;

  let title = "Mirror";
  let body =
    "The wheel notes your movement, but your pattern is still forming.";
  const tags: string[] = [];

  if (choice === "ECO") {
    title = "Mirror of Echo";
    body =
      "You faced the image of choice, but both paths were one. The habit of automatic movement remains hidden inside the echo.";
    tags.push("echo", "illusion-of-choice");
  } else if (didCapture && poison === "aversion") {
    title = "Mirror of Reaction";
    body =
      "You cut through the board decisively. Power was gained, but the ledger marks tension where force replaced patience.";
    tags.push("capture", "reaction", "tension");
  } else if (pattern.includes("WANDERING")) {
    title = "Mirror of Restlessness";
    body =
      "Your movement keeps searching for relief through change. The board records motion, but not yet direction.";
    tags.push("wandering", "desire", "restless");
  } else if (pattern.includes("REACTIVE")) {
    title = "Mirror of Impulse";
    body =
      "Your choices answer pressure quickly. The wheel recognizes responsiveness, but warns that reaction can harden into repetition.";
    tags.push("reactive", "impulse");
  } else if (pattern.includes("STEADY")) {
    title = "Mirror of Balance";
    body =
      "You move without scattering yourself. The wheel still turns, but your center is beginning to remain still.";
    tags.push("steady", "balance");
  }

  if (transitions > 0) {
    body += ` You have already crossed into new karmic terrain ${transitions} time${transitions === 1 ? "" : "s"}.`;
    tags.push("transition");
  }

  if (cyclesDone > 0) {
    body += ` In ${realmLabel}, you have completed ${cyclesDone} cycle${cyclesDone === 1 ? "" : "s"} already.`;
    tags.push("cycles");
  }

  return { title, body, tags };
}