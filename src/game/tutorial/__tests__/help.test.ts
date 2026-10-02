import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../../state/reducer";
import { initialState } from "../../state/state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getAllLegalMoves, isPhase2 } from "../../rules/legalMoves";
import { getBuddhaHelp, type HelpTopic } from "../help";
import type { GameState, RealmPieceKind } from "../../types";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const avatar = (kind: RealmPieceKind, pos: number, extra: object = {}) => ({
  id: `x-${kind}`,
  kind,
  pos,
  inLimbo: false,
  maraLevel: null,
  unlocked: true,
  ...extra,
});
const venom = (pos: number) => ({ pos, inLimbo: false, maraLevel: null });

describe("ayuda de Buddha", () => {
  it("antes de tirar: tirar", () => {
    expect(getBuddhaHelp(initialState, "P1", "now")[0]).toMatch(/Roll/);
  });

  it("Fase 1: nombra las piezas que pueden moverse", () => {
    const s = { ...initialState, phase: "rolled", rollOptions: [2, 3] } as GameState;
    const text = getBuddhaHelp(s, "P1", "now").join(" ");
    expect(text).toMatch(/rolled 2 and 3/);
    expect(text).toMatch(/Pig/);
  });

  it("Fase 2: primero pide un Avatar, después sus animales", () => {
    const base = {
      ...initialState,
      brunoRevealed: true,
      phase: "rolled",
      rollOptions: [2, 3],
      realmProgress: {
        P1: { ...initialState.realmProgress.P1, currentRealmStep: 3 },
        P2: { ...initialState.realmProgress.P2, currentRealmStep: 3 },
      },
      realmPieces: { P1: { hungry_ghost: avatar("hungry_ghost", 4) }, P2: {} },
    } as GameState;
    expect(getBuddhaHelp(base, "P1", "now").join(" ")).toMatch(/Tap an Avatar that can move: Bruno/);
    const chosen = { ...base, selectedPiece: { ...base.selectedPiece, P1: "hungry_ghost" } } as GameState;
    expect(getBuddhaHelp(chosen, "P1", "now").join(" ")).toMatch(/Bruno is chosen/);
  });

  it("sin jugada: PASS", () => {
    const s = {
      ...initialState,
      brunoRevealed: true,
      phase: "rolled",
      rollOptions: [1, 2],
      realmProgress: {
        P1: { ...initialState.realmProgress.P1, currentRealmStep: 3 },
        P2: { ...initialState.realmProgress.P2, currentRealmStep: 3 },
      },
      pieces: {
        P1: { pig: venom(5), snake: venom(5), rooster: venom(5) },
        P2: { pig: venom(18), snake: venom(19), rooster: venom(20) },
      },
      realmPieces: {
        P1: { hungry_ghost: avatar("hungry_ghost", 10), hell: avatar("hell", 12), animals: avatar("animals", 14) },
        P2: { hungry_ghost: avatar("hungry_ghost", 6), hell: avatar("hell", 7), animals: avatar("animals", 8) },
      },
    } as GameState;
    expect(getBuddhaHelp(s, "P1", "now").join(" ")).toMatch(/PASS/);
  });

  it("cómo ganar: cuenta sellados y explica cada Avatar", () => {
    const s = {
      ...initialState,
      realmPieces: {
        P1: {
          hungry_ghost: avatar("hungry_ghost", 22),
          hell: avatar("hell", 23, { everCaptured: true }),
        },
        P2: {},
      },
      consolidatedAvatars: { P1: { hungry_ghost: true }, P2: {} },
    } as GameState;
    const text = getBuddhaHelp(s, "P1", "win");
    expect(text).toContain("You have 1 of 6 sealed in Humans.");
    expect(text).toContain("Bruno: sealed, in Humans");
    expect(text).toContain("Margot: in Humans, not sealed (needs 666 or 777)");
    expect(text).toContain("Whitman: not born yet");
  });

  it("qué pasó: sin jugadas todavía", () => {
    expect(getBuddhaHelp(initialState, "P1", "happened")[0]).toMatch(/Nothing yet/);
  });

  it("en partidas reales, las tres respuestas nunca fallan ni salen vacías", () => {
    const topics: HelpTopic[] = ["now", "win", "happened"];
    let s = reducer(initialState, { type: "RESET" } as never);
    s = reducer(s, { type: "SET_GENESIS_UI_COMPLETE" } as never);
    for (let step = 0; step < 900 && !s.winner; step++) {
      for (const t of topics) {
        const lines = getBuddhaHelp(s, s.turn, t);
        expect(lines.length).toBeGreaterThan(0);
        for (const l of lines) expect(l).not.toMatch(/undefined|NaN/);
      }
      if (s.phase === "idle") {
        s = reducer(s, { type: "ROLL" } as never);
        continue;
      }
      const legal = getAllLegalMoves(s, s.turn);
      if (legal.length === 0) {
        s = reducer(s, { type: "PASS_NO_MOVES", player: s.turn } as never);
        continue;
      }
      const m = legal[Math.floor(Math.random() * legal.length)];
      if (isPhase2(s, s.turn) && m.avatar && m.venom) {
        s = reducer(s, { type: "SELECT_PIECE", player: s.turn, piece: m.avatar } as never);
        s = reducer(s, { type: "SELECT_PIECE", player: s.turn, piece: m.venom } as never);
      }
      s = reducer(s, {
        type: "CONSCIOUS_MOVE",
        option: m.option,
        allOptions: getMoveOptionsForPlayer(s, s.turn),
      } as never);
    }
  }, 60000);
});
