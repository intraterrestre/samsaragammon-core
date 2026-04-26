import type { DecisionSignature, MoveOption, MoveMeaning, PieceKind } from "../types";

type Input = {
  pieceKind: PieceKind;
  choice: "A" | "B" | "AB" | "ECO";
  meaning: MoveMeaning;
  didCapture: boolean;
  allOptions: MoveOption[];
};

export function updateDecisionSignature(
  current: DecisionSignature,
  input: Input
): DecisionSignature {
  const next: DecisionSignature = { ...current };

  next.totalMoves += 1;

  // animal trace
  if (input.pieceKind === "pig") next.pigTrace += 1;
  if (input.pieceKind === "snake") next.snakeTrace += 1;
  if (input.pieceKind === "rooster") next.roosterTrace += 1;

  // choice trace
  if (input.choice === "A") next.aChoices += 1;
  if (input.choice === "B") next.bChoices += 1;
  if (input.choice === "AB") next.abChoices += 1;
  if (input.choice === "ECO") next.ecoChoices += 1;

  // meaning trace
  if (input.meaning === "IMPACT") next.impactChoices += 1;
  if (input.meaning === "RISK") next.riskChoices += 1;
  if (input.meaning === "SAME") next.sameChoices += 1;
  if (input.meaning === "SAFE") next.safeChoices += 1;
  if (input.meaning === "PROGRESS") next.progressChoices += 1;

  const hadImpactOption = input.allOptions.some((o) => o.meaning === "IMPACT");
  if (hadImpactOption) next.captureOpportunitiesSeen += 1;

  if (input.didCapture) {
    next.capturesMade += 1;
  } else if (hadImpactOption) {
    next.capturesAvoided += 1;
    next.compassionSkips += 1;
  }

  return next;
}