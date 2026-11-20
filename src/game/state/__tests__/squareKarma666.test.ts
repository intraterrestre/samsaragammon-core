// 20 nov 2026 — Cierre de Square Karma 666 (aprobado por Federico).
//
//   · Ganar: capturar con la Serpiente un AVATAR rival, en cualquier reino,
//     en uno de los 3 turnos propios del apostador → el Avatar objetivo
//     recibe su loto. Capturar un Veneno no basta.
//   · Perder: las Nidanas apostadas que el apostador TODAVÍA porta vuelven
//     al tablero, a casillas sin pieza y sin otra Nidana. No pasan al rival.
//   · Las Nidanas apostadas no se pueden intercambiar en Fandango.
//   · Si el objetivo obtiene su loto por otra vía (777), la apuesta se
//     cancela sin penalización.
//   · Una Nidana que aparece nunca sobrescribe a otra.
//
// Cada caso se prueba con Blancas (P1) y con Negras (P2) como apostador:
// el estado de Negras es el espejo exacto del de Blancas (P1<->P2,
// pos -> 21-pos, que deja Humanos en su sitio e invierte el sentido).

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getAllLegalMoves, type LegalMove } from "../../rules/legalMoves";
import { canonicalRealmFromPos } from "../../../UI/realm";
import { NIDANA_LIST, type NidanaId } from "../../nidanas";
import type { GameState, PlayerId, RealmPieceKind } from "../../types";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const act = (s: GameState, a: object) => reducer(s, a as never);
const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const R = (p: number) => (p < 0 ? p : (21 - p + 24) % 24);
const SW: Record<string, string> = { P1: "P2", P2: "P1" };
const PLAYER_KEYS = new Set(["turn", "byPlayer", "fromPlayer", "winner", "player"]);
function mirror<T>(x: T, key = ""): T {
  if (Array.isArray(x)) return x.map((v) => mirror(v)) as T;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const hasP = "P1" in o && "P2" in o;
    for (const [k, v] of Object.entries(o)) {
      let nk = k;
      if (hasP && (k === "P1" || k === "P2")) nk = SW[k];
      if (key === "boardNidanas" && /^\d+$/.test(k)) nk = String(R(Number(k)));
      out[nk] = mirror(v, k);
    }
    return out as T;
  }
  if (typeof x === "number" && /pos$/i.test(key)) return R(x) as T;
  if (typeof x === "string" && PLAYER_KEYS.has(key) && SW[x]) return SW[x] as T;
  return x;
}

const venom = (pos: number, inLimbo = false) => ({ pos, inLimbo, maraLevel: inLimbo ? 1 : null });
const avatar = (kind: RealmPieceKind, pos: number, extra: object = {}) => ({
  id: `x-${kind}`, kind, pos, inLimbo: false, maraLevel: null, unlocked: true, ...extra,
});
const N1 = NIDANA_LIST[0];
const N2 = NIDANA_LIST[1];
const N3 = NIDANA_LIST[5];

/** Blancas apuestan por su Bruno (Humanos, capturado alguna vez, sin loto). */
function whiteTemplate(): GameState {
  return {
    ...initialState,
    brunoRevealed: true,
    genesisUIComplete: true,
    gameStartedAt: 1,
    gameId: "test",
    cosmicClock: { era: "marino", progress: 0, transitionSequence: 4 },
    turn: "P1",
    phase: "idle",
    rollOptions: null,
    globalRollCount: 100, // lejos de un múltiplo de 3 justo después: ver quiet()
    realmProgress: {
      P1: { ...initialState.realmProgress.P1, currentRealmStep: 4, stageStartedAtRoll: 100 },
      P2: { ...initialState.realmProgress.P2, currentRealmStep: 4, stageStartedAtRoll: 100 },
    },
    pieces: {
      P1: { pig: venom(3), snake: venom(4), rooster: venom(5) },
      P2: { pig: venom(15), snake: venom(16), rooster: venom(17) },
    },
    realmPieces: {
      P1: {
        hungry_ghost: avatar("hungry_ghost", 22, { everCaptured: true }),
        hell: avatar("hell", 8),
        animals: avatar("animals", 9),
      },
      P2: {
        hungry_ghost: avatar("hungry_ghost", 11),
        hell: avatar("hell", 13),
        animals: avatar("animals", 18),
      },
    },
    avatarNidana: { P1: { hungry_ghost: N1, hell: N2 }, P2: { animals: N3 } },
    boardNidanas: {},
  } as unknown as GameState;
}
const template = (bettor: PlayerId) =>
  bettor === "P1" ? whiteTemplate() : mirror(whiteTemplate());

function applyMove(s: GameState, p: PlayerId, m: LegalMove): GameState {
  const sel = {
    ...s,
    selectedPiece: { ...s.selectedPiece, [p]: m.avatar ?? m.option.pieceKind },
    selectedVenom: { ...s.selectedVenom, [p]: m.avatar ? m.venom : null },
  } as GameState;
  return act(sel, { type: "CONSCIOUS_MOVE", option: m.option, allOptions: getMoveOptionsForPlayer(sel, p) });
}
function enemyAt(s: GameState, p: PlayerId, pos: number): boolean {
  const o = other(p);
  for (const v of Object.values(s.pieces[o])) if (!v.inLimbo && v.pos === pos) return true;
  for (const a of Object.values(s.realmPieces[o])) if (a && a.unlocked && !a.inLimbo && a.pos === pos) return true;
  return false;
}
/** Tira y hace una jugada sin capturar (o PASS si no hay ninguna). */
function quiet(s: GameState): GameState {
  const p = s.turn;
  s = act({ ...s, phase: "idle", rollOptions: null }, { type: "ROLL" });
  if (s.turn !== p || s.phase !== "rolled") return s;
  // Bruno (el objetivo de la apuesta) se queda quieto en Humanos.
  const moves = getAllLegalMoves(s, p).filter(
    (m) =>
      m.option.meaning !== "IMPACT" &&
      !enemyAt(s, p, m.option.toPos) &&
      m.avatar !== "hungry_ghost" &&
      m.option.pieceKind !== "hungry_ghost"
  );
  if (!moves.length) {
    const any = getAllLegalMoves(s, p);
    if (!any.length) return act(s, { type: "PASS_NO_MOVES", player: p });
    throw new Error("solo hay capturas");
  }
  return applyMove(s, p, moves[0]);
}
function accepted(bettor: PlayerId): GameState {
  let s = act(template(bettor), { type: "REQUEST_SNAKE_BET", player: bettor, targetAvatar: "hungry_ghost" });
  expect(s.pendingSnakeBet?.byPlayer).toBe(bettor);
  s = quiet(s);
  s = act(s, { type: "ACCEPT_SNAKE_BET" });
  expect(s.snakeBet?.byPlayer).toBe(bettor);
  return s;
}
/** Deja pasar los 3 turnos del apostador sin capturar. */
function runOut(s: GameState): GameState {
  for (let i = 0; i < 8 && s.snakeBet; i++) s = quiet(s);
  expect(s.snakeBet).toBeNull();
  return s;
}
const carried = (s: GameState, p: PlayerId) =>
  Object.values(s.avatarNidana[p]).filter(Boolean) as NidanaId[];
const onBoard = (s: GameState) => Object.values(s.boardNidanas).filter(Boolean) as NidanaId[];
function pieceAt(s: GameState, pos: number): boolean {
  for (const p of ["P1", "P2"] as PlayerId[]) {
    for (const v of Object.values(s.pieces[p])) if (!v.inLimbo && v.pos === pos) return true;
    for (const a of Object.values(s.realmPieces[p])) if (a && a.unlocked && !a.inLimbo && a.pos === pos) return true;
  }
  return false;
}
/** Todas las Nidanas del mundo, cada una una sola vez. */
function allNidanas(s: GameState): NidanaId[] {
  return [...onBoard(s), ...carried(s, "P1"), ...carried(s, "P2")].sort();
}

for (const bettor of ["P1", "P2"] as PlayerId[]) {
  const rival = other(bettor);
  const color = bettor === "P1" ? "Blancas" : "Negras";

  describe(`Square Karma 666 — apuesta ${color}`, () => {
    it("al aceptar, las 2 Nidanas apostadas son las que porta el apostador", () => {
      const s = accepted(bettor);
      expect([...s.snakeBet!.stake].sort()).toEqual([N1, N2].sort());
    });

    it("PERDER: las 2 vuelven al tablero, a casillas libres; el rival no recibe nada", () => {
      for (let rep = 0, done = 0; done < 40 && rep < 200; rep++) {
        const before = accepted(bettor);
        const rivalBefore = carried(before, rival).sort();
        let s: GameState;
        try {
          s = runOut(before);
        } catch (e) {
          // Partida de prueba en la que solo quedaban capturas: se descarta.
          if ((e as Error).message === "solo hay capturas") continue;
          throw e;
        }
        done++;
        expect(carried(s, bettor)).not.toContain(N1);
        expect(carried(s, bettor)).not.toContain(N2);
        expect(onBoard(s)).toContain(N1);
        expect(onBoard(s)).toContain(N2);
        // El rival puede haber recogido Nidanas NUEVAS por el camino, pero
        // ninguna de las apostadas, y conserva las suyas.
        expect(carried(s, rival)).not.toContain(N1);
        expect(carried(s, rival)).not.toContain(N2);
        expect(carried(s, rival)).toEqual(expect.arrayContaining(rivalBefore));
        for (const [pos, id] of Object.entries(s.boardNidanas)) {
          if (id === N1 || id === N2) expect(pieceAt(s, Number(pos))).toBe(false);
        }
        // ninguna Nidana duplicada ni perdida
        const all = allNidanas(s);
        expect(new Set(all).size).toBe(all.length);
        expect(all).toEqual(expect.arrayContaining([N1, N2, N3]));
      }
    });

    it("PERDER: la regla solo toca las Nidanas (misma jugada con y sin apuesta)", () => {
      let s = accepted(bettor);
      while (!(s.turn === bettor && s.snakeBet?.roundsLeft === 1)) s = quiet(s);
      s = act({ ...s, phase: "idle", rollOptions: null }, { type: "ROLL" });
      const m = getAllLegalMoves(s, bettor).find(
        (x) => x.option.meaning !== "IMPACT" && !enemyAt(s, bettor, x.option.toPos) && x.avatar !== "hungry_ghost"
      )!;
      const rnd = vi.spyOn(Math, "random").mockReturnValue(0.42);
      const now = vi.spyOn(Date, "now").mockReturnValue(1_800_000_000_000);
      const withBet = applyMove(s, bettor, m);
      const withoutBet = applyMove({ ...s, snakeBet: null }, bettor, m);
      rnd.mockRestore();
      now.mockRestore();
      expect(withBet.snakeBet).toBeNull();
      const strip = (x: GameState) => {
        const { avatarNidana, boardNidanas, snakeBet, ...rest } = x;
        void avatarNidana; void boardNidanas; void snakeBet;
        return rest;
      };
      expect(strip(withBet)).toEqual(strip(withoutBet));
      expect(withBet.winner).toBe(withoutBet.winner);
    });

    it("PERDER tras perder una apostada (robada por el rival): solo vuelve la otra", () => {
      let s = accepted(bettor);
      // Simula el robo por escudo roto: N1 pasa al Avatar atacante del rival.
      const victim = (Object.keys(s.avatarNidana[bettor]) as RealmPieceKind[]).find(
        (r) => s.avatarNidana[bettor][r] === N1
      )!;
      const bettorN = { ...s.avatarNidana[bettor] };
      delete bettorN[victim];
      s = {
        ...s,
        avatarNidana: { ...s.avatarNidana, [bettor]: bettorN, [rival]: { ...s.avatarNidana[rival], hell: N1 } },
      };
      s = runOut(s);
      expect(s.avatarNidana[rival].hell).toBe(N1);
      expect(onBoard(s)).toContain(N2);
      expect(onBoard(s)).not.toContain(N1);
    });

    it("PERDER sin ninguna apostada en la mano: la apuesta termina sin más", () => {
      let s = accepted(bettor);
      s = { ...s, avatarNidana: { ...s.avatarNidana, [bettor]: {} }, boardNidanas: { 6: N1, 7: N2 } };
      const end = runOut(s);
      expect(onBoard(end).sort()).toEqual(expect.arrayContaining([N1, N2]));
      expect(onBoard(end).filter((x) => x === N1 || x === N2).length).toBe(2);
    });

    /** Turno del apostador con Margot y Oriol apilados (impulso Gallo,
     *  pueden capturar) y una pieza rival delante de su Serpiente. */
    function snakeShot(put: (s: GameState, target: number) => GameState): { s: GameState; m: LegalMove; target: number } | null {
      let s = quiet(accepted(bettor)); // turno del rival → turno del apostador
      expect(s.turn).toBe(bettor);
      const stackPos = bettor === "P1" ? 8 : R(8);
      s = {
        ...s,
        realmPieces: {
          ...s.realmPieces,
          [bettor]: {
            ...s.realmPieces[bettor],
            hell: { ...s.realmPieces[bettor].hell!, pos: stackPos },
            animals: { ...s.realmPieces[bettor].animals!, pos: stackPos },
          },
        },
      } as GameState;
      const snakePos = s.pieces[bettor].snake.pos;
      const step = bettor === "P1" ? 1 : -1;
      for (let d = 1; d <= 6; d++) {
        const target = (((snakePos + step * d) % 24) + 24) % 24;
        if (pieceAt(s, target) || canonicalRealmFromPos(target) === "humans") continue;
        const t = put({ ...s, phase: "rolled", rollOptions: [d, d === 6 ? 5 : 6] } as GameState, target);
        const m = getAllLegalMoves(t, bettor).find(
          (x) => x.option.meaning === "IMPACT" && x.option.toPos === target && (x.venom === "snake" || x.option.pieceKind === "snake")
        );
        if (m) return { s: t, m, target };
      }
      return null;
    }

    it("GANAR: la Serpiente captura un Avatar rival FUERA de Humanos → loto; conserva sus Nidanas", () => {
      const shot = snakeShot((t, target) => ({
        ...t,
        realmPieces: { ...t.realmPieces, [rival]: { ...t.realmPieces[rival], hungry_ghost: avatar("hungry_ghost", target) } },
      } as GameState));
      expect(shot, "no se encontró ninguna captura con Serpiente de prueba").not.toBeNull();
      expect(canonicalRealmFromPos(shot!.target)).not.toBe("humans");
      const won = applyMove(shot!.s, bettor, shot!.m);
      expect(won.snakeBet).toBeNull();
      expect(won.consolidatedAvatars[bettor].hungry_ghost).toBe(true);
      expect(carried(won, bettor)).toEqual(expect.arrayContaining([N1, N2]));
    });

    it("NO GANA: la Serpiente captura un Veneno rival → la apuesta sigue y gasta el turno", () => {
      const shot = snakeShot((t, target) => ({
        ...t,
        pieces: { ...t.pieces, [rival]: { ...t.pieces[rival], pig: venom(target) } },
      } as GameState));
      expect(shot, "no se encontró ninguna captura de Veneno de prueba").not.toBeNull();
      const before = shot!.s.snakeBet!.roundsLeft;
      const after = applyMove(shot!.s, bettor, shot!.m);
      expect(after.pieces[rival].pig.inLimbo).toBe(true); // la captura ocurrió
      expect(after.consolidatedAvatars[bettor].hungry_ghost).toBeFalsy();
      expect(after.snakeBet?.roundsLeft).toBe(before - 1);
    });

    it("FANDANGO: las apostadas no se pueden ofrecer ni pedir; las demás sí", () => {
      let s = accepted(bettor);
      // Turno del rival tras aceptar: el rival intenta pedir una apostada.
      expect(s.turn).toBe(rival);
      const askStaked = act(s, { type: "SEND_TRADE_OFFER", player: rival, offer: N3, want: N1 });
      expect(askStaked.pendingTrade).toBeNull();
      s = quiet(s); // turno del apostador
      const offerStaked = act(s, { type: "SEND_TRADE_OFFER", player: bettor, offer: N2, want: N3 });
      expect(offerStaked.pendingTrade).toBeNull();
      // Una Nidana NO apostada sí se puede ofrecer.
      const free = NIDANA_LIST[9];
      const withFree = { ...s, avatarNidana: { ...s.avatarNidana, [bettor]: { ...s.avatarNidana[bettor], animals: free } } };
      const ok = act(withFree, { type: "SEND_TRADE_OFFER", player: bettor, offer: free, want: N3 });
      expect(ok.pendingTrade).not.toBeNull();
    });

    it("FANDANGO: una oferta enviada antes de la apuesta que incluye una apostada se cae al aceptar", () => {
      let s = template(bettor);
      s = act(s, { type: "SEND_TRADE_OFFER", player: bettor, offer: N1, want: N3 });
      expect(s.pendingTrade).not.toBeNull();
      s = act(s, { type: "REQUEST_SNAKE_BET", player: bettor, targetAvatar: "hungry_ghost" });
      s = quiet(s);
      s = act(s, { type: "ACCEPT_SNAKE_BET" });
      expect(s.snakeBet).not.toBeNull();
      s = act(s, { type: "ACCEPT_TRADE_OFFER" });
      expect(s.pendingTrade).toBeNull();
      expect(carried(s, bettor)).toContain(N1);
    });

    it("CANCELAR: si el objetivo recibe su loto con un 777, la apuesta termina sin penalización", () => {
      let s = quiet(accepted(bettor)); // turno del apostador
      // El rival tiene a Whitman (paso 6) y un Avatar en Humanos al alcance del Cerdo.
      const hum = bettor === "P1" ? 21 : R(21);
      const pigFrom = bettor === "P1" ? 20 : R(20);
      s = {
        ...s,
        phase: "rolled",
        rollOptions: [1, 5],
        pieces: { ...s.pieces, [bettor]: { ...s.pieces[bettor], pig: venom(pigFrom) } },
        realmPieces: { ...s.realmPieces, [rival]: { ...s.realmPieces[rival], hungry_ghost: avatar("hungry_ghost", hum) } },
        realmProgress: {
          ...s.realmProgress,
          [rival]: { ...s.realmProgress[rival], currentRealmStep: 6 },
          // Fase 1 para el apostador: el Cerdo se mueve solo (mismo montaje
          // que el test de 777 de ruleCanon).
          [bettor]: { ...s.realmProgress[bettor], currentRealmStep: 2 },
        },
      } as GameState;
      const option = getMoveOptionsForPlayer(s, bettor).find((o) => o.pieceKind === "pig" && o.toPos === hum)!;
      expect(option?.meaning).toBe("IMPACT");
      const after = act(s, {
        type: "DECLARE_DHARMA_777", player: bettor, option,
        allOptions: getMoveOptionsForPlayer(s, bettor), targetAvatar: "hungry_ghost",
      });
      expect(after.consolidatedAvatars[bettor].hungry_ghost).toBe(true);
      expect(after.snakeBet).toBeNull();
      expect(carried(after, bettor)).toEqual(expect.arrayContaining([N1, N2]));
    });
  });
}

describe("Nidanas: una nueva nunca sobrescribe a otra", () => {
  it("la que aparece cada 3 lances cae en una casilla sin Nidana (300 repeticiones)", () => {
    for (let rep = 0; rep < 300; rep++) {
      // 11 Nidanas sueltas en casillas al azar: queda 1 por aparecer.
      const cells = [...Array(24).keys()].sort(() => Math.random() - 0.5).slice(0, 11);
      const board: Record<number, NidanaId> = {};
      cells.forEach((c, i) => (board[c] = NIDANA_LIST[i]));
      const s0 = { ...whiteTemplate(), avatarNidana: { P1: {}, P2: {} }, boardNidanas: board, globalRollCount: 101 } as GameState;
      const s = act(s0, { type: "ROLL" });
      expect(s.globalRollCount % 3).toBe(0);
      const ids = onBoard(s);
      expect(ids.length).toBe(12);
      expect(new Set(ids).size).toBe(12);
    }
  });
});

describe("Nidanas devueltas: se pueden recuperar con las reglas de siempre", () => {
  it("cada casilla del tablero pertenece a un Reino, y ese Reino tiene su Avatar", () => {
    const kinds = new Set<string>(["hungry_ghost", "hell", "animals", "humans", "asura", "deva"]);
    for (let pos = 0; pos < 24; pos++) expect(kinds.has(canonicalRealmFromPos(pos))).toBe(true);
  });

  it("un Avatar que aterriza en una Nidana devuelta de su propio Reino la recoge", () => {
    for (const p of ["P1", "P2"] as PlayerId[]) {
      const s0 = p === "P1" ? whiteTemplate() : mirror(whiteTemplate());
      let picked = false;
      for (let a = 1; a <= 6 && !picked; a++) {
        for (let b = 1; b <= 6 && !picked; b++) {
          const s = {
            ...s0, turn: p, phase: "rolled", rollOptions: [a, b],
            avatarNidana: { ...s0.avatarNidana, [p]: {} },
          } as GameState;
          const m = getAllLegalMoves(s, p).find(
            (x) => x.avatar === "hell" && canonicalRealmFromPos(x.option.toPos) === "hell" && !pieceAt(s, x.option.toPos)
          );
          if (!m) continue;
          const cell = m.option.toPos;
          const after = applyMove({ ...s, boardNidanas: { [cell]: N1 } } as GameState, p, m);
          expect(after.avatarNidana[p].hell).toBe(N1);
          expect(after.boardNidanas[cell]).toBeUndefined();
          picked = true;
        }
      }
      expect(picked, `no se encontró jugada de prueba para ${p}`).toBe(true);
    }
  });
});
