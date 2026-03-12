// src/game/behavior/patternCopy.ts
import type { PatternId } from "./types";

export type CopyLevel = "A" | "B";

export function explainPattern(pattern: PatternId, level: CopyLevel = "A"): string[] {
  // Level A = short, novice-friendly (1 line)
  // Level B = slightly deeper (3 lines)
  switch (pattern) {
    case "STEADY":
      return level === "A"
        ? ["You tend to choose stable, low-drama progress."]
        : [
            "You tend to choose stable, low-drama progress.",
            "You don’t chase constant captures or constant switching.",
            "This usually creates consistency — but can miss high-impact moments.",
          ];

    case "AGGRESSIVE":
      return level === "A"
        ? ["You resolve tension through direct action."]
        : [
            "You resolve tension through direct action.",
            "Captures and confrontations show up often in your cycle.",
            "This can be efficient — but it also creates backlash and resets.",
          ];

    case "REACTIVE":
      return level === "A"
        ? ["You react strongly when pressure rises."]
        : [
            "You react strongly when pressure rises.",
            "Naraka landings (or returning to Naraka) happen more than usual.",
            "This can be sharp awareness — or a loop if it repeats.",
          ];

    case "WANDERING":
      return level === "A"
        ? ["You explore options and change realms frequently."]
        : [
            "You explore options and change realms frequently.",
            "Realm-switching is high — curiosity drives your movement.",
            "This finds opportunities, but may reduce long-term stability.",
          ];
  }
}