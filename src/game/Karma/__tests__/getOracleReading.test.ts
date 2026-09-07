import { describe, it, expect } from "vitest";
import { getOracleReading } from "../getOracleReading";
import { getMasterMessage } from "../getMasterMessage";
import type { LastMove } from "../../types";
import type { KarmaBreakdown } from "../../engine/computeKarmaTurn";

// Fase 2B — Buda Azul (7 septiembre 2026): getOracleReading es la
// función canónica única que produce la lectura del Oracle, tanto para
// el Oracle global como para el Oracle personal del Buda. Estos tests
// protegen las dos garantías que pidió Federico: (1) sin memoria, NO se
// fabrica ninguna lectura — se devuelve null explícito; (2) con
// memoria, el resultado es EXACTAMENTE el mismo que ya producía
// getMasterMessage antes de esta fase (cero cambio de comportamiento
// del Oracle global).

function karma(overrides: Partial<KarmaBreakdown> = {}): KarmaBreakdown {
  return {
    combo: 0,
    context: 0,
    realm: 0,
    pattern: 0,
    purification: 0,
    total: 0,
    ...overrides,
  };
}

function lastMove(overrides: Partial<LastMove> = {}): LastMove {
  return {
    at: 0,
    player: "P1",
    pieceKind: "pig",
    captureWasAvailable: false,
    legalCapturesCount: 0,
    turnLost: false,
    a: 3,
    b: 5,
    chosenValue: 3,
    choice: "A",
    meaning: "SAFE",
    fromPos: 0,
    toPos: 3,
    didCapture: false,
    capturedPieceKind: null,
    fromRealm: "hungry_ghost",
    toRealm: "hungry_ghost",
    turnIndex: 0,
    cycleIndex: 0,
    level: 3,
    availableOptions: [],
    availableOptionsCount: 0,
    ...overrides,
  } as LastMove;
}

describe("getOracleReading — Fase 2B", () => {
  it("sin memoria (lastMove null): devuelve null, nunca una lectura fabricada", () => {
    expect(getOracleReading(null, null)).toBeNull();
    // Incluso con lastKarma presente pero sin lastMove — no alcanza para
    // fabricar nada: la ausencia de lastMove es la que corta.
    expect(getOracleReading(null, karma({ pattern: 5 }))).toBeNull();
  });

  it("con memoria: el resultado es idéntico a llamar getMasterMessage directamente (mismo comportamiento que el Oracle global de siempre)", () => {
    const move = lastMove({ capturedPieceKind: "pig", meaning: "IMPACT" });
    const k = karma({ pattern: 2 });

    const viaCanonical = getOracleReading(move, k);
    const viaDirect = getMasterMessage(move.capturedPieceKind, move.meaning, k.pattern);

    expect(viaCanonical).toBe(viaDirect);
    expect(viaCanonical).toBe("The root was cut.");
  });

  it("lastKarma null: usa 0 como pattern, igual que hacía la llamada inline original", () => {
    const move = lastMove({ capturedPieceKind: null, meaning: "RISK" });
    expect(getOracleReading(move, null)).toBe(
      getMasterMessage(null, "RISK", 0)
    );
  });

  it("memoria de P1 y de P2 producen lecturas independientes cuando difieren", () => {
    const moveP1 = lastMove({ player: "P1", capturedPieceKind: "snake" });
    const moveP2 = lastMove({ player: "P2", capturedPieceKind: "rooster" });

    const oracleP1 = getOracleReading(moveP1, null);
    const oracleP2 = getOracleReading(moveP2, null);

    expect(oracleP1).toBe("Anger loosened.");
    expect(oracleP2).toBe("Impulse lost ground.");
    expect(oracleP1).not.toBe(oracleP2);
  });
});
