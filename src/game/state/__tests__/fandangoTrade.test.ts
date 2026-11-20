// 20 nov 2026 — "¿Me conviene?" (análisis de un trato) y negociación de
// Buddha. Sin reglas nuevas: solo leen el estado.
import { describe, it, expect } from "vitest";
import { analyzeTrade } from "../../rules/nidanaLink";
import { botAnswersTrade, botProposeTrade } from "../../bot/buddhaBot";
import { initialState } from "../state";
import { NIDANA_LIST } from "../../nidanas";
import type { GameState, PlayerId } from "../../types";

const N = (n: number) => NIDANA_LIST[n - 1];

describe("análisis de un trato (¿Me conviene?)", () => {
  it("ganas un enlace sin romper nada; el rival no gana", () => {
    // Tienes 3 y 7; pides la 4 y entregas la 7. El rival tiene 4 y 11.
    const fx = analyzeTrade({ hell: N(3), animals: N(7) }, { hell: N(4), deva: N(11) }, N(7), N(4));
    expect(fx).toEqual({ myGain: [3], myLoss: [], rivalGain: [], rivalLoss: [] });
  });
  it("ganas uno y pierdes otro", () => {
    const fx = analyzeTrade({ hell: N(3), animals: N(7), asura: N(8) }, { hell: N(4) }, N(8), N(4));
    expect(fx.myGain).toEqual([3]);
    expect(fx.myLoss).toEqual([7]);
  });
  it("solo gana el rival", () => {
    // El rival (con la 6) te pide la 5 y te da la 2; tú tienes 5 y 9.
    const fx = analyzeTrade({ hell: N(5), animals: N(9) }, { hell: N(6), asura: N(2) }, N(5), N(2));
    expect(fx).toEqual({ myGain: [], myLoss: [], rivalGain: [5], rivalLoss: [] });
  });
  it("ganan los dos", () => {
    const fx = analyzeTrade({ hell: N(3), animals: N(10) }, { hell: N(4), deva: N(11) }, N(10), N(4));
    expect(fx.myGain).toEqual([3]);
    expect(fx.rivalGain).toEqual([10]);
  });
  it("es simétrico: lo que gano yo es lo que gana el rival visto desde él", () => {
    const a = { hell: N(3), animals: N(10) }, b = { hell: N(4), deva: N(11) };
    const me = analyzeTrade(a, b, N(10), N(4));
    const them = analyzeTrade(b, a, N(4), N(10));
    expect(them.myGain).toEqual(me.rivalGain);
    expect(them.rivalGain).toEqual(me.myGain);
  });
});

function withNidanas(bot: PlayerId, botN: number[], humanN: number[], trade?: { offer: number; want: number }): GameState {
  const human: PlayerId = bot === "P1" ? "P2" : "P1";
  const kinds = ["hungry_ghost", "hell", "animals", "humans", "asura", "deva"] as const;
  const mk = (ns: number[]) => Object.fromEntries(ns.map((n, i) => [kinds[i], N(n)]));
  return {
    ...initialState,
    avatarNidana: { [bot]: mk(botN), [human]: mk(humanN) } as GameState["avatarNidana"],
    pendingTrade: trade ? { fromPlayer: human, offer: N(trade.offer), want: N(trade.want) } : null,
  } as GameState;
}

for (const bot of ["P1", "P2"] as PlayerId[]) {
  describe(`Buddha negocia (${bot === "P2" ? "Negras" : "Blancas"})`, () => {
    it("propone: pide la que le completa un enlace y ofrece una fuera de sus enlaces", () => {
      // Buddha: 3, 9. Tú: 4, 12. Pide tu 4 (enlace 3–4) y ofrece su 9.
      expect(botProposeTrade(withNidanas(bot, [3, 9], [4, 12]), bot)).toEqual({ offer: N(9), want: N(4) });
    });
    it("no pide una Nidana que forma parte de un enlace tuyo", () => {
      expect(botProposeTrade(withNidanas(bot, [3, 9], [4, 5]), bot)).toBeNull();
    });
    it("no ofrece una Nidana de su propio enlace", () => {
      // Buddha: 3, 7, 8 (enlace 7–8). Tú: 4. Su única oferta posible fuera
      // de enlaces es la 3, pero es vecina de la 4 que pide: no propone.
      expect(botProposeTrade(withNidanas(bot, [3, 7, 8], [4]), bot)).toBeNull();
      // Con una 11 suelta, ofrece la 11 (nunca la 7 ni la 8).
      expect(botProposeTrade(withNidanas(bot, [3, 7, 8, 11], [4]), bot)).toEqual({ offer: N(11), want: N(4) });
    });
    it("no insiste con un trato ya rechazado", () => {
      const s = withNidanas(bot, [3, 9], [4, 12]);
      expect(botProposeTrade(s, bot, new Set([`${N(9)}|${N(4)}`]))).toBeNull();
    });
    it("responde: Fácil acepta; Normal rechaza si le rompe un enlace", () => {
      // Tú le ofreces tu 12 a cambio de su 4; Buddha tiene 3 y 4 (enlace).
      const s = withNidanas(bot, [3, 4], [12, 6], { offer: 12, want: 4 });
      expect(botAnswersTrade("easy", s, bot)).toBe("accept");
      expect(botAnswersTrade("normal", s, bot)).toBe("refuse");
    });
    it("Difícil rechaza si el trato te da un enlace a ti y a él no; Normal acepta", () => {
      // Tú tienes 3; le pides su 4 (te da el enlace 3–4) y le ofreces tu 9.
      const s = withNidanas(bot, [4, 12], [3, 9], { offer: 9, want: 4 });
      expect(botAnswersTrade("normal", s, bot)).toBe("accept");
      expect(botAnswersTrade("hard", s, bot)).toBe("refuse");
    });
    it("Difícil acepta si los dos ganan un enlace", () => {
      // Tú: 3, 10. Buddha: 4, 11. Le pides la 4 y le ofreces la 10.
      const s = withNidanas(bot, [4, 11], [3, 10], { offer: 10, want: 4 });
      expect(botAnswersTrade("hard", s, bot)).toBe("accept");
    });
  });
}
