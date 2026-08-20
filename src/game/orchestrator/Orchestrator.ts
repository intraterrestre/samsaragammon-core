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
  rufus_to_whitman: { minTurns: 65, captureRateMin: 0.20, maraVisitsRequired: 2, bothPlayersParticipated: true, hysteresisTurns: 4 },
};

// v10 — reparación de identidad de etapa (10 agosto 2026). minTurns es un
// guardrail ABSOLUTO (nunca antes del lance global X de toda la partida) y
// se conserva sin cambios. Pero si un Avatar tarda en aparecer, ese
// guardrail absoluto ya puede estar cumplido para VARIAS transiciones
// futuras a la vez, provocando que se disparen en cascada apenas aparece
// el Avatar actual. Este guardrail es RELATIVO: lances mínimos desde que
// el Avatar actual (no el siguiente) apareció de verdad — recupera el
// propósito original de los números de D-020 (6/8/10/10/12), que habían
// quedado sin uso tras la limpieza de la RFC v1.1.
const MIN_ROLLS_IN_STAGE: Record<TransitionId, number> = {
  bruno_to_margot: 6,
  margot_to_oriol: 8,
  oriol_to_marino: 10,
  marino_to_rufus: 10,
  rufus_to_whitman: 12,
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
  // v14 (10 agosto 2026) — bug real reproducido: esta función nunca
  // comprobaba state.brunoRevealed. La condición real para que Bruno
  // nazca (evaluateGenesisToBruno) exige que cada jugador haya movido
  // los 3 Venenos al menos una vez — en partida real eso puede tardar
  // más lances que el umbral que necesita bruno_to_margot para
  // disparar. Sin este guardrail, el Orquestador avanzaba a Margot (y
  // más allá) aunque Bruno nunca se hubiera creado. Reproducido con una
  // simulación directa contra el reducer antes de este arreglo.
  if (!state.brunoRevealed) return { event: "NONE" };

  const realmProgress = state.realmProgress[player];
  const currentStep = realmProgress.currentRealmStep;

  if (currentStep >= 6) return { event: "NONE" };

  const transitionId = STEP_TO_TRANSITION[currentStep];
  if (!transitionId) return { event: "NONE" };

  const cfg = THRESHOLDS[transitionId];
  const sig = state.decisionSignature?.[player];
  if (!sig) return { event: "NONE" };

  // 1. Mínimo de turnos globales (guardrail absoluto — nunca antes del
  // lance X de toda la partida)
  if (state.globalRollCount < cfg.minTurns) return { event: "NONE" };

  // 1.5 — Mínimo de lances DESDE que el Avatar actual apareció (guardrail
  // relativo — evita cascadas cuando el Avatar actual tardó en aparecer y
  // el guardrail absoluto de arriba ya estaba cumplido de sobra).
  const rollsInCurrentStage =
    state.globalRollCount - (realmProgress.stageStartedAtRoll ?? 0);
  if (rollsInCurrentStage < MIN_ROLLS_IN_STAGE[transitionId]) {
    return { event: "NONE" };
  }

  // 2. CaptureRate — capturas / turnos EN ESTA ETAPA.
  // v58 (17 agosto 2026) — antes usaba sig.capturesMade, un contador
  // ACUMULADO DE TODA LA PARTIDA que nunca se resetea (el Karma/Mirror
  // Panel sí lo necesita así, ver getMirrorPatternReading.ts — no se
  // toca). Dividido entre turnsInStage (que SÍ se resetea por etapa), la
  // tasa se volvía cada vez más difícil de alcanzar cuanto más se jugaba
  // sin capturar — el gate empeoraba con el tiempo en vez de medir lo que
  // pasó en la etapa actual. realmProgress.capturesInStage es el par
  // exclusivo del Orquestador, reseteado en cada ascenso real (ver
  // reducer.ts).
  const turnsInStage = Math.max(1, realmProgress.completedLoopsInRealm * 4 + 1);
  const captureRate = (realmProgress.capturesInStage ?? 0) / turnsInStage;
  if (captureRate < cfg.captureRateMin) return { event: "NONE" };

  // 3. Visitas a Mara (aproximado con movimientos EN ESTA ETAPA, mismo
  // motivo que el punto 2 — no con sig.totalMoves de toda la partida).
  if ((realmProgress.movesInStage ?? 0) < cfg.maraVisitsRequired) {
    return { event: "NONE" };
  }

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
  // No disparar Bruno hasta que el Genesis visual haya terminado completamente
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

  return noveltyCount >= MIN_NOVELTY_EVENTS;
}

export function getAvatarNameForStep(step: number): string {
  const names: Record<number, string> = {
    1: "Bruno", 2: "Margot", 3: "Oriol",
    4: "Marino", 5: "Rufus", 6: "Whitman",
  };
  return names[step] ?? "Unknown";
}
