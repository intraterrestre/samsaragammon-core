// 20 nov 2026 — Fandango a distancia: cada aparato negocia solo por SU
// jugador. Se simulan dos aparatos conectados: cada uno tiene su copia de
// la partida, pasa sus acciones por el mismo guardia que App.tsx
// (onlineActionAllowed) y el reducer, y la partida resultante llega al
// otro aparato (como hace Realtime). Se prueba con Blancas y con Negras.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer, type Action } from "../reducer";
import { initialState } from "../state";
import { onlineActionAllowed } from "../onlineGuard";
import { NIDANA_LIST } from "../../nidanas";
import type { GameState, PlayerId, RealmPieceKind } from "../../types";

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

const N = (n: number) => NIDANA_LIST[n - 1];
const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

type Device = { role: PlayerId; state: GameState };
type Table = { devices: Record<PlayerId, Device> };

function table(s: GameState): Table {
  return { devices: { P1: { role: "P1", state: s }, P2: { role: "P2", state: s } } };
}
/** Un aparato intenta una acción. true = se aplicó y llegó al otro. */
function send(t: Table, from: PlayerId, action: Action): boolean {
  const dev = t.devices[from];
  if (!onlineActionAllowed(dev.state, action, dev.role)) return false;
  const next = reducer(dev.state, action);
  if (next === dev.state) return false;
  t.devices.P1.state = next;
  t.devices.P2.state = next;
  return true;
}
/** El jugador del turno termina su turno (equivale a tirar y mover). */
function passTurn(t: Table) {
  const s = t.devices.P1.state;
  const next = { ...s, turn: other(s.turn), turnIndex: (s.turnIndex ?? 0) + 1 } as GameState;
  t.devices.P1.state = next;
  t.devices.P2.state = next;
}

function tradeTable(starter: PlayerId): Table {
  const rival = other(starter);
  return table({
    ...initialState,
    turn: starter,
    phase: "idle",
    avatarNidana: {
      [starter]: { hell: N(3), animals: N(9) },
      [rival]: { hell: N(4), deva: N(12) },
    } as GameState["avatarNidana"],
    pendingTrade: null,
    skySign: null,
    skySignsUsed: [],
  } as unknown as GameState);
}

for (const A of ["P1", "P2"] as PlayerId[]) {
  const B = other(A);
  const name = A === "P1" ? "Blancas" : "Negras";

  describe(`Fandango a distancia — empieza ${name}`, () => {
    it("el que espera no puede ofrecer en nombre del que tiene el turno", () => {
      const t = tradeTable(A);
      // Desde el aparato de B, haciéndose pasar por A (lo que antes permitía la ventana).
      expect(send(t, B, { type: "SEND_TRADE_OFFER", player: A, offer: N(9), want: N(4) })).toBe(false);
      // Ni en su propio nombre fuera de su turno.
      expect(send(t, B, { type: "SEND_TRADE_OFFER", player: B, offer: N(12), want: N(3) })).toBe(false);
      expect(t.devices[A].state.pendingTrade).toBeNull();
    });

    it("oferta pendiente: el destinatario la ve pero no puede contestar hasta su turno", () => {
      const t = tradeTable(A);
      expect(send(t, A, { type: "SEND_TRADE_OFFER", player: A, offer: N(9), want: N(4) })).toBe(true);
      // Llega a los dos aparatos.
      expect(t.devices[B].state.pendingTrade).toEqual({ fromPlayer: A, offer: N(9), want: N(4) });
      // B intenta contestar durante el turno de A: no.
      expect(send(t, B, { type: "ACCEPT_TRADE_OFFER", by: B })).toBe(false);
      expect(send(t, B, { type: "REFUSE_TRADE_OFFER", by: B, skySign: true })).toBe(false);
      // A no puede aceptarse su propia oferta, ni en su turno ni en el de B.
      expect(send(t, A, { type: "ACCEPT_TRADE_OFFER", by: A })).toBe(false);
      passTurn(t);
      expect(send(t, A, { type: "ACCEPT_TRADE_OFFER", by: A })).toBe(false);
      expect(send(t, A, { type: "REFUSE_TRADE_OFFER", by: A })).toBe(false);
      // Sigue pendiente; en su turno B acepta.
      expect(t.devices[B].state.pendingTrade).not.toBeNull();
      expect(send(t, B, { type: "ACCEPT_TRADE_OFFER", by: B })).toBe(true);
      const s = t.devices[A].state;
      expect(s.pendingTrade).toBeNull();
      expect(s.avatarNidana[A]).toEqual({ hell: N(3), animals: N(4) });
      expect(s.avatarNidana[B]).toEqual({ hell: N(9), deva: N(12) });
    });

    it("el motor rechaza un 'by' falso aunque el guardia no esté", () => {
      const t = tradeTable(A);
      send(t, A, { type: "SEND_TRADE_OFFER", player: A, offer: N(9), want: N(4) });
      passTurn(t);
      const s = t.devices[B].state;
      expect(reducer(s, { type: "ACCEPT_TRADE_OFFER", by: A })).toBe(s);
      expect(reducer(s, { type: "REFUSE_TRADE_OFFER", by: A, skySign: true })).toBe(s);
    });

    it("RECHAZAR ⚡: solo el destinatario, en su turno, y una vez por partida", () => {
      const t = tradeTable(A);
      send(t, A, { type: "SEND_TRADE_OFFER", player: A, offer: N(9), want: N(4) });
      expect(send(t, B, { type: "REFUSE_TRADE_OFFER", by: B, skySign: true })).toBe(false);
      passTurn(t);
      expect(send(t, B, { type: "REFUSE_TRADE_OFFER", by: B, skySign: true })).toBe(true);
      const s = t.devices[A].state;
      // La señal llega al aparato de quien ofreció (allí se ve el vídeo).
      expect(s.skySign?.by).toBe(B);
      expect(s.skySignsUsed).toEqual([B]);
      expect(s.pendingTrade).toBeNull();
      // Segunda vez: el rechazo vale, pero sin señal nueva.
      passTurn(t);
      passTurn(t);
      // Turno de B: B ofrece; turno de A: A rechaza con ⚡ (la suya, primera).
      expect(send(t, B, { type: "SEND_TRADE_OFFER", player: B, offer: N(12), want: N(9) })).toBe(true);
      passTurn(t);
      expect(send(t, A, { type: "REFUSE_TRADE_OFFER", by: A, skySign: true })).toBe(true);
      expect(t.devices[B].state.skySignsUsed).toEqual([B, A]);
    });
  });
}

// ---------------------------------------------------------------- 666

const venom = (pos: number) => ({ pos, inLimbo: false, maraLevel: null });
const avatar = (kind: RealmPieceKind, pos: number, extra: object = {}) => ({
  id: `x-${kind}`, kind, pos, inLimbo: false, maraLevel: null, unlocked: true, ...extra,
});
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
      out[nk] = mirror(v, k);
    }
    return out as T;
  }
  if (typeof x === "number" && /pos$/i.test(key)) return R(x) as T;
  if (typeof x === "string" && PLAYER_KEYS.has(key) && SW[x]) return SW[x] as T;
  return x;
}
function betTemplate(): GameState {
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
    globalRollCount: 100,
    realmProgress: {
      P1: { ...initialState.realmProgress.P1, currentRealmStep: 4, stageStartedAtRoll: 100 },
      P2: { ...initialState.realmProgress.P2, currentRealmStep: 4, stageStartedAtRoll: 100 },
    },
    pieces: {
      P1: { pig: venom(3), snake: venom(4), rooster: venom(5) },
      P2: { pig: venom(15), snake: venom(16), rooster: venom(17) },
    },
    realmPieces: {
      P1: { hungry_ghost: avatar("hungry_ghost", 22, { everCaptured: true }), hell: avatar("hell", 8) },
      P2: { hungry_ghost: avatar("hungry_ghost", 11), hell: avatar("hell", 13) },
    },
    avatarNidana: { P1: { hungry_ghost: N(1), hell: N(2) }, P2: { hell: N(6) } },
    boardNidanas: {},
    skySign: null,
    skySignsUsed: [],
  } as unknown as GameState;
}

for (const A of ["P1", "P2"] as PlayerId[]) {
  const B = other(A);
  describe(`Square Karma 666 a distancia — apuesta ${A === "P1" ? "Blancas" : "Negras"}`, () => {
    const start = () => table(A === "P1" ? betTemplate() : mirror(betTemplate()));
    const req: Action = { type: "REQUEST_SNAKE_BET", player: A, targetAvatar: "hungry_ghost", stake: [N(1), N(2)] };

    it("el rival no puede proponerla en nombre del apostador", () => {
      const t = start();
      expect(send(t, B, req)).toBe(false);
      expect(t.devices[A].state.pendingSnakeBet).toBeNull();
    });

    it("pendiente: el rival no responde fuera de su turno; el apostador nunca", () => {
      const t = start();
      expect(send(t, A, req)).toBe(true);
      expect(t.devices[B].state.pendingSnakeBet?.byPlayer).toBe(A);
      expect(send(t, B, { type: "ACCEPT_SNAKE_BET", by: B })).toBe(false);
      expect(send(t, A, { type: "ACCEPT_SNAKE_BET", by: A })).toBe(false);
      passTurn(t);
      expect(send(t, A, { type: "ACCEPT_SNAKE_BET", by: A })).toBe(false);
      expect(send(t, A, { type: "REFUSE_SNAKE_BET", by: A, skySign: true })).toBe(false);
      // El motor por sí solo también rechaza el 'by' falso.
      const s = t.devices[B].state;
      expect(reducer(s, { type: "ACCEPT_SNAKE_BET", by: A })).toBe(s);
      expect(send(t, B, { type: "ACCEPT_SNAKE_BET", by: B })).toBe(true);
      expect(t.devices[A].state.snakeBet?.byPlayer).toBe(A);
    });

    it("RECHAZAR ⚡ del 666 llega a los dos aparatos", () => {
      const t = start();
      send(t, A, req);
      passTurn(t);
      expect(send(t, B, { type: "REFUSE_SNAKE_BET", by: B, skySign: true })).toBe(true);
      expect(t.devices[A].state.pendingSnakeBet).toBeNull();
      expect(t.devices[A].state.skySign?.by).toBe(B);
    });
  });
}

describe("misma pantalla y JUEGA CON BUDDHA siguen igual", () => {
  it("sin 'by', las respuestas funcionan como antes (regla de turno)", () => {
    const s = {
      ...initialState,
      turn: "P2",
      avatarNidana: { P1: { hell: N(3) }, P2: { hell: N(4) } },
      pendingTrade: { fromPlayer: "P1", offer: N(3), want: N(4) },
    } as unknown as GameState;
    expect(reducer(s, { type: "ACCEPT_TRADE_OFFER" }).pendingTrade).toBeNull();
  });
});
