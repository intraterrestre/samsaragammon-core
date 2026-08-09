// src/game/victory/nirvana.ts
// Victory Architecture — hipótesis principal, RFC v1.1 CLEAN sección 6.
// Fase experimental 1 (sección 6.7): captura Avatar-vs-Avatar + stacks
// protegidos + formación física, con getNirvanaReadiness() como stub
// fijo en "READY" hasta validar en playtest si la carrera hacia Humans
// es, por sí sola, un final competitivo y divertido.
//
// Deliberadamente separado de src/game/orchestrator/Orchestrator.ts:
// el Orquestador decide CUÁNDO aparece el siguiente Avatar (progresión
// narrativa); este módulo decide CUÁNDO termina la partida (victoria).
// Son preguntas distintas y no deben vivir en el mismo archivo — ver
// D-013 / sección 1.3 de la RFC sobre por qué esa mezcla ya causó
// confusión una vez.

import type { GameState, PlayerId } from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { realmFromPos } from "../../UI/realm";

export type NirvanaReadiness = "NOT_READY" | "APPROACHING" | "READY";

/**
 * Preparación kármica del jugador para alcanzar Nirvana.
 *
 * STUB — Fase experimental 1 (RFC 6.7). Siempre "READY" a propósito:
 * las cuatro dimensiones de KarmicEvidence (venomBalance,
 * behavioralFlexibility, adversityAdaptation, conflictResponse) no se
 * implementan todavía. Primero se valida si la formación física por sí
 * sola (6 Avatares en Humans, con apilamiento protegido) produce un
 * final divertido. Conectar esas dimensiones reales es la Fase
 * experimental 2, posterior a ese playtest — no antes.
 */
// Firma estable a propósito: la Fase experimental 2 (RFC 6.7)
// implementará el cuerpo real usando ambos parámetros, sin tener que
// tocar cada lugar donde se llama a esta función.
export function getNirvanaReadiness(
  state: GameState,
  player: PlayerId
): NirvanaReadiness {
  void state;
  void player;
  return "READY";
}

/**
 * Puerta global: la victoria solo es posible una vez que el jugador
 * alcanzó la última etapa de progresión (Whitman). Antes de eso,
 * checkNirvana() debe devolver false aunque una formación equivalente
 * fuera posible por accidente (RFC sección 6.2 / 12 del documento de
 * Victory Architecture original).
 *
 * currentRealmStep >= 6 porque el Orquestador (evaluateOrchestrator)
 * deja de emitir REVEAL_NEXT_AVATAR exactamente en ese valor — 6 es el
 * paso de Whitman, el último de STEP_TO_TRANSITION.
 */
export function isVictoryEnabled(state: GameState, player: PlayerId): boolean {
  return state.realmProgress[player].currentRealmStep >= 6;
}

/**
 * Condición física de Nirvana: los 6 Avatares propios (uno por reino,
 * ver REALM_PIECE_ORDER), desbloqueados y fuera de Mara, ubicados
 * dentro del reino Humans (posiciones 12–15 del track de 24 casillas).
 *
 * No importa cómo se repartan entre las 4 casillas de Humans — 2+2+2,
 * 4+1+1, 3+3, etc. La geometría exacta es táctica emergente (stacks de
 * 2+ propios quedan protegidos frente al rival, ver la extensión de la
 * regla 0/1/2+ en reducer.ts), no una regla adicional aquí.
 */
export function checkNirvanaFormation(
  state: GameState,
  player: PlayerId
): boolean {
  const pieces = state.realmPieces[player];

  return REALM_PIECE_ORDER.every((kind) => {
    const piece = pieces[kind];
    return (
      !!piece &&
      piece.unlocked &&
      !piece.inLimbo &&
      realmFromPos(piece.pos) === "HUMAN"
    );
  });
}

/**
 * Nirvana = puerta de Whitman && formación física && preparación
 * kármica. Las tres en AND — ninguna sustituye a las otras dos.
 *
 * No compara Karma entre P1 y P2 (principio protegido P-001, RFC
 * sección 4): cada jugador satisface sus propias condiciones. Se
 * evalúa exclusivamente al final del turno del jugador activo — el
 * reducer es quien decide cuándo llamar a esta función, este módulo
 * no conoce el concepto de "turno".
 */
export function checkNirvana(state: GameState, player: PlayerId): boolean {
  if (!isVictoryEnabled(state, player)) return false;
  if (!checkNirvanaFormation(state, player)) return false;
  return getNirvanaReadiness(state, player) === "READY";
}
