import { describe, it, expect } from "vitest";
import { makeInitialState } from "../state";
import { reducer } from "../reducer";
import { createBehaviorState, behaviorAfterMove } from "../../behavior/behavior";
import { explainPattern } from "../../behavior/patternCopy";

// Fase 1 + Fase 2B — Buda Azul (7 septiembre 2026), pedido de Federico:
// cubre las piezas de la checklist de verificación que son lógica pura
// (reducer / behavior), no requieren renderizar UI. Los puntos de la
// checklist que sí son de interacción/componente (splash → panel sin
// autocierre, bloqueo de dado/movimiento mientras el panel está
// abierto, CLOSE no devuelve la consulta) están garantizados por
// construcción en GameShell.tsx (handleConsultBuda/handleCloseBudaPanel
// no dispatchean turn/phase, moveOptions se gatea con
// budaConsultationActive) — este repo no tiene un harness de
// renderizado de componentes (no hay @testing-library/react ni jsdom
// configurado, ver package.json), así que esa parte queda para
// verificación manual jugando, que es justamente el propósito de esta
// fase.

describe("Fase 1 — USE_BUDA_CONSULTATION", () => {
  it("consume consultas 4 → 3 → ... → 0 sin bajar de 0, y no toca turn/phase", () => {
    const state = makeInitialState({ turn: "P1", phase: "idle" });
    expect(state.consultationsRemaining).toEqual({ P1: 4, P2: 4 });

    let s = state;
    for (let i = 4; i >= 1; i--) {
      s = reducer(s, { type: "USE_BUDA_CONSULTATION", player: "P1" });
      expect(s.consultationsRemaining.P1).toBe(i - 1);
      expect(s.consultationsRemaining.P2).toBe(4); // P2 intacto
      expect(s.turn).toBe("P1");   // usar el Buda no es una jugada
      expect(s.phase).toBe("idle");
    }

    // En 0, un consumo más no hace nada (no baja de 0).
    const atZero = reducer(s, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(atZero.consultationsRemaining.P1).toBe(0);
  });

  it("player viaja explícito en la acción — puede descontarle a un jugador que no tiene el turno, sin cambiarlo", () => {
    const state = makeInitialState({ turn: "P1" });
    const afterP2Consults = reducer(state, {
      type: "USE_BUDA_CONSULTATION",
      player: "P2",
    });
    expect(afterP2Consults.consultationsRemaining.P2).toBe(3);
    expect(afterP2Consults.consultationsRemaining.P1).toBe(4);
    expect(afterP2Consults.turn).toBe("P1"); // sigue siendo el turno de P1
  });

  it("RESET restaura ambos a 4", () => {
    const state = makeInitialState();
    const consumed = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(consumed.consultationsRemaining.P1).toBe(3);

    const afterReset = reducer(consumed, { type: "RESET" });
    expect(afterReset.consultationsRemaining).toEqual({ P1: 4, P2: 4 });
  });
});

describe("Fase 2B — Mirror: state.behavior.stablePattern por jugador", () => {
  it("sin ningún ciclo completado: stablePattern es null (\"no completed cycle yet\")", () => {
    const behavior = createBehaviorState();
    expect(behavior.stablePattern.P1).toBeNull();
    expect(behavior.stablePattern.P2).toBeNull();
    expect(behavior.stableStreak.P1).toBe(0);
    expect(behavior.lifeStabilized.P1).toBe(false);
  });

  it("al completar un ciclo (to < from): stablePattern deja de ser null y explainPattern(_, 'B') da 3 líneas", () => {
    let behavior = createBehaviorState();

    // Un solo movimiento que "da la vuelta" al track (to < from) alcanza
    // para que behaviorAfterMove considere el ciclo completado — no
    // hace falta simular una vuelta entera casilla por casilla.
    behavior = behaviorAfterMove({
      behavior,
      player: "P1",
      from: 20,
      to: 2,
      didCapture: false,
      trackSize: 24,
    });

    expect(behavior.stablePattern.P1).not.toBeNull();
    expect(behavior.stableStreak.P1).toBe(1);
    expect(behavior.lifeStabilized.P1).toBe(false); // hacen falta 7 seguidos

    const pattern = behavior.stablePattern.P1!;
    expect(["STEADY", "AGGRESSIVE", "REACTIVE", "WANDERING"]).toContain(pattern);

    const lines = explainPattern(pattern, "B");
    expect(lines).toHaveLength(3);

    // history[P1] coincide con stablePattern (mismo hallazgo de la
    // auditoría: son el mismo valor una vez completado un ciclo).
    expect(behavior.history.P1.at(-1)?.pattern).toBe(pattern);

    // P2 no se tocó — cada jugador tiene su propia memoria de Mirror.
    expect(behavior.stablePattern.P2).toBeNull();
  });

  it("stableStreak crece cuando el mismo pattern se repite en ciclos consecutivos", () => {
    let behavior = createBehaviorState();

    // Dos "vueltas" seguidas con el mismo perfil de movimiento (mismo
    // from/to relativo) deberían clasificar igual las dos veces.
    behavior = behaviorAfterMove({
      behavior, player: "P1", from: 20, to: 2, didCapture: false, trackSize: 24,
    });
    const firstPattern = behavior.stablePattern.P1;

    behavior = behaviorAfterMove({
      behavior, player: "P1", from: 20, to: 2, didCapture: false, trackSize: 24,
    });

    expect(behavior.stablePattern.P1).toBe(firstPattern);
    expect(behavior.stableStreak.P1).toBe(2);
  });
});

describe("Fase 2C — budaConsultationInProgress (visibilidad sincronizada del splash)", () => {
  it("USE_BUDA_CONSULTATION marca budaConsultationInProgress = player, además de descontar la consulta", () => {
    const state = makeInitialState();
    expect(state.budaConsultationInProgress).toBeNull();

    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(afterP1.budaConsultationInProgress).toBe("P1");
    expect(afterP1.consultationsRemaining.P1).toBe(3);
  });

  it("CLEAR_BUDA_SPLASH vuelve a null sin tocar nada más (ni consultationsRemaining, ni turn, ni phase)", () => {
    const state = makeInitialState({ turn: "P1", phase: "idle" });
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(afterP1.budaConsultationInProgress).toBe("P1");

    const cleared = reducer(afterP1, { type: "CLEAR_BUDA_SPLASH" });
    expect(cleared.budaConsultationInProgress).toBeNull();
    expect(cleared.consultationsRemaining.P1).toBe(3); // la consulta ya gastada NO vuelve
    expect(cleared.turn).toBe("P1");
    expect(cleared.phase).toBe("idle");
  });

  it("si P2 consulta después, budaConsultationInProgress pasa a reflejar a P2 (nunca dos a la vez, GameShell ya lo garantiza del lado UI)", () => {
    const state = makeInitialState();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    const clearedP1 = reducer(afterP1, { type: "CLEAR_BUDA_SPLASH" });
    const afterP2 = reducer(clearedP1, { type: "USE_BUDA_CONSULTATION", player: "P2" });

    expect(afterP2.budaConsultationInProgress).toBe("P2");
    expect(afterP2.consultationsRemaining).toEqual({ P1: 3, P2: 3 });
  });

  it("RESET vuelve budaConsultationInProgress a null", () => {
    const state = makeInitialState();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(afterP1.budaConsultationInProgress).toBe("P1");

    const afterReset = reducer(afterP1, { type: "RESET" });
    expect(afterReset.budaConsultationInProgress).toBeNull();
  });
});

describe("Fase 2D — budaFreeLookOffer (mirada gratis del rival)", () => {
  it("USE_BUDA_CONSULTATION abre una oferta para el RIVAL (nunca para uno mismo), con ventana ~15s", () => {
    const state = makeInitialState();
    const before = Date.now();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });

    expect(afterP1.budaFreeLookOffer).not.toBeNull();
    expect(afterP1.budaFreeLookOffer!.offeredTo).toBe("P2"); // el rival, no P1
    expect(afterP1.budaFreeLookOffer!.expiresAt).toBeGreaterThanOrEqual(before + 15000);
    expect(afterP1.budaFreeLookOffer!.expiresAt).toBeLessThanOrEqual(Date.now() + 15000 + 50);
  });

  it("USE_FREE_BUDA_LOOK: el jugador correcto la usa dentro de la ventana — no gasta consultationsRemaining", () => {
    const state = makeInitialState();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(afterP1.consultationsRemaining.P2).toBe(4);

    const afterFreeLook = reducer(afterP1, { type: "USE_FREE_BUDA_LOOK", player: "P2" });
    expect(afterFreeLook.budaFreeLookOffer).toBeNull(); // se consume
    expect(afterFreeLook.consultationsRemaining.P2).toBe(4); // GRATIS — no bajó
    expect(afterFreeLook.consultationsRemaining.P1).toBe(3); // la de P1 sigue gastada, sin cambios
  });

  it("USE_FREE_BUDA_LOOK: rechaza si la usa el jugador equivocado (no es no-op silencioso peligroso, no consume nada)", () => {
    const state = makeInitialState();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });

    const attemptByP1 = reducer(afterP1, { type: "USE_FREE_BUDA_LOOK", player: "P1" });
    expect(attemptByP1.budaFreeLookOffer).not.toBeNull(); // la oferta sigue intacta
    expect(attemptByP1).toEqual(afterP1); // no cambió nada
  });

  it("USE_FREE_BUDA_LOOK: rechaza si ya venció la ventana de 15s", () => {
    const expired = makeInitialState({
      budaFreeLookOffer: { offeredTo: "P2", expiresAt: Date.now() - 1000 },
    });

    const attempt = reducer(expired, { type: "USE_FREE_BUDA_LOOK", player: "P2" });
    expect(attempt).toEqual(expired); // no-op: sigue "vencida y ahí", nada cambia
  });

  it("USE_FREE_BUDA_LOOK: rechaza si no hay ninguna oferta abierta", () => {
    const state = makeInitialState();
    expect(state.budaFreeLookOffer).toBeNull();

    const attempt = reducer(state, { type: "USE_FREE_BUDA_LOOK", player: "P1" });
    expect(attempt).toEqual(state);
  });

  it("RESET limpia budaFreeLookOffer", () => {
    const state = makeInitialState();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    expect(afterP1.budaFreeLookOffer).not.toBeNull();

    const afterReset = reducer(afterP1, { type: "RESET" });
    expect(afterReset.budaFreeLookOffer).toBeNull();
  });

  it("una nueva consulta reemplaza cualquier oferta anterior sin usar", () => {
    const state = makeInitialState();
    const afterP1 = reducer(state, { type: "USE_BUDA_CONSULTATION", player: "P1" });
    const firstExpiry = afterP1.budaFreeLookOffer!.expiresAt;

    // P2 nunca usó su mirada gratis, pero ahora P2 hace su propia
    // consulta paga — la oferta vieja (para P2) queda reemplazada por
    // una nueva (para P1).
    const afterP2 = reducer(afterP1, { type: "USE_BUDA_CONSULTATION", player: "P2" });
    expect(afterP2.budaFreeLookOffer!.offeredTo).toBe("P1");
    expect(afterP2.budaFreeLookOffer!.expiresAt).toBeGreaterThanOrEqual(firstExpiry);
  });
});
