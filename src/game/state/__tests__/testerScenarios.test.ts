// 20 nov 2026 — modo de pruebas: los escenarios deben ser estados VÁLIDOS
// (como podrían darse jugando), REPRODUCIBLES (iguales desde cualquier
// partida) y JUGABLES (permiten probar lo que prometen).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import { TESTER_SCENARIOS, type TesterScenario } from "../../tester/scenarios";
import { getAllLegalMoves, type LegalMove } from "../../rules/legalMoves";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getBotActions, botProposeTrade } from "../../bot/buddhaBot";
import { humansRevealed } from "../../rules/humansReveal";
import { canonicalRealmFromPos } from "../../../UI/realm";
import { REALM_PIECE_ORDER, type GameState, type PlayerId } from "../../types";
import { NIDANA_LIST } from "../../nidanas";

const original = { log: console.log, warn: console.warn };
beforeAll(() => { console.log = () => {}; console.warn = () => {}; });
afterAll(() => { console.log = original.log; console.warn = original.warn; });

const act = (s: GameState, a: object) => reducer(s, a as never);
const start = () => act({ ...initialState, gameStartedAt: 1, gameId: "t" } as GameState, { type: "SET_GENESIS_UI_COMPLETE" });
const scenario = (name: TesterScenario, from: GameState = start()) => act(from, { type: "TESTER_SCENARIO", name });
function applyMove(s: GameState, p: PlayerId, m: LegalMove): GameState {
  const sel = {
    ...s,
    selectedPiece: { ...s.selectedPiece, [p]: m.avatar ?? m.option.pieceKind },
    selectedVenom: { ...s.selectedVenom, [p]: m.avatar ? m.venom : null },
  } as GameState;
  return act(sel, { type: "CONSCIOUS_MOVE", option: m.option, allOptions: getMoveOptionsForPlayer(sel, p) });
}
function anyRoll<T>(s: GameState, f: (t: GameState) => T | null): T | null {
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) {
    const r = f({ ...s, phase: "rolled", rollOptions: [a, b] } as GameState);
    if (r) return r;
  }
  return null;
}

describe("modo de pruebas: escenarios", () => {
  for (const name of TESTER_SCENARIOS) {
    it(`${name}: estado válido`, () => {
      const s = scenario(name);
      expect(humansRevealed(s)).toBe(true);
      expect(s.realmProgress.P1.currentRealmStep).toBe(6);
      expect(s.realmProgress.P2.currentRealmStep).toBe(6);
      const owner = new Map<number, PlayerId>();
      for (const p of ["P1", "P2"] as PlayerId[]) {
        const venomCells = new Set<number>();
        for (const v of ["pig", "snake", "rooster"] as const) {
          const pc = s.pieces[p][v];
          expect(pc.inLimbo).toBe(false);
          expect(pc.pos).toBeGreaterThanOrEqual(0);
          expect(pc.pos).toBeLessThan(24);
          expect(venomCells.has(pc.pos)).toBe(false);
          venomCells.add(pc.pos);
          expect(owner.get(pc.pos) ?? p).toBe(p);
          owner.set(pc.pos, p);
        }
        for (const k of REALM_PIECE_ORDER) {
          const a = s.realmPieces[p][k]!;
          expect(a.unlocked).toBe(true);
          expect(a.pos).toBeGreaterThanOrEqual(0);
          expect(a.pos).toBeLessThan(24);
          expect(owner.get(a.pos) ?? p).toBe(p); // nunca una casilla con piezas de los dos
          owner.set(a.pos, p);
          // Un loto sin captura previa solo existe en Humanos (llegada limpia).
          if (s.consolidatedAvatars[p]?.[k] && !a.everCaptured) {
            expect(canonicalRealmFromPos(a.pos)).toBe("humans");
          }
        }
        // Nidanas: cada una una sola vez en todo el tablero.
      }
      const all = [...Object.values(s.avatarNidana.P1), ...Object.values(s.avatarNidana.P2)].filter(Boolean);
      expect(new Set(all).size).toBe(all.length);
      expect(s.winner).toBeNull();
      expect(getAllLegalMoves({ ...s, phase: "rolled", rollOptions: [3, 4] } as GameState, "P1").length).toBeGreaterThan(0);
    });

    it(`${name}: reproducible desde cualquier partida`, () => {
      let mid = start();
      for (let i = 0; i < 9; i++) mid = act({ ...mid, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
      const a = scenario(name);
      const b = scenario(name, mid);
      for (const key of ["pieces", "realmPieces", "consolidatedAvatars", "avatarNidana", "boardNidanas", "turn", "phase"] as const) {
        expect(b[key]).toEqual(a[key]);
      }
    });
  }

  it("final: hay tiradas con las que Blancas alcanzan Nirvana", () => {
    const s = scenario("final");
    const won = anyRoll(s, (t) => {
      for (const m of getAllLegalMoves(t, "P1")) if (applyMove(t, "P1", m).winner === "P1") return true;
      return null;
    });
    expect(won).toBe(true);
  });

  it("666: se puede proponer con las Nidanas 3 y 4, y hay tiradas para ganarlo", () => {
    const s = scenario("666");
    const req = act(s, { type: "REQUEST_SNAKE_BET", player: "P1", targetAvatar: "hungry_ghost", stake: [NIDANA_LIST[2], NIDANA_LIST[3]] });
    expect(req.pendingSnakeBet?.stake).toEqual([NIDANA_LIST[2], NIDANA_LIST[3]]);
    const shot = anyRoll(s, (t) =>
      getAllLegalMoves(t, "P1").some((m) => m.option.meaning === "IMPACT" && m.venom === "snake") ? true : null
    );
    expect(shot).toBe(true);
  });

  it("777: hay tiradas en las que Blancas pueden perdonar", () => {
    const s = scenario("777");
    const ok = anyRoll(s, (t) => (getBotActions(t, "P1").some((a) => a.kind === "dharma777") ? true : null));
    expect(ok).toBe(true);
  });

  it("fandango: hay tratos posibles en los dos sentidos", () => {
    const s = scenario("fandango");
    expect(botProposeTrade(s, "P2")).not.toBeNull();
    const t = act(s, { type: "SEND_TRADE_OFFER", player: "P1", offer: NIDANA_LIST[6], want: NIDANA_LIST[3] });
    expect(t.pendingTrade).not.toBeNull();
  });

  it("saltar a Whitman: los seis Avatares por color", () => {
    const s = act(start(), { type: "TESTER_SKIP_TO_STEP", step: 6 });
    expect(s.realmProgress.P1.currentRealmStep).toBe(6);
    for (const p of ["P1", "P2"] as PlayerId[]) {
      expect(REALM_PIECE_ORDER.every((k) => s.realmPieces[p][k]?.unlocked)).toBe(true);
    }
  });
});
