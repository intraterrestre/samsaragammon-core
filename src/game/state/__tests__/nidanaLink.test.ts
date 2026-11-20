// 20 nov 2026 — Enlace de Nidanas (regla aprobada por Federico).
//
// Enlace = el jugador lleva ahora mismo dos Nidanas de números seguidos.
// Si al capturar a uno de sus Avatares tiene un enlace, ese Avatar pasa 3
// lances en Mara en vez de 6. Se fija en la captura. Venenos: siempre 6.
// Cada caso con Blancas y con Negras como víctima (estado espejo).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { nidanaLinkLows, hasNidanaLink } from "../../rules/nidanaLink";
import { NIDANA_LIST } from "../../nidanas";
import type { GameState, PlayerId, RealmPieceKind } from "../../types";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const act = (s: GameState, a: object) => reducer(s, a as never);
const R = (p: number) => (p < 0 ? p : (21 - p + 24) % 24);
const N = (n: number) => NIDANA_LIST[n - 1];
const venom = (pos: number) => ({ pos, inLimbo: false, maraLevel: null });
const avatar = (kind: RealmPieceKind, pos: number) => ({
  id: `x-${kind}`, kind, pos, inLimbo: false, maraLevel: null, unlocked: true,
});

/**
 * El atacante (Fase 1: sus Venenos se mueven solos) tiene el Cerdo a 2
 * casillas de Bruno de la víctima. La víctima lleva las Nidanas que se le
 * pasen en Margot y Oriol (Bruno, sin Nidana, va a Mara si lo capturan).
 */
function setup(victim: PlayerId, carried: Partial<Record<RealmPieceKind, number>>): { s: GameState; target: number } {
  const attacker: PlayerId = victim === "P1" ? "P2" : "P1";
  const m = (p: number) => (attacker === "P1" ? p : R(p)); // posiciones vistas desde el atacante
  const nid: Partial<Record<RealmPieceKind, string>> = {};
  for (const [k, n] of Object.entries(carried)) nid[k as RealmPieceKind] = N(n!);
  const s = {
    ...initialState,
    brunoRevealed: true,
    genesisUIComplete: true,
    gameStartedAt: 1,
    gameId: "test",
    turn: attacker,
    phase: "rolled",
    rollOptions: [2, 5],
    globalRollCount: 101,
    realmProgress: {
      [attacker]: { ...initialState.realmProgress[attacker], currentRealmStep: 2, stageStartedAtRoll: 101 },
      [victim]: { ...initialState.realmProgress[victim], currentRealmStep: 3, stageStartedAtRoll: 101 },
    },
    pieces: {
      [attacker]: { pig: venom(m(5)), snake: venom(m(14)), rooster: venom(m(15)) },
      [victim]: { pig: venom(m(18)), snake: venom(m(19)), rooster: venom(m(20)) },
    },
    realmPieces: {
      [attacker]: { hungry_ghost: avatar("hungry_ghost", m(1)), hell: avatar("hell", m(2)) },
      [victim]: {
        hungry_ghost: avatar("hungry_ghost", m(7)),
        hell: avatar("hell", m(10)),
        animals: avatar("animals", m(12)),
      },
    },
    avatarNidana: { [attacker]: {}, [victim]: nid },
    boardNidanas: {},
  } as unknown as GameState;
  return { s, target: m(7) };
}

function capture(victim: PlayerId, carried: Partial<Record<RealmPieceKind, number>>): GameState {
  const { s, target } = setup(victim, carried);
  const attacker = s.turn;
  const opt = getMoveOptionsForPlayer(s, attacker).find((o) => o.pieceKind === "pig" && o.toPos === target);
  expect(opt?.meaning, "el Cerdo debería poder capturar a Bruno").toBe("IMPACT");
  const sel = { ...s, selectedPiece: { ...s.selectedPiece, [attacker]: "pig" } } as GameState;
  const after = act(sel, { type: "CONSCIOUS_MOVE", option: opt, allOptions: getMoveOptionsForPlayer(sel, attacker) });
  expect(after.realmPieces[victim].hungry_ghost!.inLimbo).toBe(true);
  return after;
}

/** Cuántos lances (de cualquiera) tarda Bruno de la víctima en salir de Mara. */
function rollsToLeave(s: GameState, victim: PlayerId, mutate?: (s: GameState) => GameState): number {
  for (let k = 1; k <= 10; k++) {
    s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
    if (mutate && k === 1) s = mutate(s);
    if (!s.realmPieces[victim].hungry_ghost!.inLimbo) return k;
  }
  return -1;
}

describe("enlace: cálculo en vivo", () => {
  it("dos Nidanas de números seguidos forman enlace; sueltas, no", () => {
    expect(nidanaLinkLows({ hell: N(3), animals: N(4) })).toEqual([3]);
    expect(nidanaLinkLows({ hell: N(3), animals: N(5) })).toEqual([]);
    expect(nidanaLinkLows({ hell: N(12), animals: N(1) })).toEqual([]); // no da la vuelta
    expect(hasNidanaLink({})).toBe(false);
  });
});

for (const victim of ["P1", "P2"] as PlayerId[]) {
  const color = victim === "P1" ? "Blancas" : "Negras";
  describe(`enlace y Mara — víctima ${color}`, () => {
    it("sin enlace: 6 lances en Mara", () => {
      const s = capture(victim, { hell: 3, animals: 5 });
      expect(s.realmPieces[victim].hungry_ghost!.maraLink ?? null).toBeNull();
      expect(rollsToLeave(s, victim)).toBe(6);
    });

    it("con enlace 3–4 al ser capturado: 3 lances", () => {
      const s = capture(victim, { hell: 3, animals: 4 });
      expect(s.realmPieces[victim].hungry_ghost!.maraLink).toBe(3);
      expect(rollsToLeave(s, victim)).toBe(3);
    });

    it("perder una Nidana del enlace ya en Mara no cambia su espera (sigue en 3)", () => {
      const s = capture(victim, { hell: 3, animals: 4 });
      const lose = (x: GameState) => ({ ...x, avatarNidana: { ...x.avatarNidana, [victim]: { hell: N(3) } } }) as GameState;
      expect(rollsToLeave(s, victim, lose)).toBe(3);
    });

    it("conseguir el enlace ya en Mara no acorta la espera (sigue en 6)", () => {
      const s = capture(victim, { hell: 3 });
      const gain = (x: GameState) => ({ ...x, avatarNidana: { ...x.avatarNidana, [victim]: { hell: N(3), animals: N(4) } } }) as GameState;
      expect(rollsToLeave(s, victim, gain)).toBe(6);
    });

    it("si el capturado lleva una Nidana del enlace: escudo, no va a Mara, y el enlace se rompe", () => {
      const { s, target } = setup(victim, { hell: 3, animals: 4 });
      const withShield = {
        ...s,
        avatarNidana: { ...s.avatarNidana, [victim]: { hungry_ghost: N(4), hell: N(3) } },
      } as GameState;
      const attacker = s.turn;
      const opt = getMoveOptionsForPlayer(withShield, attacker).find((o) => o.pieceKind === "pig" && o.toPos === target)!;
      const sel = { ...withShield, selectedPiece: { ...withShield.selectedPiece, [attacker]: "pig" } } as GameState;
      const after = act(sel, { type: "CONSCIOUS_MOVE", option: opt, allOptions: getMoveOptionsForPlayer(sel, attacker) });
      expect(after.realmPieces[victim].hungry_ghost!.inLimbo).toBe(false);
      expect(hasNidanaLink(after.avatarNidana[victim])).toBe(false);
    });

    it("las Nidanas apostadas en un 666 siguen contando para el enlace (siguen siendo tuyas)", () => {
      const { s } = setup(victim, { hell: 3, animals: 4 });
      const withBet = {
        ...s,
        snakeBet: { byPlayer: victim, targetAvatar: "deva", roundsLeft: 3, stake: [N(3), N(4)] },
      } as GameState;
      const attacker = s.turn;
      const target = setup(victim, {}).target;
      const opt = getMoveOptionsForPlayer(withBet, attacker).find((o) => o.pieceKind === "pig" && o.toPos === target)!;
      const sel = { ...withBet, selectedPiece: { ...withBet.selectedPiece, [attacker]: "pig" } } as GameState;
      const after = act(sel, { type: "CONSCIOUS_MOVE", option: opt, allOptions: getMoveOptionsForPlayer(sel, attacker) });
      expect(after.realmPieces[victim].hungry_ghost!.maraLink).toBe(3);
    });

    it("un Veneno capturado sigue esperando 6 lances aunque haya enlace", () => {
      const { s } = setup(victim, { hell: 3, animals: 4 });
      const attacker = s.turn;
      const vPos = s.pieces[victim].pig.pos;
      // El Cerdo atacante se coloca a 2 casillas del Cerdo de la víctima.
      const step = attacker === "P1" ? 1 : -1;
      const from = (((vPos - 2 * step) % 24) + 24) % 24;
      const t = {
        ...s,
        pieces: { ...s.pieces, [attacker]: { ...s.pieces[attacker], pig: venom(from) } },
      } as GameState;
      const opt = getMoveOptionsForPlayer(t, attacker).find((o) => o.pieceKind === "pig" && o.toPos === vPos);
      expect(opt?.meaning).toBe("IMPACT");
      const sel = { ...t, selectedPiece: { ...t.selectedPiece, [attacker]: "pig" } } as GameState;
      let after = act(sel, { type: "CONSCIOUS_MOVE", option: opt!, allOptions: getMoveOptionsForPlayer(sel, attacker) });
      expect(after.pieces[victim].pig.inLimbo).toBe(true);
      let k = 0;
      while (after.pieces[victim].pig.inLimbo && k < 10) {
        after = act({ ...after, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
        k++;
      }
      expect(k).toBe(6);
    });
  });
}
