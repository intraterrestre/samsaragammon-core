// src/game/bot/buddhaBot.ts — el cerebro de Buddha cuando juega contra ti
// en JUEGA CON BUDDHA (15 nov 2026, pedido de Federico: "que el bot sea
// Buddha, así va más natural").
//
// Cómo decide: pide al motor TODAS las jugadas legales (getAllLegalMoves,
// la misma fuente que valida CONSCIOUS_MOVE), aplica cada una con el
// reducer real sobre una copia del estado y puntúa el resultado. No hay
// trampas: no ve dados futuros ni toca el azar, solo elige entre lo que
// el jugador humano también podría elegir.
//
// Niveles:
//   easy   — Buddha maestro: muchas veces juega algo cualquiera.
//   normal — juega con criterio, pero con margen de error.
//   hard   — siempre lo mejor que encuentra, y mira qué te deja a ti
//            (la mejor respuesta del rival con cada tirada posible).

import { analyzeTrade, nidanaLinkLows, nidanaNumber } from "../rules/nidanaLink";
import type { NidanaId } from "../nidanas";
import { reducer } from "../state/reducer";
import { getMoveOptionsForPlayer } from "../rules/getMoveOptionsForPlayer";
import { getAllLegalMoves, type LegalMove } from "../rules/legalMoves";
import { previewMove } from "../rules/preview";
import { realmFromPos } from "../../UI/realm";
import { REALM_PIECE_ORDER } from "../types";
import type { BasePieceKind, GameState, MoveOption, PlayerId, RealmPieceKind } from "../types";
import { getDharma777Opportunity, getDharma777EligibleTargets } from "../dharma777";

export type BotLevel = "easy" | "normal" | "hard";
export const BOT_LEVELS: BotLevel[] = ["easy", "normal", "hard"];

const VENOMS: BasePieceKind[] = ["pig", "snake", "rooster"];
const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const dirOf = (p: PlayerId) => (p === "P1" ? "clockwise" : "counterclockwise");
const isHuman = (pos: number) => realmFromPos(pos) === "HUMAN";

/** Pasos (en la dirección del jugador) hasta la primera casilla de Humanos. */
function distToHumans(pos: number, p: PlayerId, track: number): number {
  if (isHuman(pos)) return 0;
  for (let k = 1; k < track; k++) {
    if (isHuman(previewMove(pos, k, track, dirOf(p)))) return k;
  }
  return track;
}

/** Cuántas distancias de dado (1..6) dejan a alguna ficha rival justo encima de `pos`. */
function threatsOn(s: GameState, pos: number, owner: PlayerId): number {
  const opp = other(owner);
  const origins: number[] = [];
  for (const v of VENOMS) {
    const pc = s.pieces[opp][v];
    if (pc && !pc.inLimbo) origins.push(pc.pos);
  }
  let hits = 0;
  for (let d = 1; d <= 6; d++) {
    if (origins.some((o) => previewMove(o, d, s.trackSize, dirOf(opp)) === pos)) hits++;
  }
  return hits;
}

function sideScore(s: GameState, p: PlayerId): number {
  let score = 0;
  const track = s.trackSize;
  const avatars = s.realmPieces[p] ?? {};
  const occupancy = new Map<number, number>();
  for (const kind of REALM_PIECE_ORDER) {
    const a = avatars[kind];
    if (a && a.unlocked && !a.inLimbo) occupancy.set(a.pos, (occupancy.get(a.pos) ?? 0) + 1);
  }

  for (const kind of REALM_PIECE_ORDER) {
    const a = avatars[kind];
    if (!a || !a.unlocked) continue;
    if (a.inLimbo) {
      score -= 35;
      continue;
    }
    if (isHuman(a.pos)) {
      score += 45;
      if (s.consolidatedAvatars?.[p]?.[kind]) score += 70;
      continue;
    }
    score += (track - distToHumans(a.pos, p, track)) * 2.2;
    if (a.everCaptured) score -= 8; // ya no florecerá solo al llegar
    const stacked = (occupancy.get(a.pos) ?? 0) >= 2;
    if (stacked) score += 6;
    else score -= threatsOn(s, a.pos, p) * 5;
  }

  for (const v of VENOMS) {
    const pc = s.pieces[p][v];
    if (!pc) continue;
    if (pc.inLimbo) score -= 8;
    else score += (track - distToHumans(pc.pos, p, track)) * 0.25;
  }
  return score;
}

/** Puntuación del estado desde el punto de vista de `p` (más alto = mejor para p). */
export function evaluate(s: GameState, p: PlayerId): number {
  if (s.winner === p) return 100000;
  if (s.winner === other(p)) return -100000;
  return sideScore(s, p) - sideScore(s, other(p));
}

/**
 * Una acción de Buddha en su turno ya tirado: una jugada normal, o
 * Round Dharma 777 (renunciar a una captura en Humanos para que florezca
 * uno de sus Avatares) — es la única vía que Buddha tiene para consolidar
 * un Avatar que ya fue capturado alguna vez.
 */
export type BotAction =
  | { kind: "move"; move: LegalMove }
  | { kind: "dharma777"; move: LegalMove; target: RealmPieceKind };

function withSelection(s: GameState, p: PlayerId, m: LegalMove): GameState {
  return {
    ...s,
    selectedPiece: { ...s.selectedPiece, [p]: m.avatar ?? m.option.pieceKind },
    selectedVenom: { ...s.selectedVenom, [p]: m.avatar ? m.venom : null },
  };
}

/** Aplica una jugada legal igual que la UI: selección (Avatar + Veneno) y CONSCIOUS_MOVE. */
export function applyLegalMove(s: GameState, p: PlayerId, m: LegalMove): GameState {
  const selected = withSelection(s, p, m);
  const allOptions = getMoveOptionsForPlayer(selected, p);
  return reducer(selected, { type: "CONSCIOUS_MOVE", option: m.option, allOptions } as never);
}

export function applyBotAction(s: GameState, p: PlayerId, a: BotAction): GameState {
  if (a.kind === "move") return applyLegalMove(s, p, a.move);
  const selected = withSelection(s, p, a.move);
  const allOptions = getMoveOptionsForPlayer(selected, p);
  return reducer(selected, {
    type: "DECLARE_DHARMA_777",
    player: p,
    option: a.move.option,
    allOptions,
    targetAvatar: a.target,
  } as never);
}

/** Todas las acciones posibles: cada jugada legal y, si procede, sus Dharma 777. */
export function getBotActions(s: GameState, p: PlayerId): BotAction[] {
  const actions: BotAction[] = [];
  const targets = getDharma777EligibleTargets(s, p);
  for (const move of getAllLegalMoves(s, p)) {
    actions.push({ kind: "move", move });
    if (targets.length === 0) continue;
    const selected = withSelection(s, p, move);
    if (!getDharma777Opportunity(selected, p, move.option as MoveOption)) continue;
    for (const target of targets) actions.push({ kind: "dharma777", move, target });
  }
  return actions;
}

/** Antes de que nazca Bruno, el tutorial pide mover los tres animales: Buddha da ejemplo. */
function tutorialBonus(s: GameState, p: PlayerId, a: BotAction): number {
  const m = a.move;
  if (s.brunoRevealed || m.avatar) return 0;
  const sig = s.decisionSignature?.[p];
  if (!sig) return 0;
  const trace = { pig: sig.pigTrace, snake: sig.snakeTrace, rooster: sig.roosterTrace } as Record<string, number>;
  return trace[m.option.pieceKind] === 0 ? 25 : 0;
}

// Las 21 tiradas distintas, con su peso (dobles 1/36, el resto 2/36).
const ROLLS: { a: number; b: number; w: number }[] = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push({ a, b, w: a === b ? 1 : 2 });

/** Media (sobre las 36 tiradas) de la peor situación que la mejor respuesta del rival le deja a `me`. */
function opponentReply(s: GameState, me: PlayerId): number {
  if (s.winner || s.turn === me) return evaluate(s, me);
  const opp = s.turn;
  let total = 0;
  for (const r of ROLLS) {
    const rolled: GameState = { ...s, phase: "rolled", rollOptions: [r.a, r.b] } as GameState;
    const moves = getAllLegalMoves(rolled, opp);
    if (moves.length === 0) {
      total += r.w * evaluate(s, me);
      continue;
    }
    let worst = Infinity;
    for (const m of moves) {
      worst = Math.min(worst, evaluate(applyLegalMove(rolled, opp, m), me));
    }
    total += r.w * worst;
  }
  return total / 36;
}

export type BotChoice = { action: BotAction; score: number } | null;

/**
 * Elige la acción de Buddha para el estado actual (fase "rolled", turno de `p`).
 * Devuelve null si no hay ninguna jugada legal (→ PASS_NO_MOVES).
 */
export function chooseBotMove(
  s: GameState,
  p: PlayerId,
  level: BotLevel,
  rand: () => number = Math.random
): BotChoice {
  const actions = getBotActions(s, p);
  if (actions.length === 0) return null;
  if (actions.length === 1) return { action: actions[0], score: 0 };

  const plainMoves = actions.filter((a) => a.kind === "move");
  if (level === "easy" && rand() < 0.5) {
    return { action: plainMoves[Math.floor(rand() * plainMoves.length)], score: 0 };
  }
  if (level === "normal" && rand() < 0.12) {
    return { action: plainMoves[Math.floor(rand() * plainMoves.length)], score: 0 };
  }

  const noise = level === "easy" ? 25 : level === "normal" ? 6 : 0;
  const scored = actions.map((a) => {
    const after = applyBotAction(s, p, a);
    let score = evaluate(after, p) + tutorialBonus(s, p, a);
    if (noise) score += (rand() * 2 - 1) * noise;
    return { action: a, after, score };
  });
  scored.sort((x, y) => y.score - x.score);

  if (level !== "hard") return { action: scored[0].action, score: scored[0].score };

  // Difícil: de las mejores 4, la que mejor aguanta la respuesta del rival.
  let best = scored[0];
  let bestValue = -Infinity;
  for (const c of scored.slice(0, 4)) {
    const v =
      c.after.winner === p
        ? 100000
        : opponentReply(c.after, p) + tutorialBonus(s, p, c.action);
    if (v > bestValue) {
      bestValue = v;
      best = c;
    }
  }
  return { action: best.action, score: bestValue };
}

/** Buddha ante una apuesta Square Karma 666 que le pides: siempre acepta (es tu vía para que florezca un Avatar capturado). */
export function botAnswersSnakeBet(): "accept" {
  return "accept";
}

/**
 * Buddha ante un trato de Nidanas en el Karma Chat Fandango (20 nov 2026,
 * estrategia sencilla aprobada por Federico; la misma de la simulación):
 *   Fácil   acepta todo.
 *   Normal  acepta si el trato no le rompe un enlace.
 *   Difícil además rechaza si el trato te da un enlace a ti y a él no.
 */
export function botAnswersTrade(
  level: BotLevel,
  s?: GameState,
  bot?: PlayerId
): "accept" | "refuse" {
  if (level === "easy" || !s || !bot || !s.pendingTrade) return "accept";
  const trade = s.pendingTrade;
  const human: PlayerId = bot === "P1" ? "P2" : "P1";
  // Buddha entrega trade.want y recibe trade.offer.
  const fx = analyzeTrade(s.avatarNidana[bot], s.avatarNidana[human], trade.want, trade.offer);
  if (fx.myLoss.length > 0) return "refuse";
  if (level === "hard" && fx.rivalGain.length > 0 && fx.myGain.length === 0) return "refuse";
  return "accept";
}

/**
 * Buddha propone un trato (en su turno, si no hay ninguno pendiente):
 * pide una Nidana tuya que le complete un enlace y que no forme parte de
 * uno tuyo, y ofrece una suya que no esté en ningún enlace suyo ni
 * apostada. null = no propone nada. `refused` = pares ya rechazados en
 * esta partida (no insiste con lo mismo).
 */
export function botProposeTrade(
  s: GameState,
  bot: PlayerId,
  refused: ReadonlySet<string> = new Set()
): { offer: NidanaId; want: NidanaId } | null {
  if (s.pendingTrade) return null;
  const human: PlayerId = bot === "P1" ? "P2" : "P1";
  const staked = new Set<NidanaId>([...(s.snakeBet?.stake ?? []), ...(s.pendingSnakeBet?.stake ?? [])]);
  const mine = Object.values(s.avatarNidana[bot] ?? {}).filter(Boolean) as NidanaId[];
  const theirs = Object.values(s.avatarNidana[human] ?? {}).filter(Boolean) as NidanaId[];
  const inLinks = (lows: number[], id: NidanaId) => lows.some((l) => nidanaNumber(id) === l || nidanaNumber(id) === l + 1);
  const myLows = nidanaLinkLows(s.avatarNidana[bot]);
  const theirLows = nidanaLinkLows(s.avatarNidana[human]);
  const myNums = new Set(mine.map(nidanaNumber));
  for (const want of theirs) {
    const wn = nidanaNumber(want);
    if (!(myNums.has(wn - 1) || myNums.has(wn + 1))) continue;
    if (inLinks(theirLows, want) || staked.has(want)) continue;
    for (const offer of mine) {
      const on = nidanaNumber(offer);
      if (inLinks(myLows, offer) || staked.has(offer)) continue;
      if (on === wn - 1 || on === wn + 1) continue;
      if (refused.has(`${offer}|${want}`)) continue;
      return { offer, want };
    }
  }
  return null;
}
