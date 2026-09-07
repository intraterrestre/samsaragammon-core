import { describe, it, expect } from "vitest";
import { makeInitialState } from "../state";
import { reducer } from "../reducer";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import type { GameState, RealmPieceKind } from "../../types";

// Fase 2A — Buda Azul (7 septiembre 2026), pedido de Federico: verifica
// que lastMoveByPlayer/lastKarmaByPlayer (memoria PERSONAL del Oracle)
// se actualizan correctamente por jugador, sin pisar la memoria del
// rival, y sin cambiar el comportamiento de los slots globales
// lastMove/lastKarma (que siguen siendo "último acontecimiento
// GLOBAL" para animaciones/sonidos — ver reducer.ts CONSCIOUS_MOVE).

function realmPiece(pos: number, kind: RealmPieceKind) {
  return {
    id: `test-${kind}`,
    kind,
    pos,
    inLimbo: false,
    unlocked: true,
    maraLevel: null,
  };
}

function movableState(overrides: Partial<GameState> = {}): GameState {
  return makeInitialState({
    phase: "rolled",
    rollOptions: [3, 5],
    realmProgress: {
      P1: {
        currentRealmStep: 3,
        completedLoopsInRealm: 0,
        currentLoopProgress: 0,
        realmTransitions: 0,
        stageStartedAtRoll: 0,
        capturesInStage: 0,
        movesInStage: 0,
      },
      P2: {
        currentRealmStep: 3,
        completedLoopsInRealm: 0,
        currentLoopProgress: 0,
        realmTransitions: 0,
        stageStartedAtRoll: 0,
        capturesInStage: 0,
        movesInStage: 0,
      },
    },
    ...overrides,
  });
}

describe("Fase 2A — memoria personal del Oracle (lastMoveByPlayer / lastKarmaByPlayer)", () => {
  it("P1 mueve → su memoria se actualiza y la de P2 permanece intacta; el slot global refleja a P1", () => {
    const state = movableState({
      turn: "P1",
      realmPieces: { P1: { hell: realmPiece(5, "hell") }, P2: {} },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    const options = getMoveOptionsForPlayer(state, "P1");
    const optionA = options.find((o) => o.choice === "A");
    expect(optionA).toBeDefined();

    const afterP1 = reducer(state, {
      type: "CONSCIOUS_MOVE",
      option: optionA!,
      allOptions: options,
    });

    // Slot global: refleja el último acontecimiento (P1).
    expect(afterP1.lastMove?.player).toBe("P1");
    expect(afterP1.lastKarma).not.toBeNull();

    // Memoria personal: mismo objeto que el slot global (no una copia
    // que pueda divergir), y P2 arranca en null (nunca movió todavía).
    expect(afterP1.lastMoveByPlayer.P1).toBe(afterP1.lastMove);
    expect(afterP1.lastMoveByPlayer.P2).toBeNull();
    expect(afterP1.lastKarmaByPlayer.P1).toBe(afterP1.lastKarma);
    expect(afterP1.lastKarmaByPlayer.P2).toBeNull();

    // --- Ahora mueve P2; la memoria de P1 debe sobrevivir intacta ---
    expect(afterP1.turn).toBe("P2");
    const p1Memory = afterP1.lastMoveByPlayer.P1;
    const p1Karma = afterP1.lastKarmaByPlayer.P1;

    const stateP2Turn: GameState = {
      ...afterP1,
      phase: "rolled",
      rollOptions: [2, 4],
      realmPieces: { ...afterP1.realmPieces, P2: { hell: realmPiece(5, "hell") } },
      selectedPiece: { ...afterP1.selectedPiece, P2: "hell" },
      selectedVenom: { ...afterP1.selectedVenom, P2: "pig" },
    };

    const optionsP2 = getMoveOptionsForPlayer(stateP2Turn, "P2");
    const optionAP2 = optionsP2.find((o) => o.choice === "A");
    expect(optionAP2).toBeDefined();

    const afterP2 = reducer(stateP2Turn, {
      type: "CONSCIOUS_MOVE",
      option: optionAP2!,
      allOptions: optionsP2,
    });

    // Slot global ahora refleja a P2 — sigue siendo "último
    // acontecimiento", no memoria por jugador.
    expect(afterP2.lastMove?.player).toBe("P2");

    // Memoria personal: P2 se actualiza, P1 queda exactamente como
    // estaba (mismo objeto, no recalculado).
    expect(afterP2.lastMoveByPlayer.P2).toBe(afterP2.lastMove);
    expect(afterP2.lastMoveByPlayer.P1).toBe(p1Memory);
    expect(afterP2.lastKarmaByPlayer.P2).toBe(afterP2.lastKarma);
    expect(afterP2.lastKarmaByPlayer.P1).toBe(p1Karma);
  });

  it("RESET devuelve ambas memorias personales a { P1: null, P2: null }", () => {
    const state = movableState({
      turn: "P1",
      realmPieces: { P1: { hell: realmPiece(5, "hell") }, P2: {} },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });
    const options = getMoveOptionsForPlayer(state, "P1");
    const optionA = options.find((o) => o.choice === "A");
    expect(optionA).toBeDefined();

    const afterMove = reducer(state, {
      type: "CONSCIOUS_MOVE",
      option: optionA!,
      allOptions: options,
    });
    expect(afterMove.lastMoveByPlayer.P1).not.toBeNull();
    expect(afterMove.lastKarmaByPlayer.P1).not.toBeNull();

    const afterReset = reducer(afterMove, { type: "RESET" });
    expect(afterReset.lastMoveByPlayer).toEqual({ P1: null, P2: null });
    expect(afterReset.lastKarmaByPlayer).toEqual({ P1: null, P2: null });

    // Confirma que el mecanismo canónico (initialState, vía RESET) es
    // el que provee esto — no un parche aparte.
    expect(afterReset.lastMove).toBeNull();
    expect(afterReset.lastKarma).toBeNull();
  });
});
