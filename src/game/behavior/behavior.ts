// src/game/behavior/behavior.ts
import type { PlayerId } from "../types";
import type { BehaviorState, CycleStats, PatternId } from "./types";
/**
 * IMPORTANT:
 * We avoid importing realmFromPos from Board.tsx (would create circular deps).
 * Keep the mapping logic here.
 * Canonical order (6 realms x 4 cells):
 * 0–3 NARAKA, 4–7 PRETA, 8–11 ANIMAL, 12–15 HUMAN, 16–19 ASURA, 20–23 DEVA
 */
function realmIndexFromPos(pos: number): number {
  return Math.max(0, Math.min(5, Math.floor(pos / 4)));
}
function isNaraka(pos: number): boolean {
  return realmIndexFromPos(pos) === 0;
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function computePattern(s: Omit<CycleStats, "pattern" | "aggressionScore" | "reactivityScore" | "wanderingScore">): CycleStats {
  const moves = Math.max(1, s.moves);

  const aggressionScore = clamp01(s.captures / moves);
  const reactivityScore = clamp01(s.narakaLandings / moves);
  const wanderingScore = clamp01(s.realmChanges / moves);

  // Very simple classifier (robust enough for v0)
  let pattern: PatternId = "STEADY";

  // Priority: REACTIVE (Naraka) > AGGRESSIVE (captures) > WANDERING (realm switching) > STEADY
  if (reactivityScore >= 0.25) pattern = "REACTIVE";
  else if (aggressionScore >= 0.25) pattern = "AGGRESSIVE";
  else if (wanderingScore >= 0.40) pattern = "WANDERING";
  else pattern = "STEADY";

  return {
    ...s,
    pattern,
    aggressionScore,
    reactivityScore,
    wanderingScore,
  };
}

export function createBehaviorState(): BehaviorState {
  return {
    current: {
      P1: { cycleIndex: 1, player: "P1", moves: 0, captures: 0, narakaLandings: 0, realmChanges: 0 },
      P2: { cycleIndex: 1, player: "P2", moves: 0, captures: 0, narakaLandings: 0, realmChanges: 0 },
    },
    history: { P1: [], P2: [] },
    stablePattern: { P1: null, P2: null },
    stableStreak: { P1: 0, P2: 0 },
    lifeStabilized: { P1: false, P2: false },
  };
}

/**
 * Call this AFTER a move is resolved.
 * from/to are the mover’s positions BEFORE/AFTER the move.
 * didCapture indicates if the mover captured opponent.
 *
 * trackSize is used to detect a completed cycle:
 * In a wrapping track, a cycle completes when to < from.
 */
export function behaviorAfterMove(args: {
  behavior: BehaviorState;
  player: PlayerId;
  from: number;
  to: number;
  didCapture: boolean;
  trackSize: number;
  // tuning
  stableCyclesRequired?: number; // default 7
  maxHistory?: number;          // default 24
}): BehaviorState {
  const {
    behavior,
    player,
    from,
    to,
    didCapture,
    trackSize,
    stableCyclesRequired = 7,
    maxHistory = 24,
  } = args;

  // If life already stabilized, still track (optional). We’ll keep tracking—useful for future.
  const next: BehaviorState = {
    ...behavior,
    current: { ...behavior.current },
    history: { ...behavior.history },
    stablePattern: { ...behavior.stablePattern },
    stableStreak: { ...behavior.stableStreak },
    lifeStabilized: { ...behavior.lifeStabilized },
  };

  const cur = next.current[player];
  const nextCur = { ...cur };

  // Update per-move stats
  nextCur.moves += 1;
  if (didCapture) nextCur.captures += 1;

  // Naraka landing (reactivity proxy)
  if (isNaraka(to)) nextCur.narakaLandings += 1;

  // Realm change
  if (realmIndexFromPos(from) !== realmIndexFromPos(to)) nextCur.realmChanges += 1;

  // Save updated current accumulator
  next.current[player] = nextCur;

  // Detect cycle completion (wrap-around)
  const completedCycle = trackSize > 0 && to < from;

  if (!completedCycle) return next;

  // Finalize cycle stats
  const finalized = computePattern(nextCur);

  // Append to history
  const prevHist = next.history[player] ?? [];
  const newHist = [...prevHist, finalized].slice(-maxHistory);

  next.history[player] = newHist;

  // Stability tracking (same pattern in a row)
  const prevPattern = next.stablePattern[player];
  if (prevPattern === finalized.pattern) {
    next.stableStreak[player] = (next.stableStreak[player] ?? 0) + 1;
  } else {
    next.stablePattern[player] = finalized.pattern;
    next.stableStreak[player] = 1;
  }

  // Life stabilized?
  if (next.stableStreak[player] >= stableCyclesRequired) {
    next.lifeStabilized[player] = true;
  }

  // Reset accumulator for next cycle
  next.current[player] = {
    cycleIndex: finalized.cycleIndex + 1,
    player,
    moves: 0,
    captures: 0,
    narakaLandings: 0,
    realmChanges: 0,
  };

  return next;
}