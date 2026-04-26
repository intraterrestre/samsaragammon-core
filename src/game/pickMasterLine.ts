// src/game/master/pickMasterLine.ts
import { masterLines } from "./masterLines";

type Group = keyof typeof masterLines;

export function pickMasterLine(
  group: Group,
  key?: string
): string {
  const bucket =
    group === "highStates"
      ? masterLines.highStates
      : (masterLines[group] as Record<string, readonly string[]>)[key ?? ""];

  if (!bucket || bucket.length === 0) {
    return "The wheel is turning.";
  }

  const index = Math.floor(Math.random() * bucket.length);
  return bucket[index];
}