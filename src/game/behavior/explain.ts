// src/game/behavior/explain.ts
import type { PatternId } from "./types";

export function explainPattern(pattern: PatternId): string {
  switch (pattern) {
    case "STEADY":
      return "Steady pattern: you tend to keep a consistent rhythm. You switch realms less, capture less, and your moves look controlled rather than reactive.";
    case "AGGRESSIVE":
      return "Aggressive pattern: you tend to resolve situations through direct action. Captures are frequent relative to your moves, and you press advantage when it appears.";
    case "REACTIVE":
      return "Reactive pattern: Naraka pulls you often. This usually means quick responses to pressure and more 'survival mode' decisions.";
    case "WANDERING":
      return "Wandering pattern: you change realms often. This looks like exploration, restlessness, or searching for a better angle rather than committing to one lane.";
    default:
      return "Pattern not recognized yet.";
  }
}

export function explainStreak(streak: number, required: number): string {
  if (streak <= 0) return "No stable streak yet. Your pattern is still forming.";
  if (streak < required) return `Streak means how many completed cycles in a row you kept the same pattern. You're at ${streak}/${required}.`;
  return `Streak reached ${streak}/${required}. Your life is considered stabilized (you showed consistent behavior across multiple cycles).`;
}