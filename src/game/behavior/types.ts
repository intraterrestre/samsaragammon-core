// src/game/behavior/types.ts
import type { PlayerId } from "../types";

export type PatternId = "AGGRESSIVE" | "REACTIVE" | "WANDERING" | "STEADY";

/**
 * Accumulates raw stats within the current cycle (no scores yet).
 */
export type CycleAccumulator = {
  cycleIndex: number;
  player: PlayerId;

  moves: number;
  captures: number;
  narakaLandings: number;
  realmChanges: number;
};

/**
 * Finalized stats for a completed cycle (includes classification + scores).
 */
export type CycleStats = CycleAccumulator & {
  pattern: PatternId;
  aggressionScore: number;
  reactivityScore: number;
  wanderingScore: number;
};

export type BehaviorState = {
  // Current (in-progress) cycle accumulator per player
  current: Record<PlayerId, CycleAccumulator>;

  // Completed cycles per player
  history: Record<PlayerId, CycleStats[]>;

  // Stability / “life” logic per player
  stablePattern: Record<PlayerId, PatternId | null>;
  stableStreak: Record<PlayerId, number>;
  lifeStabilized: Record<PlayerId, boolean>;
};