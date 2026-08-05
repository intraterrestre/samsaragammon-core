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

interface TransitionConfig {
  minTurns: number;
  captureRateMin: number;
  maraVisitsRequired: number;
  bothPlayersParticipated: boolean;
  hysteresisTurns: number;
}

const THRESHOLDS: Record<TransitionId, TransitionConfig> = {
  bruno_to_margot:  { minTurns: 10, captureRateMin: 0.15, maraVisitsRequired: 1, bothPlayersParticipated: true, hysteresisTurns: 2 },
  margot_to_oriol:  { minTurns: 20, captureRateMin: 0.20, maraVisitsRequired: 2, bothPlayersParticipated: true, hysteresisTurns: 2 },
  oriol_to_marino:  { minTurns: 35, captureRateMin: 0.25, maraVisitsRequired: 2, bothPlayersParticipated: true, hysteresisTurns: 3 },
  marino_to_rufus:  { minTurns: 50, captureRateMin: 0.25, maraVisitsRequired: 2, bothPlayersParticipated: true, hysteresisTurns: 3 },
  rufus_to_whitman: { minTurns: 65, captureRateMin: 0.30, maraVisitsRequired: 2, bothPlayersParticipated: true, hysteresisTurns: 4 },
};

const STEP_TO_TRANSITION: Record<number, TransitionId> = {
  1: "bruno_to_margot",
  2: "margot_to_oriol",
  3: "oriol_to_marino",
  4: "marino_to_rufus",
  5: "rufus_to_whitman",
};

export function evaluateOrchestrator(
  state: GameState,
  player: PlayerId
): OrchestratorEvent {
  const realmProgress = state.realmProgress[player];
  const currentStep = realmProgress.currentRealmStep;

  if (currentStep >= 6) return { event: "NONE" };

  const transitionId = STEP_TO_TRANSITION[currentStep];
  if (!transitionId) return { event: "NONE" };

  const cfg = THRESHOLDS[transitionId];
  const sig = state.decisionSignature?.[player];
  if (!sig) return { event: "NONE" };

  // 1. Mínimo de turnos globales
  if (state.globalRollCount < cfg.minTurns) return { event: "NONE" };

  // 2. CaptureRate — capturas / turnos en la etapa
  const turnsInStage = Math.max(1, realmProgress.completedLoopsInRealm * 4 + 1);
  const captureRate = (sig.capturesMade ?? 0) / turnsInStage;
  if (captureRate < cfg.captureRateMin) return { event: "NONE" };

  // 3. Visitas a Mara (aproximado con totalMoves)
  if ((sig.totalMoves ?? 0) < cfg.maraVisitsRequired) return { event: "NONE" };

  // 4. Ambos jugadores participaron
  if (cfg.bothPlayersParticipated) {
    const other: PlayerId = player === "P1" ? "P2" : "P1";
    const otherSig = state.decisionSignature?.[other];
    if (!otherSig || (otherSig.totalMoves ?? 0) < 1) return { event: "NONE" };
  }

  return { event: "REVEAL_NEXT_AVATAR", avatarStep: currentStep + 1 };
}

// v5 — Acto 0 (Génesis de los animales). Condición para que Bruno
// aparezca por primera vez. A diferencia de STEP_TO_TRANSITION/THRESHOLDS
// (que gobiernan Bruno→Margot→...), esta transición 0→Bruno se evalúa con
// criterios de tipo distinto (eventos de novedad del tutorial, no
// captureRate/maraVisits), así que vive en su propia función en vez de
// forzarla dentro de la tabla genérica.
export const MIN_GENESIS_TURNS = 6;
export const MIN_NOVELTY_EVENTS = 4;

export function evaluateGenesisToBruno(state: GameState): boolean {
  if (state.brunoRevealed) return false;

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

  return noveltyCount >= MIN_NOVELTY_EVENTS;
}

export function getAvatarNameForStep(step: number): string {
  const names: Record<number, string> = {
    1: "Bruno", 2: "Margot", 3: "Oriol",
    4: "Marino", 5: "Rufus", 6: "Whitman",
  };
  return names[step] ?? "Unknown";
}
