import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../../state/reducer";
import { initialState } from "../../state/state";
import { getMoveOptionsForPlayer } from "../getMoveOptionsForPlayer";
import {
  getAllLegalMoves,
  getMovablePieces,
  getUsefulVenomsForAvatar,
  hasAnyLegalMove,
  isPhase2,
} from "../legalMoves";
import type { GameState, PlayerId, RealmPieceKind } from "../../types";

// El reducer escribe logs de depuración en cada jugada; se silencian
// solo durante estos tests.
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const avatar = (kind: RealmPieceKind, pos: number) => ({
  id: `x-${kind}`,
  kind,
  pos,
  inLimbo: false,
  maraLevel: null,
  unlocked: true,
});
const venom = (pos: number) => ({ pos, inLimbo: false, maraLevel: null });

function phase2State(overrides: Partial<GameState>): GameState {
  return {
    ...initialState,
    brunoRevealed: true,
    genesisUIComplete: true,
    phase: "rolled",
    turn: "P1",
    realmProgress: {
      P1: { ...initialState.realmProgress.P1, currentRealmStep: 3 },
      P2: { ...initialState.realmProgress.P2, currentRealmStep: 3 },
    },
    ...overrides,
  } as GameState;
}

// Aplica una LegalMove igual que la UI: en Fase 2, dos SELECT_PIECE y
// luego CONSCIOUS_MOVE con las opciones recalculadas tras la selección.
function play(state: GameState, player: PlayerId, move: ReturnType<typeof getAllLegalMoves>[number]) {
  let s = state;
  if (isPhase2(s, player) && move.avatar && move.venom) {
    s = reducer(s, { type: "SELECT_PIECE", player, piece: move.avatar } as never);
    s = reducer(s, { type: "SELECT_PIECE", player, piece: move.venom } as never);
  }
  const all = getMoveOptionsForPlayer(s, player);
  return reducer(s, { type: "CONSCIOUS_MOVE", option: move.option, allOptions: all } as never);
}

describe("getAllLegalMoves", () => {
  it("sin tirada no hay jugadas", () => {
    expect(getAllLegalMoves(initialState, "P1")).toEqual([]);
  });

  it("en Fase 1 devuelve exactamente lo mismo que getMoveOptionsForPlayer", () => {
    const s = { ...initialState, phase: "rolled", rollOptions: [3, 5] } as GameState;
    const legal = getAllLegalMoves(s, "P1");
    expect(legal.map((m) => m.option)).toEqual(getMoveOptionsForPlayer(s, "P1"));
    expect(legal.every((m) => m.avatar === null && m.venom === m.option.pieceKind)).toBe(true);
  });

  it("en Fase 2 no depende de la selección actual", () => {
    const s = phase2State({
      rollOptions: [2, 3],
      realmPieces: {
        P1: { hungry_ghost: avatar("hungry_ghost", 4), hell: avatar("hell", 9) },
        P2: {},
      },
    });
    const legal = getAllLegalMoves(s, "P1");
    expect(legal.length).toBeGreaterThan(0);
    // Sin selección, la función base no ofrece nada...
    expect(getMoveOptionsForPlayer(s, "P1")).toEqual([]);
    // ...pero ambos Avatares aparecen como movibles.
    expect(getMovablePieces(s, "P1")).toEqual(new Set(["hungry_ghost", "hell"]));
    expect(getUsefulVenomsForAvatar(s, "P1", "hell")).toEqual(new Set(["pig", "snake", "rooster"]));
  });

  it("respeta PIG: solo el Avatar recién vuelto de Mara tiene jugadas", () => {
    const s = phase2State({
      rollOptions: [2, 3],
      realmPieces: {
        P1: { hungry_ghost: avatar("hungry_ghost", 4), hell: avatar("hell", 9) },
        P2: {},
      },
      justReturnedFromMara: { P1: { hell: true }, P2: {} },
    });
    expect(getMovablePieces(s, "P1")).toEqual(new Set(["hell"]));
  });

  it("detecta una tirada sin ninguna jugada legal (el bloqueo de la auditoría)", () => {
    // Venenos de P1 en 5; destinos 6, 7 y 8 ocupados cada uno por un
    // Avatar rival solo; los Avatares de P1 están solos (SNAKE: no
    // pueden capturar). Resultado: cero jugadas.
    const s = phase2State({
      rollOptions: [1, 2],
      pieces: {
        P1: { pig: venom(5), snake: venom(5), rooster: venom(5) },
        P2: { pig: venom(18), snake: venom(19), rooster: venom(20) },
      },
      realmPieces: {
        P1: {
          hungry_ghost: avatar("hungry_ghost", 10),
          hell: avatar("hell", 12),
          animals: avatar("animals", 14),
        },
        P2: {
          hungry_ghost: avatar("hungry_ghost", 6),
          hell: avatar("hell", 7),
          animals: avatar("animals", 8),
        },
      },
    });
    expect(hasAnyLegalMove(s, "P1")).toBe(false);
  });

  it("cada jugada listada la acepta el reducer, en partidas aleatorias completas", () => {
    let checked = 0;
    for (let game = 0; game < 4; game++) {
      let s = reducer(initialState, { type: "RESET" } as never);
      s = reducer(s, { type: "SET_GENESIS_UI_COMPLETE" } as never);
      for (let step = 0; step < 600 && !s.winner; step++) {
        if (s.phase === "idle") {
          s = reducer(s, { type: "ROLL" } as never);
          continue;
        }
        const legal = getAllLegalMoves(s, s.turn);
        if (legal.length === 0) {
          // Bloqueo conocido (sin PASS todavía): se salta el turno a mano
          // para que la prueba pueda seguir.
          s = { ...s, phase: "idle", rollOptions: null, turn: s.turn === "P1" ? "P2" : "P1" };
          continue;
        }
        const move = legal[Math.floor(Math.random() * legal.length)];
        const next = play(s, s.turn, move);
        expect(next).not.toBe(s);
        expect(next.phase).toBe("idle");
        checked++;
        s = next;
      }
    }
    expect(checked).toBeGreaterThan(500);
  }, 60000);
});
