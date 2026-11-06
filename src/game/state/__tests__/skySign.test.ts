import { describe, it, expect } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import type { GameState } from "../../types";

// Señales del cielo (nov 2026): rechazar "con señal" una vez por partida.
const withTrade = (turn: "P1" | "P2"): GameState =>
  ({
    ...initialState,
    turn,
    pendingTrade: { fromPlayer: turn === "P1" ? "P2" : "P1", offer: "ignorance", want: "birth" },
  }) as unknown as GameState;

describe("señales del cielo", () => {
  it("rechazo normal no manda señal", () => {
    const s = reducer(withTrade("P1"), { type: "REFUSE_TRADE_OFFER" });
    expect(s.pendingTrade).toBeNull();
    expect(s.skySign).toBeNull();
  });

  it("rechazo con señal la registra y la gasta", () => {
    const s = reducer(withTrade("P1"), { type: "REFUSE_TRADE_OFFER", skySign: true });
    expect(s.pendingTrade).toBeNull();
    expect(s.skySign?.by).toBe("P1");
    expect(s.skySignsUsed).toEqual(["P1"]);
  });

  it("solo una vez por jugador: la segunda rechaza pero sin señal nueva", () => {
    const first = reducer(withTrade("P1"), { type: "REFUSE_TRADE_OFFER", skySign: true });
    const again = reducer(
      { ...first, pendingTrade: withTrade("P1").pendingTrade },
      { type: "REFUSE_TRADE_OFFER", skySign: true },
    );
    expect(again.pendingTrade).toBeNull();
    expect(again.skySign).toBe(first.skySign);
    expect(again.skySignsUsed).toEqual(["P1"]);
  });

  it("también vale para rechazar Square Karma 666", () => {
    const base = {
      ...initialState,
      turn: "P2",
      pendingSnakeBet: { byPlayer: "P1", targetAvatar: "human" },
    } as unknown as GameState;
    const s = reducer(base, { type: "REFUSE_SNAKE_BET", skySign: true });
    expect(s.pendingSnakeBet).toBeNull();
    expect(s.skySign?.by).toBe("P2");
  });

  it("quien no tiene el turno no puede rechazar ni mandar señal", () => {
    const s = reducer(withTrade("P1"), { type: "REFUSE_TRADE_OFFER", skySign: true });
    const blocked = reducer({ ...withTrade("P1"), turn: "P2" } as GameState, {
      type: "REFUSE_TRADE_OFFER",
      skySign: true,
    });
    expect(s.skySign).not.toBeNull();
    expect(blocked.skySign).toBeNull();
  });
});
