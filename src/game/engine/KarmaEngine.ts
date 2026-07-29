// src/game/engine/KarmaEngine.ts
// Samsaragammon – Karma Engine v2
// v2: añade modificación de intensidad por Avatar + Veneno

import {
  getVenomKarmaWeight,
  type ActorId,
  type VenomId,
} from "../actors/actorProfiles";

export type PlayerId = string;

export type ActionType =
  | "MOVE"
  | "CAPTURE"
  | "PASS"
  | "SPECIAL"
  | "TURN_END";

export interface GameAction {
  id: string;
  t: number;
  turn: number;
  actor: PlayerId;
  target?: PlayerId;
  type: ActionType;

  // Contexto semántico existente
  realm?: string;
  posKey?: string;
  moveKey?: string;
  intensity?: number;
  reactionDelayMs?: number;
  voluntary?: boolean;
  note?: string;

  // v2: Avatar y Veneno que generaron esta acción
  // El peso kármico varía según quién actúa y desde qué fuerza
  avatarId?: ActorId;
  venomUsed?: VenomId;
}

export type LayerLevel = "A_SURFACE" | "B_MIRROR" | "C_LIBERATION";

export interface KarmaConfig {
  wCapture: number;
  wMove: number;
  wSpecial: number;
  wPass: number;

  reactionWindowMs: number;
  reactivityExponent: number;

  windowTurns: number;
  minActionsForPattern: number;

  repetitionExponent: number;
  entanglementExponent: number;
  entanglementScale: number;

  mirrorTriggerPatternDensity: number;
  mirrorTriggerKarmaRate: number;
  liberationTriggerDharmaRate: number;
  stabilizationTurns: number;

  dharmaDeviationBoost: number;
  dharmaRestraintBoost: number;
  dharmaDelayBoost: number;

  clampKarmaPerAction: number;
  clampDharmaPerAction: number;
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
  entanglementScale: 0.15,

  mirrorTriggerPatternDensity: 0.42,
  mirrorTriggerKarmaRate: 0.9,
  liberationTriggerDharmaRate: 0.6,
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

  karmaPerTurnAvg: number;
  dharmaPerTurnAvg: number;

  patternDensity: number;
  dominantSignature?: string;
  dominantSignatureShare?: number;
  stabilizedTurns: number;

  entanglementByTarget: Record<PlayerId, number>;
}

export interface EngineSnapshot {
  turn: number;
  players: Record<PlayerId, PlayerState>;
  lastActions: GameAction[];
}

const clamp01 = (x: number) =>
  Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(x) ? x : min));

function baseIntensityFor(action: GameAction, cfg: KarmaConfig): number {
  // Intensidad base según tipo de acción
  const base =
    typeof action.intensity === "number"
      ? clamp01(action.intensity)
      : action.type === "CAPTURE"
      ? cfg.wCapture
      : action.type === "MOVE"
      ? cfg.wMove
      : action.type === "SPECIAL"
      ? cfg.wSpecial
      : action.type === "PASS"
      ? cfg.wPass
      : 0.2;

  // v2: modificar por Avatar + Veneno
  // Bruno + Cerdo = ignorancia pura = peso 1.4x
  // Whitman + Cerdo = ignorancia casi eliminada = peso 0.4x
  if (action.avatarId && action.venomUsed) {
    const modifier = getVenomKarmaWeight(action.avatarId, action.venomUsed);
    return clamp01(base * modifier);
  }

  return base;
}

function computeReactivity(action: GameAction, cfg: KarmaConfig): number {
  const d = action.reactionDelayMs;
  if (typeof d !== "number" || d < 0) return 0.5;
  const x = clamp01(1 - d / cfg.reactionWindowMs);
  return Math.pow(x, cfg.reactivityExponent);
}

function actionSignature(a: GameAction): string {
  const parts: string[] = [a.type];
  if (a.moveKey) parts.push(`m:${a.moveKey}`);
  if (a.posKey) parts.push(`p:${a.posKey}`);
  if (a.realm) parts.push(`r:${a.realm}`);
  if (a.type === "CAPTURE" && a.target) parts.push(`t:${a.target}`);
  // v2: incluir Avatar y Veneno en la firma para detectar patrones más ricos
  if (a.avatarId) parts.push(`av:${a.avatarId}`);
  if (a.venomUsed) parts.push(`vn:${a.venomUsed}`);
  return parts.join("|");
}

function computeDominantShare(signatures: string[]): {
  dominant?: string;
  share: number;
} {
  if (signatures.length === 0) return { dominant: undefined, share: 0 };
  const counts = new Map<string, number>();
  for (const s of signatures) counts.set(s, (counts.get(s) ?? 0) + 1);

  let dominant: string | undefined;
  let max = 0;
  for (const [k, v] of counts.entries()) {
    if (v > max) {
      max = v;
      dominant = k;
    }
  }
  return { dominant, share: max / signatures.length };
}

export class KarmaEngine {
  private cfg: KarmaConfig;
  private actions: GameAction[] = [];
  private playerStates: Record<PlayerId, PlayerState> = {};
  private lastTurn = 0;

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

    // v2: intensidad modificada por Avatar + Veneno
    const I = baseIntensityFor(action, this.cfg);
    const R = computeReactivity(action, this.cfg);

    const sig = actionSignature(action);
    const window = this.getWindowActions(action.actor, action.turn);
    const sigCount =
      window.filter((a) => actionSignature(a) === sig).length + 1;
    const F = Math.pow(sigCount, this.cfg.repetitionExponent);

    let E = 0;
    if (action.type === "CAPTURE" && action.target) {
      const prev = ps.entanglementByTarget[action.target] ?? 0;
      const next = prev + 1;
      ps.entanglementByTarget[action.target] = next;
      E =
        Math.pow(next, this.cfg.entanglementExponent) *
        this.cfg.entanglementScale;
    }

    let karmaDelta = 0;
    if (action.type === "CAPTURE") {
      karmaDelta = R * F * I + E;
    } else {
      karmaDelta = R * F * I * 0.35;
    }
    karmaDelta = clamp(karmaDelta, 0, this.cfg.clampKarmaPerAction);

    const { dominant, share, density } = this.computeRollingPattern(
      action.actor,
      action.turn,
      sig
    );

    const isDeviating = dominant ? sig !== dominant : true;
    const deviation = isDeviating ? 1 : 0;

    const delay =
      typeof action.reactionDelayMs === "number"
        ? action.reactionDelayMs
        : this.cfg.reactionWindowMs * 0.5;
    const delayScore = clamp01(delay / this.cfg.reactionWindowMs);

    const restraintFlag =
      action.voluntary === true && action.type !== "CAPTURE";
    const restraint = restraintFlag ? 1 : 0;

    let dharmaDelta =
      deviation * this.cfg.dharmaDeviationBoost +
      delayScore * this.cfg.dharmaDelayBoost +
      restraint * this.cfg.dharmaRestraintBoost;

    if (action.type === "CAPTURE") dharmaDelta *= 0.15;
    dharmaDelta = clamp(dharmaDelta, 0, this.cfg.clampDharmaPerAction);

    ps.karmaTotal += karmaDelta;
    ps.dharmaTotal += dharmaDelta;

    const turnsPlayed = Math.max(1, action.turn + 1);
    ps.karmaPerTurnAvg = ps.karmaTotal / turnsPlayed;
    ps.dharmaPerTurnAvg = ps.dharmaTotal / turnsPlayed;

    ps.dominantSignature = dominant;
    ps.dominantSignatureShare = share;
    ps.patternDensity = density;

    this.updateLevel(ps);

    return this.snapshot(action.turn);
  }

  snapshot(turn: number = this.lastTurn): EngineSnapshot {
    return {
      turn,
      players: structuredClone(this.playerStates),
      lastActions: structuredClone(this.actions.slice(-20)),
    };
  }

  private getWindowActions(playerId: PlayerId, turn: number): GameAction[] {
    const tMin = Math.max(0, turn - this.cfg.windowTurns + 1);
    return this.actions.filter(
      (a) =>
        a.actor === playerId &&
        a.turn >= tMin &&
        a.turn <= turn &&
        a.type !== "TURN_END"
    );
  }

  private computeRollingPattern(
    playerId: PlayerId,
    turn: number,
    latestSig?: string
  ): { dominant?: string; share: number; density: number } {
    const window = this.getWindowActions(playerId, turn);
    const sigs = window.map(actionSignature);
    if (latestSig) sigs.push(latestSig);

    const { dominant, share } = computeDominantShare(sigs);
    const density = clamp01(share);

    const ps = this.playerStates[playerId];
    if (
      density >= this.cfg.mirrorTriggerPatternDensity &&
      sigs.length >= this.cfg.minActionsForPattern
    ) {
      ps.stabilizedTurns += 1;
    } else {
      ps.stabilizedTurns = 0;
    }

    return { dominant, share, density };
  }

  private updateLevel(ps: PlayerState) {
    if (ps.level === "A_SURFACE") {
      const mirrorByStabilization =
        ps.stabilizedTurns >= this.cfg.stabilizationTurns &&
        ps.patternDensity >= this.cfg.mirrorTriggerPatternDensity;

      const mirrorByKarmaRate =
        ps.karmaPerTurnAvg >= this.cfg.mirrorTriggerKarmaRate;

      if (mirrorByStabilization || mirrorByKarmaRate) {
        ps.level = "B_MIRROR";
      }
    }

    if (ps.level === "B_MIRROR") {
      if (ps.dharmaPerTurnAvg >= this.cfg.liberationTriggerDharmaRate) {
        ps.level = "C_LIBERATION";
      }
    }
  }
}
