// KarmaEngine.ts
// Samsaragammon – Karma Engine v1
// Philosophy alignment:
// - Karma: energetic imprint via repetition + intensity + reactivity
// - Dharma: reduction of automatic reaction (pattern deviation, restraint, de-escalation)
// - Capture always generates Karma; never framed as "bad", just imprint.
// - Pattern-based, not single-event moralism.

export type PlayerId = string;

export type ActionType =
  | "MOVE"
  | "CAPTURE"
  | "PASS"
  | "SPECIAL"
  | "TURN_END";

export interface GameAction {
  id: string;               // unique action id
  t: number;                // timestamp ms
  turn: number;             // turn index
  actor: PlayerId;          // who acted
  target?: PlayerId;        // optional opponent involved (capture, etc.)
  type: ActionType;

  // Optional semantic features (use what you have; leave undefined if not applicable)
  realm?: string;           // Deva/Asura/Human/Animal/Preta/Naraka, etc.
  posKey?: string;          // board position key, e.g. "R2-S5"
  moveKey?: string;         // movement signature, e.g. "FWD-3" or "LAP+1"
  intensity?: number;       // 0..1 (engine will clamp). If missing, derived by type.
  reactionDelayMs?: number; // time since last opponent action (lower => more reactive)
  voluntary?: boolean;      // if action is chosen from "Mirror" options intentionally
  note?: string;
}

export type LayerLevel = "A_SURFACE" | "B_MIRROR" | "C_LIBERATION";

export interface KarmaConfig {
  // Base weights
  wCapture: number;         // base intensity for capture
  wMove: number;            // base intensity for move
  wSpecial: number;         // base intensity for special
  wPass: number;            // base intensity for pass/skip

  // Reactivity
  reactionWindowMs: number; // under this => strongly reactive
  reactivityExponent: number; // shapes curve

  // Pattern windows
  windowTurns: number;      // how far back to compute pattern density
  minActionsForPattern: number;

  // Repetition scoring
  repetitionExponent: number; // F = (count)^exp
  entanglementExponent: number; // E = (sameTargetCaptures)^exp

  // Thresholds for layer switching
  mirrorTriggerPatternDensity: number; // 0..1
  mirrorTriggerKarmaRate: number;      // karma per turn threshold
  liberationTriggerDharmaRate: number; // dharma per turn threshold
  stabilizationTurns: number;          // require stable pattern for N turns

  // Dharma scoring
  dharmaDeviationBoost: number;        // reward deviating from dominant pattern
  dharmaRestraintBoost: number;        // reward non-capture when capture available (if you provide that flag)
  dharmaDelayBoost: number;            // reward higher reactionDelayMs (less reactive)

  // Optional: clamp outputs
  clampKarmaPerAction: number;         // e.g. 5
  clampDharmaPerAction: number;        // e.g. 5
}

export const defaultKarmaConfig: KarmaConfig = {
  wCapture: 1.0,
  wMove: 0.2,
  wSpecial: 0.4,
  wPass: 0.1,

  reactionWindowMs: 2500,
  reactivityExponent: 1.4,

  windowTurns: 14,
  minActionsForPattern: 12,

  repetitionExponent: 1.25,
  entanglementExponent: 1.35,

  mirrorTriggerPatternDensity: 0.42,
  mirrorTriggerKarmaRate: 0.9, // karma/turn
  liberationTriggerDharmaRate: 0.6, // dharma/turn
  stabilizationTurns: 5,

  dharmaDeviationBoost: 0.35,
  dharmaRestraintBoost: 0.45,
  dharmaDelayBoost: 0.25,

  clampKarmaPerAction: 5,
  clampDharmaPerAction: 5,
};

export interface PlayerState {
  playerId: PlayerId;
  level: LayerLevel;

  karmaTotal: number;
  dharmaTotal: number;

  // Rolling measures
  karmaPerTurnAvg: number;
  dharmaPerTurnAvg: number;
  patternDensity: number;

  // Pattern model
  dominantSignature?: string;     // most frequent action signature in window
  dominantSignatureShare?: number; // 0..1
  stabilizedTurns: number;

  // Entanglement
  entanglementByTarget: Record<PlayerId, number>; // counts of capture vs each target
}

export interface EngineSnapshot {
  turn: number;
  players: Record<PlayerId, PlayerState>;
  lastActions: GameAction[];
}

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function clamp(x: number, min: number, max: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function baseIntensityFor(action: GameAction, cfg: KarmaConfig): number {
  const explicit = action.intensity;
  if (typeof explicit === "number") return clamp01(explicit);

  switch (action.type) {
    case "CAPTURE": return cfg.wCapture;
    case "MOVE": return cfg.wMove;
    case "SPECIAL": return cfg.wSpecial;
    case "PASS": return cfg.wPass;
    case "TURN_END": return 0;
    default: return 0.2;
  }
}

function computeReactivity(action: GameAction, cfg: KarmaConfig): number {
  // Reactivity is higher if reactionDelayMs is low.
  // If delay unknown, assume neutral 0.5 (not moralistic, just unknown).
  const d = action.reactionDelayMs;
  if (typeof d !== "number" || d < 0) return 0.5;

  const w = cfg.reactionWindowMs;
  // Map delay to [0..1] where 1 = immediate reaction, 0 = slow reaction.
  const x = clamp01(1 - d / w);
  // Shape
  return Math.pow(x, cfg.reactivityExponent);
}

function actionSignature(a: GameAction): string {
  // A signature is what we use for repetition/pattern density.
  // Keep it stable and not too granular:
  // type + optional moveKey + optional posKey + optional realm
  const parts = [a.type];
  if (a.moveKey) parts.push(`m:${a.moveKey}`);
  if (a.posKey) parts.push(`p:${a.posKey}`);
  if (a.realm) parts.push(`r:${a.realm}`);
  if (a.type === "CAPTURE" && a.target) parts.push(`t:${a.target}`);
  return parts.join("|");
}

function computeDominantShare(signatures: string[]): { dominant?: string; share: number } {
  if (signatures.length === 0) return { dominant: undefined, share: 0 };
  const counts = new Map<string, number>();
  for (const s of signatures) counts.set(s, (counts.get(s) ?? 0) + 1);

  let dominant: string | undefined;
  let max = 0;
  for (const [k, v] of counts.entries()) {
    if (v > max) { max = v; dominant = k; }
  }
  return { dominant, share: max / signatures.length };
}

function computePatternDensity(signatures: string[], dominantShare: number): number {
  // Simplest robust measure: density = dominantShare
  // Because your doctrine cares about stabilized repetition.
  return clamp01(dominantShare);
}

export class KarmaEngine {
  private cfg: KarmaConfig;
  private actions: GameAction[] = [];
  private playerStates: Record<PlayerId, PlayerState> = {};
  private lastTurn: number = 0;

  constructor(playerIds: PlayerId[], cfg?: Partial<KarmaConfig>) {
    this.cfg = { ...defaultKarmaConfig, ...(cfg ?? {}) };
    for (const id of playerIds) {
      this.playerStates[id] = {
        playerId: id,
        level: "A_SURFACE",
        karmaTotal: 0,
        dharmaTotal: 0,
        karmaPerTurnAvg: 0,
        dharmaPerTurnAvg: 0,
        patternDensity: 0,
        dominantSignature: undefined,
        dominantSignatureShare: 0,
        stabilizedTurns: 0,
        entanglementByTarget: {},
      };
    }
  }

  ingest(action: GameAction): EngineSnapshot {
    this.actions.push(action);
    this.lastTurn = Math.max(this.lastTurn, action.turn);

    const ps = this.playerStates[action.actor];
    if (!ps) throw new Error(`Unknown actor playerId: ${action.actor}`);

    // 1) Compute Karma per action
    const I = baseIntensityFor(action, this.cfg);
    const R = computeReactivity(action, this.cfg);

    // Repetition factor F: count this signature in rolling window
    const sig = actionSignature(action);
    const window = this.getWindowActions(action.actor, action.turn);
    const sigCount = window.filter(a => actionSignature(a) === sig).length + 1; // include this one
    const F = Math.pow(sigCount, this.cfg.repetitionExponent);

    // Entanglement E: only meaningful for CAPTURE with a target
    let E = 0;
    if (action.type === "CAPTURE" && action.target) {
      const prev = ps.entanglementByTarget[action.target] ?? 0;
      const next = prev + 1;
      ps.entanglementByTarget[action.target] = next;
      E = Math.pow(next, this.cfg.entanglementExponent) * 0.15; // scaled
    }

    // Karma accumulates through repetition and intensity (capture always generates karma)
    let karmaDelta = 0;
    if (action.type === "CAPTURE") {
      karmaDelta = (R * F * I) + E;
    } else {
      // Even non-capture actions can carry imprint if reactive + repetitive.
      // Keep lighter to avoid “everything is karma”.
      karmaDelta = (R * F * I) * 0.35;
    }
    karmaDelta = clamp(karmaDelta, 0, this.cfg.clampKarmaPerAction);

    // 2) Compute Dharma per action (independent vector, not just "negative karma")
    // Dharma is higher when:
    // - deviating from dominant pattern
    // - acting with more delay (less reactive)
    // - choosing restraint (if provided: voluntary + a.type != CAPTURE when capture was possible)
    const { dominant, share } = this.computeRollingPattern(action.actor, action.turn, sig);
    const isDeviating = dominant ? sig !== dominant : true;
    const deviation = isDeviating ? 1 : 0;

    const delay = typeof action.reactionDelayMs === "number" ? action.reactionDelayMs : this.cfg.reactionWindowMs * 0.5;
    const delayScore = clamp01(delay / this.cfg.reactionWindowMs); // 0..1 (higher delay => more dharmic)

    const restraintFlag = action.voluntary === true && action.type !== "CAPTURE";
    const restraint = restraintFlag ? 1 : 0;

    let dharmaDelta =
      deviation * this.cfg.dharmaDeviationBoost +
      delayScore * this.cfg.dharmaDelayBoost +
      restraint * this.cfg.dharmaRestraintBoost;

    // Dharma shouldn't spike on CAPTURE (doctrine: capture is karma, not dharma)
    if (action.type === "CAPTURE") dharmaDelta *= 0.15;

    dharmaDelta = clamp(dharmaDelta, 0, this.cfg.clampDharmaPerAction);

    // 3) Apply
    ps.karmaTotal += karmaDelta;
    ps.dharmaTotal += dharmaDelta;

    // 4) Update rolling aggregates & level triggers
    this.updateRollingRates(ps, action.turn);
    this.updateLevel(ps);

    return this.snapshot(action.turn);
  }

  snapshot(turn: number = this.lastTurn): EngineSnapshot {
    const lastActions = this.actions.slice(-20);
    return {
      turn,
      players: structuredClone(this.playerStates),
      lastActions: structuredClone(lastActions),
    };
  }

  // ---------- internals ----------

  private getWindowActions(playerId: PlayerId, turn: number): GameAction[] {
    const tMin = Math.max(0, turn - this.cfg.windowTurns + 1);
    return this.actions.filter(a => a.actor === playerId && a.turn >= tMin && a.turn <= turn && a.type !== "TURN_END");
  }

  private computeRollingPattern(playerId: PlayerId, turn: number, latestSig?: string): { dominant?: string; share: number; density: number } {
    const window = this.getWindowActions(playerId, turn);
    const sigs = window.map(actionSignature);
    if (latestSig) sigs.push(latestSig);

    const { dominant, share } = computeDominantShare(sigs);
    const density = computePatternDensity(sigs, share);

    const ps = this.playerStates[playerId];
    ps.dominantSignature = dominant;
    ps.dominantSignatureShare = share;
    ps.patternDensity = density;

    // stabilization: if density remains above threshold, count consecutive turns
    if (density >= this.cfg.mirrorTriggerPatternDensity && sigs.length >= this.cfg.minActionsForPattern) {
      ps.stabilizedTurns += 1;
    } else {
      ps.stabilizedTurns = 0;
    }

    return { dominant, share, density };
  }

  private updateRollingRates(ps: PlayerState, turn: number) {
    // Approximate: compute per-turn average over window
    const tMin = Math.max(0, turn - this.cfg.windowTurns + 1);
    const turnsInWindow = turn - tMin + 1;

    // We don’t store per-action deltas; approximate using totals delta in window by replaying window.
    // To keep it simple v1: estimate by totals / max(1, turnsPlayedSoFar) (coarse but stable).
    const turnsPlayed = Math.max(1, turn + 1);
    ps.karmaPerTurnAvg = ps.karmaTotal / turnsPlayed;
    ps.dharmaPerTurnAvg = ps.dharmaTotal / turnsPlayed;

    // Also refresh pattern with current window (without adding extra latestSig)
    this.computeRollingPattern(ps.playerId, turn);
  }

  private updateLevel(ps: PlayerState) {
    // Level A: free play, no forced reflection (we just compute silently)
    // Level B: Mirror is activated voluntarily OR after pattern stabilization/rate triggers.
    // Level C: Liberation when dharma becomes central and sustained.

    if (ps.level === "A_SURFACE") {
      const mirrorByStabilization =
        ps.stabilizedTurns >= this.cfg.stabilizationTurns &&
        ps.patternDensity >= this.cfg.mirrorTriggerPatternDensity;

      const mirrorByKarmaRate = ps.karmaPerTurnAvg >= this.cfg.mirrorTriggerKarmaRate;

      if (mirrorByStabilization || mirrorByKarmaRate) {
        ps.level = "B_MIRROR";
      }
    }

    if (ps.level === "B_MIRROR") {
      const liberationByDharmaRate = ps.dharmaPerTurnAvg >= this.cfg.liberationTriggerDharmaRate;
      // You can add additional condition: dharma must be rising while karma rate stabilizes.
      if (liberationByDharmaRate) {
        ps.level = "C_LIBERATION";
      }
    }

    // Level C stays; you could allow regression if you want later.
  }
}