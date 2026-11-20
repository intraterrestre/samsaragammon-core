// src/game/state/onlineGuard.ts — 20 nov 2026.
//
// Federico: "en las partidas a distancia, un jugador puede actuar como si
// fuera su rival". Fandango mostraba siempre el lado de quien tiene el
// turno, y las acciones de negociación no decían QUIÉN las hacía: desde el
// aparato del que espera se podía ofrecer, aceptar o rechazar en nombre
// del otro.
//
// Aquí vive, en un solo sitio y sin React, la regla "quién puede hacer
// esto ahora". La usan:
//   · App.tsx, en partidas a distancia: descarta cualquier acción de
//     negociación que no le toque al dueño de ese aparato.
//   · El reducer: ACCEPT/REFUSE llevan `by` y se rechazan si no es quien
//     recibió la propuesta (además de la regla de turno de siempre).
// Las reglas de negociación no cambian: solo se exige que quien actúa sea
// el jugador al que la regla ya le daba ese derecho.

import type { PlayerId } from "../types";
import type { Action } from "./reducer";

const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

type StateLike = {
  turn: PlayerId;
  pendingTrade?: { fromPlayer: PlayerId } | null;
  pendingSnakeBet?: { byPlayer: PlayerId } | null;
};

/**
 * Jugador al que la regla le permite hacer esta acción ahora mismo.
 * null = la acción no es de negociación (este guardia no opina) o no hay
 * nada que responder.
 */
export function negotiationActor(state: StateLike, action: Action): PlayerId | null {
  switch (action.type) {
    case "SEND_TRADE_OFFER":
    case "REQUEST_SNAKE_BET":
    case "DECLARE_DHARMA_777":
      return state.turn;
    case "ACCEPT_TRADE_OFFER":
    case "REFUSE_TRADE_OFFER":
      return state.pendingTrade ? other(state.pendingTrade.fromPlayer) : null;
    case "ACCEPT_SNAKE_BET":
    case "REFUSE_SNAKE_BET":
      return state.pendingSnakeBet ? other(state.pendingSnakeBet.byPlayer) : null;
    default:
      return null;
  }
}

const NEGOTIATION = new Set([
  "SEND_TRADE_OFFER",
  "ACCEPT_TRADE_OFFER",
  "REFUSE_TRADE_OFFER",
  "REQUEST_SNAKE_BET",
  "ACCEPT_SNAKE_BET",
  "REFUSE_SNAKE_BET",
  "DECLARE_DHARMA_777",
]);

/**
 * Partida a distancia: ¿puede el dueño de este aparato (`me`) mandar esta
 * acción? Para las de negociación exige que `me` sea quien la regla
 * autoriza, que sea su turno, y que el jugador que la acción declara
 * (`player` / `by`) sea él. Las demás acciones pasan (ya las filtran sus
 * propios botones y el reducer).
 */
export function onlineActionAllowed(state: StateLike, action: Action, me: PlayerId): boolean {
  if (!NEGOTIATION.has(action.type)) return true;
  const actor = negotiationActor(state, action);
  if (actor !== me) return false;
  if (state.turn !== me) return false;
  const declared = (action as { player?: PlayerId; by?: PlayerId }).player ?? (action as { by?: PlayerId }).by;
  return declared === undefined || declared === me;
}
