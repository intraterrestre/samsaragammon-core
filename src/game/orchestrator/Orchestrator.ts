// src/game/orchestrator/Orchestrator.ts
// Orquestador de Progresión — RFC v0.9 D-009, D-018, D-020

import type { GameState, PlayerId } from "../types";

export type OrchestratorEvent =
  | { event: "REVEAL_NEXT_AVATAR"; avatarStep: number }
  | { event: "NONE" };

export type TransitionId =
  | "bruno_to_margot"
  | "margot_to_oriol"
  | "oriol_to_marino"
  | "marino_to_rufus"
  | "rufus_to_whitman";

export const EARLY_EVOLUTION_ROLLS = 6;
export const LATE_EVOLUTION_ROLLS = 7;

const STEP_TO_TRANSITION: Record<number, TransitionId> = {
  1: "bruno_to_margot",
  2: "margot_to_oriol",
  3: "oriol_to_marino",
  4: "marino_to_rufus",
  5: "rufus_to_whitman",
};

export function requiredRollsForNextAvatar(currentStep: number): number {
  return currentStep <= 2 ? EARLY_EVOLUTION_ROLLS : LATE_EVOLUTION_ROLLS;
}

export function evaluateOrchestrator(
  state: GameState,
  player: PlayerId
): OrchestratorEvent {
  if (!state.brunoRevealed) return { event: "NONE" };

  const realmProgress = state.realmProgress[player];
  const currentStep = realmProgress.currentRealmStep;

  if (currentStep >= 6) return { event: "NONE" };

  const transitionId = STEP_TO_TRANSITION[currentStep];
  if (!transitionId) return { event: "NONE" };

  const rollsInCurrentStage =
    state.globalRollCount - (realmProgress.stageStartedAtRoll ?? 0);

  if (rollsInCurrentStage < requiredRollsForNextAvatar(currentStep)) {
    return { event: "NONE" };
  }

  return { event: "REVEAL_NEXT_AVATAR", avatarStep: currentStep + 1 };
}

export const MIN_GENESIS_TURNS = 6;
export const MIN_NOVELTY_EVENTS = 4;
export const PITY_GENESIS_TURNS = 30;

export function evaluateGenesisToBruno(state: GameState): boolean {
  if (state.brunoRevealed) return false;
  if (!state.genesisUIComplete) return false;

  const p1Sig = state.decisionSignature?.P1;
  const p2Sig = state.decisionSignature?.P2;
  if (!p1Sig || !p2Sig) return false;

  const p1MovedAllVenoms =
    p1Sig.pigTrace > 0 && p1Sig.snakeTrace > 0 && p1Sig.roosterTrace > 0;
  const p2MovedAllVenoms =
    p2Sig.pigTrace > 0 && p2Sig.snakeTrace > 0 && p2Sig.roosterTrace > 0;

  if (!p1MovedAllVenoms || !p2MovedAllVenoms) return false;
  if (state.globalRollCount < MIN_GENESIS_TURNS) return false;

  const novelty = state.genesisNovelty;
  const noveltyCount = [
    novelty?.hasRolled,
    novelty?.hasMoved,
    novelty?.hasCaptured,
    novelty?.hasMaraReturn,
  ].filter(Boolean).length;

  if (noveltyCount >= MIN_NOVELTY_EVENTS) return true;

  return state.globalRollCount >= PITY_GENESIS_TURNS;
}

export function getAvatarNameForStep(step: number): string {
  const names: Record<number, string> = {
    1: "Bruno", 2: "Margot", 3: "Oriol",
    4: "Marino", 5: "Rufus", 6: "Whitman",
  };
  return names[step] ?? "Unknown";
}
