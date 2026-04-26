// src/game/realm/realmEffects.ts
import type { PlayerId, Realm } from "../types";

export type RealmEffectResult = {
  tier: number;
  realm: Realm;
  delta: number;
  label: string;
  applied: boolean;
  finalPos: number;
};

/**
 * 6 reinos × 4 casillas = 24
 */
const REALMS: Realm[] = [
  "HELL",
  "HUNGRY_GHOST",
  "ANIMALS",
  "HUMANS",
  "TITANS",
  "SEMIGODS",
];

export function realmFromPos(pos: number): Realm {
  const idx = Math.max(0, Math.min(5, Math.floor(pos / 4)));
  return REALMS[idx] ?? "HUMANS";
}

export function tierFromLevel(level: number): number {
  if (level >= 7) return 3;
  if (level >= 5) return 2;
  if (level >= 3) return 1;
  return 0;
}

function wrap(pos: number, size: number): number {
  return ((pos % size) + size) % size;
}

/**
 * El reino ya NO mueve físicamente la ficha.
 * Solo interpreta la caída.
 */
export function applyRealmEffect(params: {
  level: number;
  trackSize: number;
  toPos: number;
  didCapture: boolean;
  mover: PlayerId;
}): RealmEffectResult {
  const { level, trackSize, toPos, didCapture } = params;
  const tier = tierFromLevel(level);
  const realm = realmFromPos(toPos);

  let delta = 0;
  let label = "—";

  switch (realm) {
    case "HELL":
      delta = 0;
      label = "HELL drag";
      break;

    case "HUNGRY_GHOST":
      delta = 0;
      label = didCapture
        ? "HUNGRY GHOST quiet"
        : "HUNGRY GHOST hunger";
      break;

    case "ANIMALS":
      delta = 0;
      label = didCapture
        ? "ANIMALS still"
        : "ANIMALS rut";
      break;

    case "HUMANS":
      delta = 0;
      label = "HUMANS agency";
      break;

    case "TITANS":
      delta = 0;
      label = didCapture ? "TITANS surge" : "TITANS idle";
      break;

    case "SEMIGODS":
      delta = 0;
      label = didCapture ? "SEMIGODS veil" : "SEMIGODS blessing";
      break;

    default:
      delta = 0;
      label = "—";
      break;
  }

  const finalPos = wrap(toPos + delta, trackSize);
  const applied = delta !== 0;

  return {
    tier,
    realm,
    delta,
    label,
    applied,
    finalPos,
  };
}