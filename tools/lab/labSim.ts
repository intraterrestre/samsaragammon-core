// tools/lab/labSim.ts — laboratorio de partidas Buddha contra Buddha.
// 15 nov 2026. NO forma parte del juego (vive fuera de src/): usa el
// reducer real y el bot real, y mide qué pasa en partidas completas.
//
// Uso (tras empaquetar con esbuild): node labSim.cjs <variante> <nivelP1> <nivelP2> <partidas>
//   variante: base | apuestas | perdon | perdon+apuestas
//     base      reglas actuales; los bots no piden Square Karma
//     apuestas  cada bot pide Square Karma 666 siempre que puede (el rival acepta)
//     perdon    la PRIMERA captura de cada Avatar no le quita el loto
//     coste     (con apuestas) perder la apuesta cuesta 2 Nidanas al apostador,
//               y solo se apuesta si la Serpiente tiene a tiro un Avatar rival
//     rechazo   (con apuestas) el rival acepta solo la mitad de las veces
// Además mide decisiones por turno (jugadas distintas, jugadas razonables)
// y qué pasa en los últimos 100 turnos de las partidas largas.
// Imprime una línea JSON por partida.

import { reducer } from "../../src/game/state/reducer";
import { initialState } from "../../src/game/state/state";
import { chooseBotMove, applyBotAction, getBotActions, evaluate, type BotLevel } from "../../src/game/bot/buddhaBot";
import { previewMove } from "../../src/game/rules/preview";
import { realmFromPos } from "../../src/UI/realm";
import { REALM_PIECE_ORDER, type GameState, type PlayerId, type RealmPieceKind } from "../../src/game/types";

const [variant = "base", l1 = "normal", l2 = "normal", nStr = "10"] = process.argv.slice(2);
const bets = variant.includes("apuestas");
const forgive = variant.includes("perdon");
const betCost = variant.includes("coste");
const betRefuse = variant.includes("rechazo");
const REASONABLE = 10; // puntos de evaluación: ~4-5 casillas de progreso
const MAX_TURNS = 3000;
console.log = () => {};
console.warn = () => {};
console.info = () => {};

const PLAYERS: PlayerId[] = ["P1", "P2"];
const act = (s: GameState, a: object) => reducer(s, a as never);

function bloomedInHumans(s: GameState, p: PlayerId): number {
  return REALM_PIECE_ORDER.filter((k) => {
    const a = s.realmPieces[p]?.[k];
    return a && a.unlocked && !a.inLimbo && realmFromPos(a.pos) === "HUMAN" && s.consolidatedAvatars[p]?.[k];
  }).length;
}
function inHumans(s: GameState, p: PlayerId): number {
  return REALM_PIECE_ORDER.filter((k) => {
    const a = s.realmPieces[p]?.[k];
    return a && a.unlocked && !a.inLimbo && realmFromPos(a.pos) === "HUMAN";
  }).length;
}
const blooms = (s: GameState, p: PlayerId) => Object.values(s.consolidatedAvatars[p] ?? {}).filter(Boolean).length;

const dirOf = (p: PlayerId) => (p === "P1" ? "clockwise" : "counterclockwise");
/** ¿La Serpiente de p puede caer (con un dado 1..6) sobre un Avatar rival solo? */
function snakeHasTarget(s: GameState, p: PlayerId): boolean {
  const opp: PlayerId = p === "P1" ? "P2" : "P1";
  const sn = s.pieces[p].snake;
  if (!sn || sn.inLimbo) return false;
  const occ = new Map<number, number>();
  for (const k of REALM_PIECE_ORDER) { const a = s.realmPieces[opp]?.[k]; if (a && a.unlocked && !a.inLimbo) occ.set(a.pos, (occ.get(a.pos) ?? 0) + 1); }
  for (let d = 1; d <= 6; d++) { const to = previewMove(sn.pos, d, s.trackSize, dirOf(p)); if (occ.get(to) === 1) return true; }
  return false;
}
const carried = (s: GameState, p: PlayerId) => Object.entries(s.avatarNidana?.[p] ?? {}).filter(([, v]) => !!v).map(([k]) => k);

function playOne() {
  let s = { ...initialState, gameStartedAt: 1, gameId: "lab" } as GameState;
  s = act(s, { type: "SET_TUTORIAL_MODE", on: true });
  s = act(s, { type: "SET_GENESIS_UI_COMPLETE" });
  const levels: Record<PlayerId, BotLevel> = { P1: l1 as BotLevel, P2: l2 as BotLevel };
  const captureCount: Record<string, number> = {};
  const m = {
    turns: 0, winner: null as PlayerId | null,
    avatarCaptures: 0, venomCaptures: 0, passes: 0,
    d777Opportunities: 0, d777Used: 0,
    betsRequested: 0, betsWon: 0,
    allAvatarsAt: -1, // turno en que ambos tienen a Whitman
    firstK: { 1: -1, 2: -1, 3: -1, 4: -1, 5: -1, 6: -1 } as Record<number, number>,
    longestQuiet: 0, // racha más larga de turnos sin ningún "momento"
    quietTurns: 0, // turnos sin ningún "momento"
    quietStreaks: [] as number[],
    // decisiones
    decTurns: 0, legalSum: 0, distinctSum: 0, reasonableSum: 0,
    oneLegal: 0, oneDistinct: 0, oneReasonable: 0,
    // Square Karma
    betOpportunities: 0, betAttractive: 0, betsRefused: 0, betsLost: 0,
    // últimos 100 turnos (partidas > 500 turnos)
    tail: null as null | Record<string, number>,
  };
  const log: { ev: string[]; leaderMissing: string[] }[] = [];
  let quiet = 0;
  let turn = 0;
  while (!s.winner && turn < MAX_TURNS) {
    const p = s.turn;
    const opp: PlayerId = p === "P1" ? "P2" : "P1";
    const before = s;

    // Respuestas pendientes.
    if (s.pendingSnakeBet && s.pendingSnakeBet.byPlayer !== p) {
      if (betRefuse && Math.random() < 0.5) { s = act(s, { type: "REFUSE_SNAKE_BET" }); m.betsRefused++; }
      else s = act(s, { type: "ACCEPT_SNAKE_BET" });
    }
    if (s.pendingTrade && s.pendingTrade.fromPlayer !== p) s = act(s, { type: "REFUSE_TRADE_OFFER" });

    // Square Karma: ¿se puede pedir? ¿sería atractivo?
    if (!s.pendingSnakeBet && !s.snakeBet) {
      let target: RealmPieceKind | null = null;
      for (const k of REALM_PIECE_ORDER) {
        const t = act(s, { type: "REQUEST_SNAKE_BET", player: p, targetAvatar: k });
        if (t !== s && t.pendingSnakeBet) { target = k; break; }
      }
      if (target) {
        m.betOpportunities++;
        const attractive = snakeHasTarget(s, p);
        if (attractive) m.betAttractive++;
        if (bets && (!betCost || attractive)) {
          s = act(s, { type: "REQUEST_SNAKE_BET", player: p, targetAvatar: target });
          m.betsRequested++;
        }
      }
    }

    s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
    const actions = getBotActions(s, p);
    if (actions.some((a) => a.kind === "dharma777")) m.d777Opportunities++;
    if (actions.length > 0) {
      const scores = actions.map((a) => evaluate(applyBotAction(s, p, a), p));
      const best = Math.max(...scores);
      const distinct = new Set(actions.map((a) => `${a.kind}|${a.move.option.pieceKind}|${a.move.option.toPos}`)).size;
      const reasonable = scores.filter((v) => v >= best - REASONABLE).length;
      m.decTurns++; m.legalSum += actions.length; m.distinctSum += distinct; m.reasonableSum += reasonable;
      if (actions.length === 1) m.oneLegal++;
      if (distinct === 1) m.oneDistinct++;
      if (reasonable === 1) m.oneReasonable++;
    }
    const betBefore = s.snakeBet && s.snakeBet.byPlayer === p ? s.snakeBet : null;
    const choice = chooseBotMove(s, p, levels[p]);
    if (!choice) { s = act(s, { type: "PASS_NO_MOVES", player: p }); m.passes++; }
    else {
      if (choice.action.kind === "dharma777") m.d777Used++;
      const hadBet = !!s.snakeBet && s.snakeBet.byPlayer === p;
      const bloomsBefore = blooms(s, p);
      s = applyBotAction(s, p, choice.action);
      if (hadBet && !s.snakeBet && blooms(s, p) > bloomsBefore) m.betsWon++;
    }
    // Apuesta que expira sin ganarse: con "coste", el apostador pierde 2 Nidanas.
    if (betBefore && !s.snakeBet && !(blooms(s, p) > 0 && s.consolidatedAvatars[p]?.[betBefore.targetAvatar])) {
      m.betsLost++;
      if (betCost) {
        const lose = carried(s, p).slice(0, 2);
        const an = { ...(s.avatarNidana[p] ?? {}) } as Record<string, unknown>;
        for (const k of lose) an[k] = null;
        s = { ...s, avatarNidana: { ...s.avatarNidana, [p]: an } } as GameState;
      }
    }

    // Capturas y variante "perdón".
    let moment = false;
    const ev: string[] = [];
    for (const pl of PLAYERS) {
      for (const k of REALM_PIECE_ORDER) {
        const a0 = before.realmPieces[pl]?.[k];
        const a1 = s.realmPieces[pl]?.[k];
        if (!a1 || !a1.unlocked) continue;
        if ((!a0 || !a0.unlocked)) { moment = true; ev.push("nace"); } // nace un Avatar
        if (a0 && a0.unlocked && !a0.inLimbo && !a1.inLimbo && realmFromPos(a0.pos) === "HUMAN" && realmFromPos(a1.pos) !== "HUMAN") ev.push("saleHumanos");
        if (a0 && a0.unlocked && !a0.inLimbo && a1.inLimbo) {
          m.avatarCaptures++; moment = true; ev.push(realmFromPos(a0.pos) === "HUMAN" ? "capturaEnHumanos" : "captura");
          const key = pl + k;
          captureCount[key] = (captureCount[key] ?? 0) + 1;
          if (forgive && captureCount[key] === 1) {
            s = { ...s, realmPieces: { ...s.realmPieces, [pl]: { ...s.realmPieces[pl], [k]: { ...a1, everCaptured: false } } } } as GameState;
          }
        }
      }
      for (const v of ["pig", "snake", "rooster"] as const) {
        if (!before.pieces[pl][v].inLimbo && s.pieces[pl][v].inLimbo) m.venomCaptures++;
      }
      if (blooms(s, pl) > blooms(before, pl)) { moment = true; ev.push("loto"); }
      if (inHumans(s, pl) > inHumans(before, pl)) { moment = true; ev.push("llegaHumanos"); }
    }
    void opp;
    if (moment) { if (quiet > 0) m.quietStreaks.push(quiet); quiet = 0; } else { quiet++; m.quietTurns++; m.longestQuiet = Math.max(m.longestQuiet, quiet); }
    // ¿Qué le falta al líder? (estado de sus Avatares no florecidos en Humanos)
    const lead: PlayerId = bloomedInHumans(s, "P1") >= bloomedInHumans(s, "P2") ? "P1" : "P2";
    const missing: string[] = [];
    for (const k of REALM_PIECE_ORDER) {
      const a = s.realmPieces[lead]?.[k];
      if (!a || !a.unlocked) continue;
      const inH = !a.inLimbo && realmFromPos(a.pos) === "HUMAN";
      if (inH && s.consolidatedAvatars[lead]?.[k]) continue;
      missing.push(a.inLimbo ? "enMara" : inH ? "enHumanosSinLoto" : s.consolidatedAvatars[lead]?.[k] ? "conLotoFuera" : a.everCaptured ? "fueraSinLotoPosible" : "fueraConLotoPosible");
    }
    log.push({ ev, leaderMissing: missing });

    for (const pl of PLAYERS) {
      const b = bloomedInHumans(s, pl);
      for (let k = 1; k <= 6; k++) if (b >= k && m.firstK[k] < 0) m.firstK[k] = turn + 1;
    }
    if (m.allAvatarsAt < 0 && s.realmProgress.P1.currentRealmStep >= 6 && s.realmProgress.P2.currentRealmStep >= 6) m.allAvatarsAt = turn + 1;
    turn++;
    if (s.turn === p && !s.winner && !s.pendingSnakeBet) {
      // seguridad: si el turno no avanzó, forzar paso
      s = { ...s, turn: opp, phase: "idle", rollOptions: null } as GameState;
    }
  }
  m.turns = turn;
  m.winner = s.winner;
  if (turn > 500) {
    const tail: Record<string, number> = { turnos: 100 };
    for (const t of log.slice(-100)) {
      for (const e of t.ev) tail["ev_" + e] = (tail["ev_" + e] ?? 0) + 1;
      for (const x of t.leaderMissing) tail["falta_" + x] = (tail["falta_" + x] ?? 0) + 1;
    }
    m.tail = tail;
  }
  return m;
}

const n = Number(nStr);
for (let i = 0; i < n; i++) {
  const r = playOne();
  process.stdout.write(JSON.stringify({ variant, l1, l2, ...r }) + "\n");
}
