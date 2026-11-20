// tools/lab/snakeHumans.sim.ts — 20 nov 2026. NO forma parte del juego.
// ¿Es razonable ganar Square Karma 666 en 3 turnos si la Serpiente tiene
// que capturar un Avatar rival EN HUMANOS (propuesta), comparado con la
// regla actual (cualquier captura con la Serpiente)?
//
// Partidas reales Buddha contra Buddha (motor y bot del juego). Cada vez
// que un jugador PODRÍA pedir el 666, se copia la partida y se juega la
// apuesta muchas veces desde ese punto:
//   turno del apostador (pide) → rival acepta y juega → 3 turnos del apostador.
// En cada turno del apostador, si existe una jugada que gana la apuesta, la
// hace. Si no, juega según la política:
//   "buddha"  la jugada normal del bot (no prepara la captura): cota baja
//   "busca"   elige la jugada que deja más tiradas posibles con captura
//             ganadora en su siguiente turno (sin prever al rival)
// El rival juega normal y no se defiende de la apuesta.
//
// Ejecutar: npx vitest run --config _to_delete/vitest.sim.config.ts

import { reducer } from "../../src/game/state/reducer";
import { initialState } from "../../src/game/state/state";
import { chooseBotMove, applyBotAction, getBotActions, type BotAction } from "../../src/game/bot/buddhaBot";
import { canonicalRealmFromPos } from "../../src/UI/realm";
import { REALM_PIECE_ORDER, type GameState, type PlayerId, type RealmPieceKind } from "../../src/game/types";
import type { LegalMove } from "../../src/game/rules/legalMoves";

const SNAPS_PER_PLAYER = 6;
const FORKS = 12;
const act = (s: GameState, a: object) => reducer(s, a as never);
const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

type Rule = "actual" | "humanos";
type Policy = "buddha" | "busca";

function winsBet(s: GameState, p: PlayerId, m: LegalMove, rule: Rule): boolean {
  if (m.option.meaning !== "IMPACT") return false;
  if (!(m.venom === "snake" || m.option.pieceKind === "snake")) return false;
  if (rule === "actual") return true;
  const opp = other(p);
  const to = m.option.toPos;
  if (canonicalRealmFromPos(to) !== "humans") return false;
  return REALM_PIECE_ORDER.some((k) => {
    const a = s.realmPieces[opp]?.[k];
    return a && a.unlocked && !a.inLimbo && a.pos === to;
  });
}

function rollWith(s: GameState, a: number, b: number): GameState {
  // Igual que ROLL pero con dados fijos: se usa solo para mirar opciones.
  return { ...s, phase: "rolled", rollOptions: [a, b] } as GameState;
}
const ROLLS: [number, number, number][] = [];
for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) ROLLS.push([a, b, a === b ? 1 : 2]);

/** Probabilidad (sobre 36) de tener una jugada ganadora en el próximo turno. */
function chanceNext(s: GameState, p: PlayerId, rule: Rule): number {
  let w = 0;
  const base = { ...s, turn: p } as GameState;
  for (const [a, b, n] of ROLLS) {
    const t = rollWith(base, a, b);
    if (getBotActions(t, p).some((x) => x.kind === "move" && winsBet(t, p, x.move, rule))) w += n;
  }
  return w / 36;
}

function bettorTurn(s: GameState, p: PlayerId, rule: Rule, policy: Policy): { s: GameState; won: boolean } {
  s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
  if (s.turn !== p) return { s, won: false };
  const actions = getBotActions(s, p);
  if (!actions.length) return { s: act(s, { type: "PASS_NO_MOVES", player: p }), won: false };
  const win = actions.find((x) => x.kind === "move" && winsBet(s, p, x.move, rule));
  if (win) return { s: applyBotAction(s, p, win), won: true };
  let pick: BotAction;
  if (policy === "buddha") {
    pick = chooseBotMove(s, p, "normal")!.action;
  } else {
    let best = -1;
    pick = actions[0];
    for (const x of actions) {
      if (x.kind !== "move") continue;
      const c = chanceNext(applyBotAction(s, p, x), p, rule);
      if (c > best) { best = c; pick = x; }
    }
  }
  return { s: applyBotAction(s, p, pick), won: false };
}

function otherTurn(s: GameState): GameState {
  const p = s.turn;
  s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
  if (s.turn !== p) return s;
  const c = chooseBotMove(s, p, "normal");
  return c ? applyBotAction(s, p, c.action) : act(s, { type: "PASS_NO_MOVES", player: p });
}

/** Una apuesta desde la instantánea s (turno de p, puede pedir). Devuelve el turno ganador 1..3 o 0. */
function playBet(s0: GameState, p: PlayerId, target: RealmPieceKind, rule: Rule, policy: Policy): number {
  let s = act(s0, { type: "REQUEST_SNAKE_BET", player: p, targetAvatar: target });
  s = otherTurn(s); // el apostador termina el turno en que propuso
  if (s.winner) return 0;
  s = act(s, { type: "ACCEPT_SNAKE_BET" });
  if (!s.snakeBet) return 0;
  s = otherTurn(s); // turno del rival
  for (let k = 1; k <= 3; k++) {
    if (s.winner || s.turn !== p) return 0;
    const r = bettorTurn(s, p, rule, policy);
    if (r.won) return k;
    s = r.s;
    if (s.winner) return 0;
    s = otherTurn(s);
  }
  return 0;
}

function canRequest(s: GameState, p: PlayerId): RealmPieceKind | null {
  if (s.pendingSnakeBet || s.snakeBet) return null;
  for (const k of REALM_PIECE_ORDER) {
    const t = act(s, { type: "REQUEST_SNAKE_BET", player: p, targetAvatar: k });
    if (t.pendingSnakeBet) return k;
  }
  return null;
}

export function runSnakeSim(GAMES: number): string {
  const log = console.log;
  console.log = () => {};
  console.warn = () => {};
  const res: Record<string, { n: number; win: number; byTurn: number[] }> = {};
  const add = (key: string, w: number) => {
    const r = (res[key] ??= { n: 0, win: 0, byTurn: [0, 0, 0] });
    r.n++;
    if (w) { r.win++; r.byTurn[w - 1]++; }
  };
  let snapshots = 0, eligibleTurns = 0, totalTurns = 0;
  const geom: number[] = []; // ¿hay algún Avatar rival en Humanos al alcance? (indicador)
  for (let g = 0; g < GAMES; g++) {
    let s = { ...initialState, gameStartedAt: 1, gameId: "lab" } as GameState;
    s = act(s, { type: "SET_GENESIS_UI_COMPLETE" });
    const taken: Record<PlayerId, number> = { P1: 0, P2: 0 };
    let lastSnap: Record<PlayerId, number> = { P1: -99, P2: -99 };
    for (let turn = 0; turn < 3000 && !s.winner; turn++) {
      const p = s.turn;
      totalTurns++;
      const target = canRequest(s, p);
      if (target) {
        eligibleTurns++;
        // Instantáneas separadas (al menos 20 turnos) para no medir lo mismo.
        if (taken[p] < SNAPS_PER_PLAYER && turn - lastSnap[p] >= 20) {
          taken[p]++; lastSnap[p] = turn; snapshots++;
          const rivalInHumans = REALM_PIECE_ORDER.filter((k) => {
            const a = s.realmPieces[other(p)]?.[k];
            return a && a.unlocked && !a.inLimbo && canonicalRealmFromPos(a.pos) === "humans";
          }).length;
          geom.push(rivalInHumans);
          for (const rule of ["actual", "humanos"] as Rule[]) {
            for (const policy of ["buddha", "busca"] as Policy[]) {
              for (let f = 0; f < FORKS; f++) add(`${rule}|${policy}`, playBet(s, p, target, rule, policy));
            }
          }
        }
      }
      s = otherTurn(s);
    }
  }
  console.log = log;
  const pct = (a: number, b: number) => (b ? ((100 * a) / b).toFixed(1) + "%" : "-");
  const lines = [
    `partidas ${GAMES} · turnos ${totalTurns} · turnos en que se podía pedir el 666 ${eligibleTurns} (${pct(eligibleTurns, totalTurns)})`,
    `instantáneas ${snapshots} · apuestas jugadas por combinación ${snapshots * FORKS}`,
    `Avatares rivales en Humanos en el momento de apostar: media ${(geom.reduce((a, b) => a + b, 0) / Math.max(1, geom.length)).toFixed(2)} · ninguno en ${pct(geom.filter((x) => x === 0).length, geom.length)}`,
  ];
  for (const [k, r] of Object.entries(res)) {
    lines.push(`${k.padEnd(16)} gana ${pct(r.win, r.n)}  (turno 1: ${pct(r.byTurn[0], r.n)}, 2: ${pct(r.byTurn[1], r.n)}, 3: ${pct(r.byTurn[2], r.n)})`);
  }
  return JSON.stringify({ snapshots, eligibleTurns, totalTurns, geom, res }) + "\n" + lines.join("\n");
}
