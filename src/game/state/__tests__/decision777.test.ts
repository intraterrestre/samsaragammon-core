// 21 nov 2026 — el cartel "¡CAPTURAR O PERDONAR!" promete consecuencias
// concretas; aquí se comprueba que cada botón hace exactamente eso.
//   PERDONAR: el Avatar rival se salva, tu ficha NO se mueve, tu Avatar
//             elegido recibe el loto y el turno pasa.
//   CAPTURAR: el Avatar rival va a Mara y no hay loto.
//   CAPTURAR a uno que lleva Nidana (atacando con un Veneno): se salva,
//             pierde la Nidana y esta queda en el tablero; no hay loto.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getDharma777Opportunity, getDharma777EligibleTargets } from "../../dharma777";
import { NIDANA_LIST } from "../../nidanas";
import type { GameState, MoveOption, RealmPieceKind } from "../../types";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const act = (s: GameState, a: object) => reducer(s, a as never);
const venom = (pos: number) => ({ pos, inLimbo: false, maraLevel: null });
const avatar = (kind: RealmPieceKind, pos: number, extra: object = {}) => ({
  id: `x-${kind}`, kind, pos, inLimbo: false, maraLevel: null, unlocked: true, ...extra,
});

/** Blancas mueven; su Cerdo (20) alcanza con un 1 a Bruno negro (21, Humanos). */
function setup(rivalCarries = false): { s: GameState; option: MoveOption } {
  const s = {
    ...initialState,
    brunoRevealed: true,
    genesisUIComplete: true,
    gameStartedAt: 1,
    gameId: "test",
    cosmicClock: { era: "marino", progress: 0, transitionSequence: 4 },
    turn: "P1",
    phase: "rolled",
    rollOptions: [1, 5],
    globalRollCount: 100,
    pieces: {
      P1: { pig: venom(20), snake: venom(4), rooster: venom(5) },
      P2: { pig: venom(15), snake: venom(16), rooster: venom(17) },
    },
    realmPieces: {
      P1: { hell: avatar("hell", 23, { everCaptured: true }) },
      P2: { hungry_ghost: avatar("hungry_ghost", 21) },
    },
    realmProgress: {
      P1: initialState.realmProgress.P1,
      P2: { ...initialState.realmProgress.P2, currentRealmStep: 6 },
    },
    avatarNidana: { P1: {}, P2: rivalCarries ? { hungry_ghost: NIDANA_LIST[3] } : {} },
    boardNidanas: {},
    consolidatedAvatars: { P1: {}, P2: {} },
  } as unknown as GameState;
  const option = getMoveOptionsForPlayer(s, "P1").find((o) => o.pieceKind === "pig" && o.toPos === 21) as MoveOption;
  return { s, option };
}

describe("¡CAPTURAR O PERDONAR! — cada botón hace lo que dice", () => {
  it("se ofrece: captura de Bruno en Humanos, con el Avatar propio en Humanos elegible", () => {
    const { s, option } = setup();
    expect(option.meaning).toBe("IMPACT");
    expect(getDharma777Opportunity(s, "P1", option)).toBe("hungry_ghost");
    expect(getDharma777EligibleTargets(s, "P1")).toEqual(["hell"]);
  });

  it("PERDONAR: el rival se salva, tu ficha no se mueve, tu Avatar gana el loto y el turno pasa", () => {
    const { s, option } = setup();
    const after = act(s, { type: "DECLARE_DHARMA_777", player: "P1", option, allOptions: [option], targetAvatar: "hell" });
    expect(after.realmPieces.P2.hungry_ghost).toMatchObject({ pos: 21, inLimbo: false });
    expect(after.pieces.P1.pig.pos).toBe(20);
    expect(after.consolidatedAvatars.P1.hell).toBe(true);
    expect(after.turn).toBe("P2");
  });

  it("CAPTURAR: el rival va a Mara y no hay loto", () => {
    const { s, option } = setup();
    const after = act(s, { type: "CONSCIOUS_MOVE", option, allOptions: getMoveOptionsForPlayer(s, "P1") });
    expect(after.realmPieces.P2.hungry_ghost?.inLimbo).toBe(true);
    expect(after.consolidatedAvatars.P1.hell).toBeFalsy();
  });

  it("CAPTURAR a quien lleva Nidana con un Veneno: se salva, pierde la Nidana y queda en el tablero", () => {
    const { s, option } = setup(true);
    const after = act(s, { type: "CONSCIOUS_MOVE", option, allOptions: getMoveOptionsForPlayer(s, "P1") });
    expect(after.realmPieces.P2.hungry_ghost?.inLimbo).toBe(false);
    expect(after.avatarNidana.P2.hungry_ghost).toBeUndefined();
    expect(Object.values(after.boardNidanas)).toContain(NIDANA_LIST[3]);
    expect(after.consolidatedAvatars.P1.hell).toBeFalsy();
  });
});
