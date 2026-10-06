// Rule Canon Repair (30 septiembre 2026) — tests que describen el canon
// cerrado con Federico ANTES de tocar el reducer:
//
//   1. Mara: 6 lances globales; al salir, reaparece en una casilla libre
//      AL AZAR fuera de Humans. Igual para ambos jugadores, Venenos y
//      Avatares. No es un movimiento: no recoge Nidanas ni sella.
//   2. Square Karma 666: el apostador dispone de sus PRÓXIMOS 3 TURNOS
//      tras la aceptación. Cuenta el turno, no cómo terminó: una jugada,
//      un PASS o un Round Dharma 777 del apostador consumen uno. Los
//      turnos del rival no consumen nada.
//   3. PASS: si tras tirar no existe ninguna jugada legal, el turno
//      termina con PASS. El tiempo avanza como en cualquier turno
//      terminado (turnIndex, cycleIndex); no ocurre nada de lo que
//      describe una jugada (lastMove, firma de decisiones, karma).
//      globalRollCount no se toca: ya avanzó en ROLL.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getAllLegalMoves, hasAnyLegalMove } from "../../rules/legalMoves";
import { canonicalRealmFromPos } from "../../../UI/realm";
import { NIDANA_LIST } from "../../nidanas";
import type { GameState, MoveOption, PlayerId, RealmPieceKind } from "../../types";
import { getDharma777EligibleTargets } from "../../dharma777";
import { revealHumansLotuses } from "../../rules/humansReveal";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const act = (s: GameState, a: object) => reducer(s, a as never);
const venom = (pos: number, inLimbo = false, maraLevel: number | null = null) => ({ pos, inLimbo, maraLevel });
const avatar = (kind: RealmPieceKind, pos: number, extra: object = {}) => ({
  id: `x-${kind}`,
  kind,
  pos,
  inLimbo: false,
  maraLevel: null,
  unlocked: true,
  ...extra,
});

function base(overrides: Partial<GameState>): GameState {
  return {
    ...initialState,
    brunoRevealed: true,
    genesisUIComplete: true,
    gameStartedAt: 1,
    gameId: "test",
    ...overrides,
  } as GameState;
}

// ---------------------------------------------------------------- Mara
describe("Mara: 6 lances y renacimiento al azar fuera de Humans", () => {
  function captured(): GameState {
    return base({
      turn: "P1",
      pieces: {
        P1: { pig: venom(-1, true, 1), snake: venom(5), rooster: venom(6) },
        P2: { pig: venom(12), snake: venom(13), rooster: venom(14) },
      },
      realmPieces: {
        P1: {},
        P2: { hungry_ghost: avatar("hungry_ghost", -1, { inLimbo: true, maraLevel: 1, everCaptured: true }) },
      },
    });
  }

  // Tira dados sin mover (se vuelve a "idle" a mano entre lances): solo
  // interesa cuándo y dónde reaparecen las piezas.
  function rollTimes(s: GameState, n: number): GameState {
    for (let i = 0; i < n; i++) {
      s = act({ ...s, phase: "idle", rollOptions: null }, { type: "ROLL" });
    }
    return s;
  }

  it("sigue en Mara durante 5 lances y sale en el 6.º", () => {
    const after5 = rollTimes(captured(), 5);
    expect(after5.pieces.P1.pig.inLimbo).toBe(true);
    expect(after5.realmPieces.P2.hungry_ghost!.inLimbo).toBe(true);
    const after6 = rollTimes(after5, 1);
    expect(after6.pieces.P1.pig.inLimbo).toBe(false);
    expect(after6.realmPieces.P2.hungry_ghost!.inLimbo).toBe(false);
  });

  it("nunca reaparece en Humans ni sobre otra pieza, en 300 repeticiones", () => {
    const landing = new Set<number>();
    for (let i = 0; i < 300; i++) {
      const s = rollTimes(captured(), 6);
      const pig = s.pieces.P1.pig.pos;
      const ghost = s.realmPieces.P2.hungry_ghost!.pos;
      for (const pos of [pig, ghost]) {
        expect(canonicalRealmFromPos(pos)).not.toBe("humans");
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(pos).toBeLessThan(24);
        landing.add(pos);
      }
      expect(pig).not.toBe(ghost);
      for (const occupied of [5, 6, 12, 13, 14]) {
        expect(pig).not.toBe(occupied);
        expect(ghost).not.toBe(occupied);
      }
    }
    // Es aleatorio de verdad: no cae siempre en la misma casilla.
    expect(landing.size).toBeGreaterThan(8);
  });

  it("reaparecer sobre una Nidana no la recoge", () => {
    const withNidanas: GameState = {
      ...captured(),
      boardNidanas: Object.fromEntries(
        Array.from({ length: 24 }, (_, i) => [i, NIDANA_LIST[0]])
      ) as GameState["boardNidanas"],
    };
    const s = rollTimes(withNidanas, 6);
    expect(s.avatarNidana.P2.hungry_ghost).toBeUndefined();
  });
});

// ---------------------------------------------------------------- 666
// P1 apuesta por su Bruno (en Humans, sin sellar, 2 Nidanas portadas).
// Las jugadas de prueba nunca capturan, así que la apuesta nunca se gana:
// lo que se mide es cuántos turnos dura.
function betState(): GameState {
  return base({
    // Humanos ya destapado (Marino): sin eso no hay lotos ni 666.
    cosmicClock: { era: "marino", progress: 0, transitionSequence: 4 },
    turn: "P1",
    pieces: {
      P1: { pig: venom(3), snake: venom(4), rooster: venom(5) },
      P2: { pig: venom(15), snake: venom(16), rooster: venom(17) },
    },
    realmPieces: {
      P1: {
        hungry_ghost: avatar("hungry_ghost", 22, { everCaptured: true }),
        hell: avatar("hell", 8),
      },
      P2: { hungry_ghost: avatar("hungry_ghost", 11), hell: avatar("hell", 10) },
    },
    avatarNidana: {
      P1: { hungry_ghost: NIDANA_LIST[0], hell: NIDANA_LIST[1] },
      P2: {},
    },
  });
}

function quietMove(s: GameState): GameState {
  s = act({ ...s, phase: "idle", rollOptions: null }, { type: "ROLL" });
  const opts = getMoveOptionsForPlayer(s, s.turn).filter(
    (o) => o.meaning !== "IMPACT" && o.pieceKind !== "hungry_ghost"
  );
  return act(s, { type: "CONSCIOUS_MOVE", option: opts[0], allOptions: opts });
}

function acceptedBet(): GameState {
  let s = act(betState(), { type: "REQUEST_SNAKE_BET", player: "P1", targetAvatar: "hungry_ghost" });
  s = quietMove(s); // P1 termina el turno en que propuso
  s = act(s, { type: "ACCEPT_SNAKE_BET" }); // P2 acepta en su turno
  expect(s.snakeBet?.byPlayer).toBe("P1");
  return s;
}

describe("Square Karma 666: 3 turnos propios del apostador", () => {
  it("los turnos del rival no consumen nada", () => {
    const s = quietMove(acceptedBet()); // P2 mueve
    expect(s.turn).toBe("P1");
    expect(s.snakeBet?.roundsLeft).toBe(3);
  });

  it("el apostador tiene 3 oportunidades reales; al terminar la 3.ª sin cumplir, pierde", () => {
    let s = quietMove(acceptedBet()); // P2
    const chances: number[] = [];
    for (let i = 0; i < 6 && s.snakeBet; i++) {
      const mover = s.turn;
      s = quietMove(s);
      if (mover === "P1") chances.push(s.snakeBet?.roundsLeft ?? 0);
    }
    expect(chances).toEqual([2, 1, 0]);
    expect(s.snakeBet).toBeNull();
  });

  it("un PASS del apostador consume uno de sus turnos", () => {
    let s = quietMove(acceptedBet()); // P2 → turno de P1
    s = act(s, { type: "ROLL" });
    // Se fuerza "sin jugada legal" dejando todas las piezas de P1 en Mara
    // salvo el Avatar apostado, que tampoco tiene Venenos activos.
    s = {
      ...s,
      pieces: {
        ...s.pieces,
        P1: { pig: venom(-1, true, 1), snake: venom(-1, true, 1), rooster: venom(-1, true, 1) },
      },
      realmPieces: { ...s.realmPieces, P1: { hungry_ghost: s.realmPieces.P1.hungry_ghost } },
    };
    expect(hasAnyLegalMove(s, "P1")).toBe(false);
    s = act(s, { type: "PASS_NO_MOVES", player: "P1" });
    expect(s.turn).toBe("P2");
    expect(s.snakeBet?.roundsLeft).toBe(2);
  });

  it("un Round Dharma 777 del apostador consume uno de sus turnos", () => {
    let s = quietMove(acceptedBet()); // P2 → turno de P1
    // P2 tiene a Whitman (paso 6) y un Avatar solo en Humans (21); el
    // Cerdo de P1 en 20 lo alcanza con un 1.
    s = {
      ...s,
      phase: "rolled",
      rollOptions: [1, 5],
      pieces: { ...s.pieces, P1: { ...s.pieces.P1, pig: venom(20) } },
      realmPieces: {
        ...s.realmPieces,
        P2: { ...s.realmPieces.P2, hungry_ghost: avatar("hungry_ghost", 21) },
      },
      realmProgress: {
        ...s.realmProgress,
        P2: { ...s.realmProgress.P2, currentRealmStep: 6 },
      },
    };
    const option = getMoveOptionsForPlayer(s, "P1").find(
      (o) => o.pieceKind === "pig" && o.toPos === 21
    ) as MoveOption;
    expect(option.meaning).toBe("IMPACT");
    s = act(s, {
      type: "DECLARE_DHARMA_777",
      player: "P1",
      option,
      allOptions: getMoveOptionsForPlayer(s, "P1"),
      targetAvatar: "hungry_ghost",
    });
    expect(s.consolidatedAvatars.P1.hungry_ghost).toBe(true);
    expect(s.snakeBet?.roundsLeft).toBe(2);
  });
});

// ---------------------------------------------------------------- PASS
function stalled(turn: PlayerId = "P1"): GameState {
  const me = turn;
  const opp: PlayerId = turn === "P1" ? "P2" : "P1";
  return base({
    turn,
    phase: "rolled",
    rollOptions: [1, 2],
    globalRollCount: 40,
    turnIndex: 17,
    cycleIndex: 8,
    realmProgress: {
      P1: { ...initialState.realmProgress.P1, currentRealmStep: 3 },
      P2: { ...initialState.realmProgress.P2, currentRealmStep: 3 },
    },
    pieces: {
      [me]: { pig: venom(5), snake: venom(5), rooster: venom(5) },
      [opp]: { pig: venom(18), snake: venom(19), rooster: venom(20) },
    } as GameState["pieces"],
    realmPieces: {
      [me]: {
        hungry_ghost: avatar("hungry_ghost", 10),
        hell: avatar("hell", 12),
        animals: avatar("animals", 14),
      },
      [opp]: {
        hungry_ghost: avatar("hungry_ghost", turn === "P1" ? 6 : 4),
        hell: avatar("hell", turn === "P1" ? 7 : 3),
        animals: avatar("animals", turn === "P1" ? 8 : 2),
      },
    } as GameState["realmPieces"],
  });
}

describe("PASS cuando no hay ninguna jugada legal", () => {
  it("el estado de prueba de verdad no tiene jugadas", () => {
    expect(getAllLegalMoves(stalled("P1"), "P1")).toEqual([]);
    expect(getAllLegalMoves(stalled("P2"), "P2")).toEqual([]);
  });

  it("termina el turno y el tiempo avanza como en cualquier turno", () => {
    const s0 = stalled("P1");
    const s = act(s0, { type: "PASS_NO_MOVES", player: "P1" });
    expect(s.turn).toBe("P2");
    expect(s.phase).toBe("idle");
    expect(s.rollOptions).toBeNull();
    expect(s.turnIndex).toBe(18);
    expect(s.cycleIndex).toBe(8); // el ciclo lo cierra el turno de P2
    expect(s.globalRollCount).toBe(40); // ya avanzó en ROLL
    // Nada de lo que describe una jugada:
    expect(s.lastMove).toBe(s0.lastMove);
    expect(s.decisionSignature).toBe(s0.decisionSignature);
    expect(s.karmaTotal).toBe(s0.karmaTotal);
    expect(s.pattern).toBe(s0.pattern);
  });

  it("un PASS de P2 cierra el ciclo", () => {
    const s = act(stalled("P2"), { type: "PASS_NO_MOVES", player: "P2" });
    expect(s.turn).toBe("P1");
    expect(s.cycleIndex).toBe(9);
  });

  it("se rechaza si existe alguna jugada legal", () => {
    const s0 = base({ phase: "rolled", rollOptions: [3, 4], turn: "P1" });
    expect(hasAnyLegalMove(s0, "P1")).toBe(true);
    expect(act(s0, { type: "PASS_NO_MOVES", player: "P1" })).toBe(s0);
  });

  it("se rechaza si no es tu turno o si no has tirado", () => {
    const s0 = stalled("P1");
    expect(act(s0, { type: "PASS_NO_MOVES", player: "P2" })).toBe(s0);
    const idle = { ...s0, phase: "idle" as const, rollOptions: null };
    expect(act(idle, { type: "PASS_NO_MOVES", player: "P1" })).toBe(idle);
  });

  it("el pase automático por no tener piezas activas también hace avanzar el turno", () => {
    const s0 = base({
      turn: "P1",
      turnIndex: 4,
      pieces: {
        P1: { pig: venom(-1, true, 2), snake: venom(-1, true, 2), rooster: venom(-1, true, 2) },
        P2: { pig: venom(12), snake: venom(13), rooster: venom(14) },
      },
    });
    const s = act(s0, { type: "ROLL" });
    expect(s.turn).toBe("P2");
    expect(s.turnIndex).toBe(5);
  });
});

describe("Bruno en el tutorial (3 oct 2026)", () => {
  it("en PLAY WITH BUDDHA Bruno llega a las 16 tiradas; en partida normal, a las 30", async () => {
    const { evaluateGenesisToBruno } = await import("../../orchestrator/Orchestrator");
    const sig = initialState.decisionSignature.P1;
    const all = { ...sig, pigTrace: 1, snakeTrace: 1, roosterTrace: 1 };
    const base = {
      ...initialState,
      genesisUIComplete: true,
      globalRollCount: 16,
      decisionSignature: { P1: all, P2: all },
    } as GameState;
    expect(evaluateGenesisToBruno({ ...base, tutorialMode: true })).toBe(true);
    expect(evaluateGenesisToBruno({ ...base, tutorialMode: false })).toBe(false);
    expect(evaluateGenesisToBruno({ ...base, globalRollCount: 30 })).toBe(true);
  });

  it("reiniciar conserva el modo tutorial", () => {
    const s = reducer({ ...initialState, tutorialMode: true }, { type: "RESET" } as never);
    expect(s.tutorialMode).toBe(true);
  });
});

describe("saltos de prueba (4 oct 2026)", () => {
  it("saltar a Oriol deja 3 Avatares por color, era oriol y Fase 2", () => {
    const s = reducer(initialState, { type: "TESTER_SKIP_TO_STEP", step: 3 } as never);
    expect(s.cosmicClock.era).toBe("oriol");
    expect(s.brunoRevealed).toBe(true);
    for (const pl of ["P1", "P2"] as const) {
      expect(Object.values(s.realmPieces[pl]).filter((p) => p?.unlocked).length).toBe(3);
      expect(s.realmProgress[pl].currentRealmStep).toBe(3);
    }
  });
});

describe("Lotos: solo cuando Humanos se destapa (Marino)", () => {
  const inHumans = (extra = {}) => avatar("hell", 22, extra);
  it("antes de Marino no hay loto; al llegar Marino florecen los limpios", () => {
    const before = base({
      cosmicClock: { era: "margot", progress: 0, transitionSequence: 2 },
      realmPieces: {
        P1: { hell: inHumans(), hungry_ghost: avatar("hungry_ghost", 23, { everCaptured: true }) },
        P2: {},
      },
    });
    expect(getDharma777EligibleTargets(before, "P1")).toEqual([]);
    const after = revealHumansLotuses(before, {
      ...before,
      cosmicClock: { era: "marino", progress: 0, transitionSequence: 3 },
    });
    expect(after.consolidatedAvatars.P1?.hell).toBe(true);
    expect(after.consolidatedAvatars.P1?.hungry_ghost).toBeFalsy();
  });
});
