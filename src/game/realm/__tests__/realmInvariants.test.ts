import { describe, it, expect } from "vitest";
import { canonicalRealmFromPos, CANONICAL_REALM_LABEL } from "../../../UI/realm";
import { REALM_PIECE_ORDER } from "../../types";
import { checkNirvanaFormation, countNirvanaFormationProgress } from "../../victory/nirvana";
import type { GameState, CanonicalRealmId } from "../../types";

// Tabla canonica congelada por Federico (13 agosto 2026, corrida +1 el
// 14 agosto 2026 — v49) — si este test falla, alguien movio una
// casilla, un color o un Avatar sin actualizar el resto de la cadena.
// Ver src/UI/realm.ts (REALM_TO_CANONICAL / canonicalRealmFromPos /
// CANONICAL_REALM_LABEL / PHASE_OFFSET) para el porque de cada numero y
// cada nombre.
//
// v49 (14 agosto 2026) — Federico confirmo mirando la pantalla real que
// Humans (azul) pinta 21,22,23,0, no 20-23 como decia la tabla v46/v48.
// Toda la rueda esta corrida +1 respecto de la version anterior.
//
// v48 (13 agosto 2026) — a pedido de Federico, "titans"/"semigods" son
// los nombres que el jugador ve para Rufus/Whitman, pero el ID interno
// (clave real en state.realmPieces[jugador]) sigue siendo asura/deva —
// cambiar esa clave es tocar la forma del GameState que usa el
// Orquestador (fuera de alcance de esta normalizacion de vocabulario).
// Este archivo prueba AMBAS cosas por separado: el ID canonico, y el
// nombre de presentacion.
const AVATAR_REALM_MAP: Record<string, CanonicalRealmId> = {
  bruno: "hungry_ghost",
  margot: "hell",
  oriol: "animals",
  marino: "humans",
  rufus: "asura",
  whitman: "deva",
};

const REALM_COLOR: Record<CanonicalRealmId, string> = {
  hungry_ghost: "black",
  hell: "purple",
  animals: "yellow",
  humans: "blue",
  asura: "red",
  deva: "white",
};

const REALM_CELLS: Record<CanonicalRealmId, number[]> = {
  hungry_ghost: [1, 2, 3, 4],
  asura: [5, 6, 7, 8],
  deva: [9, 10, 11, 12],
  hell: [13, 14, 15, 16],
  animals: [17, 18, 19, 20],
  // getCellsByRealm recorre pos 0..23 en orden, asi que la casilla 0
  // (que pertenece a Humans tras el corte de vuelta) aparece primero.
  humans: [0, 21, 22, 23],
};

function getCellsByRealm(id: CanonicalRealmId): number[] {
  const cells: number[] = [];
  for (let pos = 0; pos < 24; pos++) {
    if (canonicalRealmFromPos(pos) === id) cells.push(pos);
  }
  return cells;
}

describe("Tabla canonica de reinos (congelada 13 agosto 2026, corrida +1 en v49)", () => {
  it("Humans son exactamente las casillas 21,22,23,0", () => {
    expect(getCellsByRealm("humans")).toEqual([0, 21, 22, 23]);
  });

  it("Marino es el avatar de Humans", () => {
    expect(AVATAR_REALM_MAP.marino).toBe("humans");
  });

  it("Humans es azul", () => {
    expect(REALM_COLOR.humans).toBe("blue");
  });

  it("los 6 reinos canonicos coinciden con la tabla congelada", () => {
    for (const kind of REALM_PIECE_ORDER) {
      expect(getCellsByRealm(kind)).toEqual(REALM_CELLS[kind]);
    }
  });

  it("cada una de las 24 casillas pertenece a exactamente un reino canonico", () => {
    const seen = new Set<number>();
    for (const kind of REALM_PIECE_ORDER) {
      for (const pos of getCellsByRealm(kind)) {
        expect(seen.has(pos)).toBe(false);
        seen.add(pos);
      }
    }
    expect(seen.size).toBe(24);
  });

  it("Rufus (asura) se muestra como 'Titans'", () => {
    expect(AVATAR_REALM_MAP.rufus).toBe("asura");
    expect(CANONICAL_REALM_LABEL.asura).toBe("Titans");
  });

  it("Whitman (deva) se muestra como 'SemiGods'", () => {
    expect(AVATAR_REALM_MAP.whitman).toBe("deva");
    expect(CANONICAL_REALM_LABEL.deva).toBe("SemiGods");
  });
});

describe("checkNirvanaFormation usa realmente las casillas de Humans (21,22,23,0)", () => {
  function fakeState(positions: Partial<Record<CanonicalRealmId, number>>): GameState {
    const realmPieces: any = {};
    for (const kind of REALM_PIECE_ORDER) {
      const pos = positions[kind];
      realmPieces[kind] = {
        id: `P1-${kind}`,
        kind,
        pos: pos ?? -1,
        inLimbo: pos === undefined,
        maraLevel: null,
        unlocked: pos !== undefined,
      };
    }
    return {
      realmPieces: { P1: realmPieces, P2: realmPieces },
      realmProgress: {
        P1: {
          currentRealmStep: 6,
          completedLoopsInRealm: 0,
          currentLoopProgress: 0,
          realmTransitions: 0,
          stageStartedAtRoll: 0,
        },
        P2: {
          currentRealmStep: 6,
          completedLoopsInRealm: 0,
          currentLoopProgress: 0,
          realmTransitions: 0,
          stageStartedAtRoll: 0,
        },
      },
    } as unknown as GameState;
  }

  it("6 avatares en Humans (21,22,23,0) SI completan la formacion", () => {
    const state = fakeState({
      hungry_ghost: 21,
      hell: 22,
      animals: 23,
      humans: 0,
      asura: 21,
      deva: 22,
    });
    expect(countNirvanaFormationProgress(state, "P1")).toBe(6);
    expect(checkNirvanaFormation(state, "P1")).toBe(true);
  });

  it("6 avatares en la vieja zona 20-23 (Humans pre-v49) NO cuentan todos como Humans", () => {
    // pos 20 cayo del lado de Animals con el corrimiento de v49; solo
    // 21,22,23 siguen siendo Humans — por eso la formacion completa NO
    // se logra (quedaria 1 pieza fuera de Humans).
    const state = fakeState({
      hungry_ghost: 20,
      hell: 21,
      animals: 22,
      humans: 23,
      asura: 20,
      deva: 21,
    });
    expect(countNirvanaFormationProgress(state, "P1")).toBeLessThan(6);
    expect(checkNirvanaFormation(state, "P1")).toBe(false);
  });

  it("6 avatares en la vieja zona 12-15 (Hell/morado pre-v46) NO cuentan como Humans", () => {
    const state = fakeState({
      hungry_ghost: 12,
      hell: 13,
      animals: 14,
      humans: 15,
      asura: 12,
      deva: 13,
    });
    expect(countNirvanaFormationProgress(state, "P1")).toBe(0);
    expect(checkNirvanaFormation(state, "P1")).toBe(false);
  });
});
