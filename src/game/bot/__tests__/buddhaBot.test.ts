import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { reducer } from "../../state/reducer";
import { initialState } from "../../state/state";
import { chooseBotMove, applyBotAction, type BotLevel } from "../buddhaBot";
import type { GameState, PlayerId } from "../../types";

// Imprime resultados aunque console.log/info estén silenciados.
const report = (msg: string) =>
  (globalThis as unknown as { process: { stdout: { write: (m: string) => void } } }).process.stdout.write(msg);

// 20 nov 2026 — silenciar SIN espiar: vi.spyOn guarda los argumentos de
// cada llamada, y el motor registra estados completos (unas 40.000 veces
// por partida). En 10 partidas eso retenía cientos de miles de estados y
// agotaba la memoria del ordenador de pruebas.
const original = { log: console.log, warn: console.warn, info: console.info };
beforeAll(() => {
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
});
afterAll(() => {
  console.log = original.log;
  console.warn = original.warn;
  console.info = original.info;
});

function start(): GameState {
  let s = { ...initialState, gameStartedAt: 1, gameId: "bot-sim" } as GameState;
  s = reducer(s, { type: "SET_TUTORIAL_MODE", on: true } as never);
  s = reducer(s, { type: "SET_GENESIS_UI_COMPLETE" } as never);
  return s;
}

export function playGame(levels: Record<PlayerId, BotLevel>, maxTurns = 900) {
  let s = start();
  let turns = 0;
  while (!s.winner && turns < maxTurns) {
    const p = s.turn;
    s = reducer({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" } as never);
    const choice = chooseBotMove(s, p, levels[p]);
    if (!choice) s = reducer(s, { type: "PASS_NO_MOVES", player: p } as never);
    else s = applyBotAction(s, p, choice.action);
    if (s.turn === p && !s.winner) {
      // Una jugada que no cambia el turno sería un cuelgue del bot en la UI.
      throw new Error(`turno no avanzó en el turno ${turns}`);
    }
    turns++;
  }
  return { winner: s.winner, turns, s };
}

describe("Buddha bot", () => {
  it("los niveles se ordenan: Difícil gana más que Fácil", () => {
    let hard = 0, easy = 0, none = 0;
    for (let i = 0; i < 4; i++) {
      // alterna colores para no favorecer a quien empieza
      const hardIs: PlayerId = i % 2 === 0 ? "P1" : "P2";
      const r = playGame(hardIs === "P1" ? { P1: "hard", P2: "easy" } : { P1: "easy", P2: "hard" }, 700);
      if (!r.winner) none++; else if (r.winner === hardIs) hard++; else easy++;
    }
    report(`hard vs easy: hard=${hard} easy=${easy} sinGanador=${none}\n`);
    expect(hard).toBeGreaterThan(easy);
  }, 600000);

  it("juega partidas completas sin colgarse (normal vs normal)", () => {
    for (let i = 0; i < 6; i++) {
      const r = playGame({ P1: "normal", P2: "normal" });
      report(`normal vs normal: winner=${r.winner} turns=${r.turns} step=${r.s.realmProgress.P1.currentRealmStep}/${r.s.realmProgress.P2.currentRealmStep}\n`);
      expect(r.turns).toBeGreaterThan(10);
    }
  }, 300000);
});
