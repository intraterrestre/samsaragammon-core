// src/game/realm/realmEffects.ts
import type { PlayerId, Realm } from "../types";

export type RealmEffectResult = {
  tier: number;
  realm: Realm;
  delta: number;           // how many squares to shift (can be negative)
  label: string;           // short UI label
  applied: boolean;
};

/** Canonical 6 realms (6×4 = 24). Keep consistent with your board mapping. */
const REALMS: Realm[] = ["NARAKA", "PRETA", "ANIMAL", "HUMAN", "ASURA", "DEVA"];

export function realmFromPos(pos: number): Realm {
  const idx = Math.max(0, Math.min(5, Math.floor(pos / 4)));
  return REALMS[idx] ?? "HUMAN";
}

export function tierFromLevel(level: number): number {
  if (level >= 7) return 3;
  if (level >= 5) return 2;
  if (level >= 3) return 1;
  return 0;
}

function wrap(pos: number, size: number) {
  return ((pos % size) + size) % size;
}

/**
 * Realm effect is applied AFTER the base move is resolved.
 * We keep it deterministic: a shift forward/back based on realm + capture.
 */
export function applyRealmEffect(params: {
  level: number;
  trackSize: number;
  toPos: number;           // landing position after base move
  didCapture: boolean;
  mover: PlayerId;
}): RealmEffectResult & { finalPos: number } {
  const { level, trackSize, toPos, didCapture } = params;
  const tier = tierFromLevel(level);
  const realm = realmFromPos(toPos);

  if (tier === 0) {
    return { tier, realm, delta: 0, label: "—", applied: false, finalPos: toPos };
  }

  // Progressive strength: delta scales with tier.
  // Rules (simple, readable, and feels like "gravity"):
  // NARAKA: pulls back always
  // PRETA: pulls forward if you didn't capture (hunger chasing)
  // ANIMAL: pulls back if you didn't capture (instinct stagnation)
  // HUMAN: small forward nudge always (agency)
  // ASURA: forward surge if you captured (war momentum)
  // DEVA: forward nudge if you didn't capture (blessing, but not predatory)
  let delta = 0;
  let label = "";

  switch (realm) {
    case "NARAKA":
      delta = -tier;
      label = `NARAKA drag (-${tier})`;
      break;

    case "PRETA":
      delta = didCapture ? 0 : tier;
      label = didCapture ? "PRETA quiet (0)" : `PRETA hunger (+${tier})`;
      break;

    case "ANIMAL":
      delta = didCapture ? 0 : -tier;
      label = didCapture ? "ANIMAL still (0)" : `ANIMAL rut (-${tier})`;
      break;

    case "HUMAN":
      delta = +1; // keep it subtle even at high tiers
      label = "HUMAN agency (+1)";
      break;

    case "ASURA":
      delta = didCapture ? tier : 0;
      label = didCapture ? `ASURA surge (+${tier})` : "ASURA idle (0)";
      break;

    case "DEVA":
      delta = didCapture ? 0 : 1; // always gentle
      label = didCapture ? "DEVA veil (0)" : "DEVA blessing (+1)";
      break;

    default:
      delta = 0;
      label = "—";
  }

  const finalPos = wrap(toPos + delta, trackSize);
  const applied = delta !== 0;

  return { tier, realm, delta, label, applied, finalPos };
}