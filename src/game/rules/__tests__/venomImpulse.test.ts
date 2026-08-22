import { describe, it, expect } from "vitest";
import { makeInitialState } from "../../state/state";
import { getMoveOptionsForPlayer } from "../getMoveOptionsForPlayer";
import type { GameState, RealmPieceKind } from "../../types";

// v49 — Rooster/Snake/Pig v0 ("physics not powers"), diseño cerrado con
// Federico/Gemini/Chat: el Veneno es el estado mental del propio Avatar
// según su situación en el tablero al empezar el turno, no un botón que
// el jugador activa. Estas pruebas reproducen las tres posiciones de
// prueba discutidas en el diseño (A: Rooster, B: dilema real, C: Pig).

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

function phase2State(overrides: Partial<GameState> = {}): GameState {
  return makeInitialState({
    realmProgress: {
      P1: {
        currentRealmStep: 3,
        completedLoopsInRealm: 0,
        currentLoopProgress: 0,
        realmTransitions: 0,
        stageStartedAtRoll: 0,
      },
      P2: {
        currentRealmStep: 3,
        completedLoopsInRealm: 0,
        currentLoopProgress: 0,
        realmTransitions: 0,
        stageStartedAtRoll: 0,
      },
    },
    rollOptions: [3, 5],
    ...overrides,
  });
}

describe("venomImpulse — ROOSTER v0", () => {
  it("un Avatar que empieza apilado no puede terminar apilado de nuevo", () => {
    // Baseline: hell solo, sin nada en su camino — aprendemos a qué toPos
    // real llega con el dado A (3), sin asumir la fórmula de previewMove.
    const baseline = phase2State({
      realmPieces: { P1: { hell: realmPiece(5, "hell") }, P2: {} },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });
    const baseOptionA = getMoveOptionsForPlayer(baseline, "P1").find(
      (o) => o.choice === "A"
    );
    expect(baseOptionA).toBeDefined();
    const toPos = baseOptionA!.toPos;

    // Ahora: hell empieza APILADO con animals (misma casilla) -> ROOSTER.
    // Y ya hay otro Avatar propio (humans) esperando justo en el destino
    // -> moverse ahí sería volver a apilarse.
    const stacked = phase2State({
      realmPieces: {
        P1: {
          hell: realmPiece(5, "hell"),
          animals: realmPiece(5, "animals"),
          humans: realmPiece(toPos, "humans"),
        },
        P2: {},
      },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    const stackedOptionA = getMoveOptionsForPlayer(stacked, "P1").find(
      (o) => o.choice === "A"
    );
    expect(stackedOptionA).toBeUndefined();
  });

  it("un Avatar apilado SÍ puede moverse si el destino queda libre", () => {
    const stackedButFree = phase2State({
      realmPieces: {
        P1: {
          hell: realmPiece(5, "hell"),
          animals: realmPiece(5, "animals"),
        },
        P2: {},
      },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    const optionA = getMoveOptionsForPlayer(stackedButFree, "P1").find(
      (o) => o.choice === "A"
    );
    expect(optionA).toBeDefined();
  });
});

describe("venomImpulse — SNAKE v0", () => {
  it("un Avatar que empieza solo no puede capturar", () => {
    // Baseline: hell solo, aprendemos el toPos real del dado A.
    const baseline = phase2State({
      realmPieces: { P1: { hell: realmPiece(5, "hell") }, P2: {} },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });
    const baseOptionA = getMoveOptionsForPlayer(baseline, "P1").find(
      (o) => o.choice === "A"
    );
    expect(baseOptionA).toBeDefined();
    const toPos = baseOptionA!.toPos;

    // hell sigue solo (SNAKE) pero ahora hay exactamente 1 Avatar rival en
    // el destino -> sería una captura legal, que Snake debe prohibir.
    const withCapture = phase2State({
      realmPieces: {
        P1: { hell: realmPiece(5, "hell") },
        P2: { animals: realmPiece(toPos, "animals") },
      },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    const options = getMoveOptionsForPlayer(withCapture, "P1");
    const optionA = options.find((o) => o.choice === "A");
    expect(optionA).toBeUndefined();
  });

  it("Posición B del diseño: dilema real entre atacar con Rooster o quedarse quieto por Snake", () => {
    // hell está solo (Snake) y podría capturar con el dado A si no fuera
    // por Snake. animals está apilado con humans (Rooster) y puede llegar
    // a otra casilla libre — esa sí está disponible, con el coste de
    // desapilarse.
    const baseline = phase2State({
      realmPieces: {
        P1: {
          hell: realmPiece(5, "hell"),
          animals: realmPiece(1, "animals"),
        },
        P2: {},
      },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });
    const hellToPos = getMoveOptionsForPlayer(baseline, "P1").find(
      (o) => o.choice === "A"
    )!.toPos;

    const position = phase2State({
      realmPieces: {
        P1: {
          hell: realmPiece(5, "hell"),
          animals: realmPiece(1, "animals"),
          humans: realmPiece(1, "humans"), // apila con animals -> ROOSTER
        },
        P2: { asura: realmPiece(hellToPos, "asura") }, // captura disponible para hell
      },
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    // hell (SNAKE, solo) no puede tomar la captura.
    const hellCapture = getMoveOptionsForPlayer(position, "P1").find(
      (o) => o.choice === "A"
    );
    expect(hellCapture).toBeUndefined();

    // animals (ROOSTER, apilado) sí puede moverse, pero solo a destinos
    // donde no vuelva a quedar apilado.
    const animalsOptions = getMoveOptionsForPlayer(
      { ...position, selectedPiece: { ...position.selectedPiece, P1: "animals" } },
      "P1"
    );
    expect(animalsOptions.length).toBeGreaterThan(0);
    expect(animalsOptions.every((o) => o.toPos !== 1)).toBe(true);
  });
});

describe("venomImpulse — PIG v0", () => {
  it("un Avatar recién vuelto de Mara con movimiento legal obliga a elegirlo", () => {
    const state = phase2State({
      realmPieces: {
        P1: {
          hell: realmPiece(5, "hell"), // recién vuelto de Mara
          animals: realmPiece(10, "animals"), // otra opción tentadora
        },
        P2: {},
      },
      justReturnedFromMara: { P1: { hell: true }, P2: {} },
      selectedPiece: { P1: "animals", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    // Elegir "animals" (no el forzado) no debe dar ninguna opción.
    expect(getMoveOptionsForPlayer(state, "P1")).toEqual([]);

    // Elegir "hell" (el forzado por Pig) sí debe dar opciones normales.
    const withHellSelected = {
      ...state,
      selectedPiece: { ...state.selectedPiece, P1: "hell" as RealmPieceKind },
    };
    expect(getMoveOptionsForPlayer(withHellSelected, "P1").length).toBeGreaterThan(0);
  });

  it("si Snake le quita a hell TODAS sus opciones, Pig no fuerza su selección", () => {
    // Los tres Venenos (pig/snake/rooster) dan, cada uno, el mismo tipo de
    // destino (venomPos + dado) sin importar QUÉ Avatar se mueva con
    // ellos — por eso "hell no tiene ningún movimiento legal" solo puede
    // lograrse con la propia regla Snake (que sí distingue por Avatar),
    // no bloqueando casillas a mano.
    //
    // hell está SOLO (Snake) y recién vuelto de Mara (Pig). Colocamos un
    // único rival exactamente en el destino de cada uno de los tres
    // Venenos (captura disponible = IMPACT) — Snake se lo prohíbe los
    // tres. hell queda sin ninguna opción legal.
    const state = phase2State({
      realmPieces: {
        P1: {
          hell: realmPiece(20, "hell"), // solo -> SNAKE
          animals: realmPiece(10, "animals"),
          humans: realmPiece(10, "humans"), // se apila con animals -> ROOSTER
        },
        P2: {
          hungry_ghost: realmPiece(3, "hungry_ghost"), // = pig(0)+3
          hell: realmPiece(4, "hell"), // = snake(1)+3
          animals: realmPiece(5, "animals"), // = rooster(2)+3
        },
      },
      justReturnedFromMara: { P1: { hell: true }, P2: {} },
      rollOptions: [3, 3], // doble: sin B, y level=2 -> sin AB, un solo destino por Veneno
      level: 2,
      selectedPiece: { P1: "hell", P2: "pig" },
      selectedVenom: { P1: "pig", P2: null },
    });

    // hell (SNAKE) no puede capturar con ninguno de los tres Venenos.
    for (const venomId of ["pig", "snake", "rooster"] as const) {
      const hellOptions = getMoveOptionsForPlayer(
        { ...state, selectedVenom: { ...state.selectedVenom, P1: venomId } },
        "P1"
      );
      expect(hellOptions).toEqual([]);
    }

    // animals (ROOSTER, no Snake) SÍ puede tomar esa misma captura — Pig
    // no bloqueó su selección porque hell no tenía ninguna opción real.
    const animalsFree = {
      ...state,
      selectedPiece: { ...state.selectedPiece, P1: "animals" as RealmPieceKind },
      selectedVenom: { ...state.selectedVenom, P1: "pig" as const },
    };
    expect(getMoveOptionsForPlayer(animalsFree, "P1").length).toBeGreaterThan(0);
  });
});
