// src/game/realm/realmEffects.ts
import type { PlayerId, CanonicalRealmId } from "../types";
import { canonicalRealmFromPos } from "../../UI/realm";

export type RealmEffectResult = {
  tier: number;
  realm: CanonicalRealmId;
  delta: number;
  label: string;
  applied: boolean;
  finalPos: number;
};

// v47 (13 agosto 2026) — cierre de deuda tecnica a pedido de Federico.
// Este archivo tenia su PROPIO REALMS[]/realmFromPos() local, un
// tercer mapeo posicion->reino independiente del de src/UI/realm.ts
// (ni siquiera coincidian entre si). Ademas su vocabulario
// ("HELL"/"HUNGRY_GHOST"/"TITANS"/"SEMIGODS") no era valido para el
// tipo Realm real de game/types.ts (ya daba error de TypeScript,
// TS2678, tratado como "ruido de siempre" en el baseline). Se
// reemplaza por canonicalRealmFromPos() — el unico traductor
// posicion->RealmPieceKind canonico — para que solo exista una fuente
// de verdad de "que reino es esta casilla" en todo el repo.
//
// Confirmado antes de este cambio: NINGUN caller usa realm/label de
// esta funcion (solo finalPos, ver getMoveOptionsForPlayer.ts), y
// TODOS los delta ya estaban en 0 — cero efecto de juego, antes y
// despues. Cambio de vocabulario/tipos unicamente.

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
  const realm = canonicalRealmFromPos(toPos);

  let delta = 0;
  let label = "—";

  switch (realm) {
    case "hell":
      delta = 0;
      label = "HELL drag";
      break;

    case "hungry_ghost":
      delta = 0;
      label = didCapture
        ? "HUNGRY GHOST quiet"
        : "HUNGRY GHOST hunger";
      break;

    case "animals":
      delta = 0;
      label = didCapture
        ? "ANIMALS still"
        : "ANIMALS rut";
      break;

    case "humans":
      delta = 0;
      label = "HUMANS agency";
      break;

    case "asura":
      delta = 0;
      label = didCapture ? "TITANS surge" : "TITANS idle";
      break;

    case "deva":
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
