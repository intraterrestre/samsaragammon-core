// src/game/dharma777.ts
// v83 (1 septiembre 2026) — Dharma 777, decisión de diseño cerrada con
// Federico/Chat. Hermana de Snake Bet (666), pero instantánea y sin
// estado persistente: en vez de "apuesto que voy a morder", es "podía
// morder y decidí no hacerlo". Ver reducer.ts, case DECLARE_DHARMA_777.
import type { GameState, MoveOption, PlayerId, RealmPieceKind } from "./types";
import { REALM_PIECE_ORDER } from "./types";
import { realmFromPos } from "../UI/realm";

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

/**
 * Devuelve el tipo de Avatar rival que se capturaría con `option`, SOLO
 * si las tres condiciones de entrada se cumplen a la vez:
 *   1. la opción es una captura real (meaning === "IMPACT");
 *   2. lo que se capturaría es específicamente un Avatar, no un Veneno
 *      (IMPACT por sí solo no distingue los dos — ver
 *      countEnemyPiecesAtPos en getMoveOptionsForPlayer.ts, que suma
 *      ambos para ese conteo);
 *   3. ese Avatar está físicamente en Humans;
 *   4. Whitman ya existe para ese rival (currentRealmStep === 6) — "es
 *      cuando duele ir a Mara", decisión explícita de Federico.
 * Si cualquiera falla, null — no hay nada que perdonar.
 */
export function getDharma777Opportunity(
  state: GameState,
  player: PlayerId,
  option: MoveOption
): RealmPieceKind | null {
  if (option.meaning !== "IMPACT") return null;

  const rival = otherPlayer(player);

  const capturedAvatar = REALM_PIECE_ORDER.find((kind) => {
    const piece = state.realmPieces[rival]?.[kind];
    return (
      piece && piece.unlocked && !piece.inLimbo && piece.pos === option.toPos
    );
  });
  if (!capturedAvatar) return null; // era un Veneno, no un Avatar — no aplica

  if (realmFromPos(option.toPos) !== "HUMAN") return null;
  if (state.realmProgress[rival].currentRealmStep !== 6) return null;

  return capturedAvatar;
}

/**
 * Avatares PROPIOS elegibles para consolidar con Dharma 777 en este
 * instante: físicamente en Humans, todavía no consolidated. La UI usa
 * esto para decidir si ofrece Dharma en absoluto (0 = no se ofrece),
 * preseleccionar automáticamente (1) o pedir elegir (más de 1) — mismo
 * dato que también revalida el reducer antes de aplicar la acción.
 */
export function getDharma777EligibleTargets(
  state: GameState,
  player: PlayerId
): RealmPieceKind[] {
  return REALM_PIECE_ORDER.filter((kind) => {
    const piece = state.realmPieces[player]?.[kind];
    if (!piece || !piece.unlocked || piece.inLimbo) return false;
    if (realmFromPos(piece.pos) !== "HUMAN") return false;
    if (state.consolidatedAvatars[player]?.[kind]) return false;
    return true;
  });
}
