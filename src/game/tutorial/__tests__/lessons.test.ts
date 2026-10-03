import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../../state/reducer";
import { initialState } from "../../state/state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getAllLegalMoves, isPhase2 } from "../../rules/legalMoves";
import { LESSONS, pickLesson, type LessonId } from "../lessons";
import type { GameState } from "../../types";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const none = new Set<LessonId>();

describe("lecciones de Buddha", () => {
  it("al empezar, primero los tres animales y después tirar", () => {
    expect(pickLesson(initialState, "P1", none)?.id).toBe("threePoisons");
    expect(pickLesson(initialState, "P1", new Set<LessonId>(["threePoisons"]))?.id).toBe("sixRealms");
    expect(pickLesson(initialState, "P1", new Set<LessonId>(["threePoisons", "sixRealms"]))?.id).toBe("roll");
  });

  it("al llegar Bruno, primero cuánto tiempo pasó", () => {
    const s = { ...initialState, brunoRevealed: true } as GameState;
    expect(pickLesson(s, "P1", none)?.id).toBe("brunoEra");
  });

  it("tras tirar, la lección es mover", () => {
    const s = { ...initialState, phase: "rolled", rollOptions: [2, 5] } as GameState;
    expect(pickLesson(s, "P1", new Set<LessonId>(["roll"]))?.id).toBe("move");
  });

  it("una lección ya vista no se repite", () => {
    const seen = new Set<LessonId>(LESSONS.map((l) => l.id));
    expect(pickLesson(initialState, "P1", seen)).toBeNull();
  });

  it("con la partida ganada, Buddha calla", () => {
    expect(pickLesson({ ...initialState, winner: "P1" }, "P1", none)).toBeNull();
  });

  it("las lecciones de historia tienen prioridad sobre las básicas", () => {
    const s = {
      ...initialState,
      brunoRevealed: true,
      realmPieces: {
        P1: {
          hungry_ghost: {
            id: "P1-hungry_ghost",
            kind: "hungry_ghost",
            pos: 0,
            inLimbo: false,
            maraLevel: null,
            unlocked: true,
          },
        },
        P2: {},
      },
    } as GameState;
    expect(pickLesson(s, "P1", new Set<LessonId>(["brunoEra"]))?.id).toBe("firstAvatar");
  });

  it("en partidas reales aparecen casi todas las lecciones y ninguna falla", () => {
    const shown = new Set<LessonId>();
    for (let game = 0; game < 4; game++) {
      let s = reducer(initialState, { type: "RESET" } as never);
      s = reducer(s, { type: "SET_GENESIS_UI_COMPLETE" } as never);
      for (let step = 0; step < 800 && !s.winner; step++) {
        for (const l of LESSONS) if (l.holds(s, s.turn)) shown.add(l.id);
        if (s.phase === "idle") {
          s = reducer(s, { type: "ROLL" } as never);
          continue;
        }
        const legal = getAllLegalMoves(s, s.turn);
        if (legal.length === 0) {
          s = { ...s, phase: "idle", rollOptions: null, turn: s.turn === "P1" ? "P2" : "P1" };
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
    }
    // Las básicas y las de historia tienen que aparecer siempre.
    for (const id of ["roll", "move", "capture", "mara", "maraReturn", "firstAvatar", "secondAvatar", "phase2"] as LessonId[]) {
      expect(shown.has(id)).toBe(true);
    }
  }, 60000);
});

describe("lecciones que se repiten (playtest 3 oct 2026)", () => {
  // Captura real: P1 come una pieza de P2 que va a Mara.
  const captured = (turnIndex: number) =>
    ({
      ...initialState,
      turnIndex,
      lastMove: { player: "P1", didCapture: true, capturedPieceKind: "pig", toPos: 7 },
      pieces: {
        ...initialState.pieces,
        P2: { ...initialState.pieces.P2, pig: { ...initialState.pieces.P2.pig, inLimbo: true } },
      },
    }) as unknown as GameState;

  it("cada captura vuelve a explicar Mara, hasta 4 veces", () => {
    const seen = new Map<LessonId, number>([["threePoisons", 1], ["sixRealms", 1]]);
    const keys = new Map<LessonId, string>();
    for (let i = 0; i < 4; i++) {
      const s = captured(10 + i);
      const l = pickLesson(s, "P1", seen, keys);
      expect(l?.id).toBe("mara");
      seen.set("mara", (seen.get("mara") ?? 0) + 1);
      keys.set("mara", l!.eventKey!(s));
      // la misma captura no la repite
      expect(pickLesson(s, "P1", seen, keys)?.id).not.toBe("mara");
    }
    expect(pickLesson(captured(20), "P1", seen, keys)?.id).not.toBe("mara");
  });

  it("si la Nidana la salvó, no dice que fue a Mara", () => {
    const s = { ...captured(3), pieces: initialState.pieces } as GameState;
    expect(pickLesson(s, "P1", new Map())?.id).not.toBe("mara");
  });

  it("la moneda de Nidana se explica cuando aparece en el tablero", () => {
    const s = { ...initialState, brunoRevealed: true, boardNidanas: { 9: "CRAVING" } } as unknown as GameState;
    expect(pickLesson(s, "P1", new Map([["brunoEra", 1]]))?.id).toBe("nidanaSpawn");
  });

  it("el formato viejo de lecciones vistas sigue sirviendo", () => {
    expect(pickLesson(initialState, "P1", new Set<LessonId>(["roll"]))?.id).not.toBe("roll");
  });
});

describe("lecciones urgentes", () => {
  it("con una línea roja disponible, la captura puede interrumpir", () => {
    const s = {
      ...initialState,
      phase: "rolled",
      rollOptions: [1, 2],
      pieces: {
        P1: { ...initialState.pieces.P1, pig: { pos: 3, inLimbo: false, maraLevel: null } },
        P2: { ...initialState.pieces.P2, pig: { pos: 4, inLimbo: false, maraLevel: null } },
      },
    } as unknown as GameState;
    expect(pickLesson(s, "P1", new Map(), new Map(), true)?.id).toBe("capture");
  });

  it("solo las urgentes interrumpen", () => {
    expect(pickLesson(initialState, "P1", new Map(), new Map(), true)).toBeNull();
  });
});

describe("el espejo del Buda azul", () => {
  it("al entrar Oriol, Buddha explica el espejo", () => {
    const s = {
      ...initialState,
      brunoRevealed: true,
      cosmicClock: { ...initialState.cosmicClock, era: "oriol" },
    } as unknown as GameState;
    expect(pickLesson(s, "P1", new Set<LessonId>(["brunoEra"]))?.id).toBe("oriol");
    expect(pickLesson(s, "P1", new Set<LessonId>(["brunoEra", "oriol"]))?.id).toBe("mirror");
  });
});

describe("Bruno todavía duerme", () => {
  it("si un jugador no movió la Serpiente, Buddha lo dice", () => {
    const sig = initialState.decisionSignature.P1;
    const s = {
      ...initialState,
      globalRollCount: 10,
      decisionSignature: {
        P1: { ...sig, pigTrace: 2, snakeTrace: 0, roosterTrace: 1 },
        P2: { ...sig, pigTrace: 1, snakeTrace: 1, roosterTrace: 1 },
      },
    } as GameState;
    const seen = new Set<LessonId>(["threePoisons", "sixRealms"]);
    const l = pickLesson(s, "P1", seen);
    expect(l?.id).toBe("brunoWaiting");
    const vars = l!.vars!(s, "P1", (k) => (k === "color.P1" ? "Blancas" : k === "venom.snake" ? "Serpiente" : k));
    expect(vars.missing).toBe("Blancas: Serpiente");
  });
});

describe("nacimientos en hot-seat", () => {
  it("si Margot nace para las negras con turno de las blancas, el cartel sale igual", () => {
    const s = {
      ...initialState,
      brunoRevealed: true,
      turn: "P1",
      realmPieces: {
        P1: {},
        P2: { hell: { id: "P2-hell", kind: "hell", pos: 3, inLimbo: false, maraLevel: null, unlocked: true } },
      },
    } as unknown as GameState;
    const seen = new Set<LessonId>(["brunoEra"]);
    expect(pickLesson(s, "P1", seen)?.id).toBe("secondAvatar");
  });
});
