// src/game/tester/scenarios.ts — 20 nov 2026, modo de pruebas (?saltos).
//
// Pedido de Federico: empezar directamente en situaciones avanzadas sin
// rejugar la partida. Cada escenario escribe un estado COMPLETO y FIJO
// (mismas posiciones siempre, sin azar): reproducible desde cualquier
// partida. No cambia reglas: solo coloca piezas como podrían estar en una
// partida real (las pruebas comprueban que el estado es válido). Solo se
// ofrece en partidas locales / JUEGA CON BUDDHA con ?saltos, nunca a
// distancia (ver App.tsx).
//
// Posiciones: casillas 0..23; Humanos = 21, 22, 23, 0. Blancas (P1) avanzan
// en sentido horario (números crecientes).
import { NIDANA_LIST, type NidanaId } from "../nidanas";
import type { GameState, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";

export type TesterScenario = "final" | "666" | "777" | "fandango";
export const TESTER_SCENARIOS: TesterScenario[] = ["final", "666", "777", "fandango"];

type Venoms = { pig: number; snake: number; rooster: number };
type Av = { pos: number; lotus?: boolean; captured?: boolean };
type Side = { venoms: Venoms; avatars: Record<RealmPieceKind, Av>; nidanas?: Partial<Record<RealmPieceKind, number>> };
type Layout = { P1: Side; P2: Side };

const N = (n: number): NidanaId => NIDANA_LIST[n - 1];

// Negras fuera de Humanos, repartidas (posiciones comunes a varios escenarios).
const BLACK_OUTSIDE: Side = {
  venoms: { pig: 2, snake: 4, rooster: 6 },
  avatars: {
    hungry_ghost: { pos: 3 },
    hell: { pos: 5 },
    animals: { pos: 7 },
    humans: { pos: 9 },
    asura: { pos: 11 },
    deva: { pos: 13 },
  },
};

const LAYOUTS: Record<TesterScenario, Layout> = {
  // Blancas a un paso de Nirvana: 5 Avatares con loto en Humanos y Whitman
  // limpio (nunca capturado) a tiro: si cae en Humanos, recibe su loto.
  final: {
    P1: {
      venoms: { pig: 16, snake: 18, rooster: 19 },
      avatars: {
        hungry_ghost: { pos: 21, lotus: true },
        hell: { pos: 21, lotus: true },
        animals: { pos: 22, lotus: true },
        humans: { pos: 23, lotus: true },
        asura: { pos: 0, lotus: true },
        deva: { pos: 17 },
      },
    },
    P2: BLACK_OUTSIDE,
  },
  // 666 listo: Bruno blanco en Humanos, capturado alguna vez y sin loto
  // (objetivo de la apuesta); Blancas llevan 3 Nidanas (enlace 3–4 y la 8);
  // Margot y Oriol apilados (impulso Gallo: pueden capturar) con la
  // Serpiente cerca de Avatares negros sueltos.
  "666": {
    P1: {
      venoms: { pig: 8, snake: 11, rooster: 12 },
      avatars: {
        hungry_ghost: { pos: 22, captured: true },
        hell: { pos: 10 },
        animals: { pos: 10 },
        humans: { pos: 21, lotus: true },
        asura: { pos: 0, lotus: true },
        deva: { pos: 19 },
      },
      nidanas: { hell: 3, animals: 4, deva: 8 },
    },
    P2: {
      venoms: { pig: 2, snake: 4, rooster: 6 },
      avatars: {
        hungry_ghost: { pos: 13 },
        hell: { pos: 15 },
        animals: { pos: 17 },
        humans: { pos: 3 },
        asura: { pos: 5 },
        deva: { pos: 7 },
      },
      nidanas: { hungry_ghost: 10 },
    },
  },
  // 777 listo: Negras ya tienen a Whitman y un Avatar SOLO en Humanos (21);
  // Blancas tienen un Avatar en Humanos sin loto (23, capturado alguna vez)
  // al que dar el loto, y Margot+Oriol apilados con los Venenos a 2-4
  // casillas de la 21.
  "777": {
    P1: {
      venoms: { pig: 17, snake: 18, rooster: 19 },
      avatars: {
        hungry_ghost: { pos: 23, captured: true },
        hell: { pos: 15 },
        animals: { pos: 15 },
        humans: { pos: 0, lotus: true },
        asura: { pos: 9 },
        deva: { pos: 12 },
      },
    },
    P2: {
      venoms: { pig: 2, snake: 4, rooster: 6 },
      avatars: {
        hungry_ghost: { pos: 21, captured: true },
        hell: { pos: 3 },
        animals: { pos: 5 },
        humans: { pos: 7 },
        asura: { pos: 11 },
        deva: { pos: 13 },
      },
    },
  },
  // Fandango: Nidanas repartidas para que haya tratos posibles en los dos
  // sentidos (3/4, 7/8, 10/11) y que Buddha pueda proponer.
  fandango: {
    P1: {
      venoms: { pig: 14, snake: 16, rooster: 18 },
      avatars: {
        hungry_ghost: { pos: 15 },
        hell: { pos: 17 },
        animals: { pos: 19 },
        humans: { pos: 20 },
        asura: { pos: 12 },
        deva: { pos: 10 },
      },
      nidanas: { hungry_ghost: 3, hell: 7, animals: 10 },
    },
    P2: { ...BLACK_OUTSIDE, nidanas: { hungry_ghost: 4, hell: 11, animals: 8 } },
  },
};

export function buildTesterScenario(state: GameState, name: TesterScenario): GameState {
  const layout = LAYOUTS[name];
  const roll = state.globalRollCount;
  const side = (pl: PlayerId) => {
    const L = layout[pl];
    const pieces = {
      pig: { pos: L.venoms.pig, inLimbo: false, maraLevel: null },
      snake: { pos: L.venoms.snake, inLimbo: false, maraLevel: null },
      rooster: { pos: L.venoms.rooster, inLimbo: false, maraLevel: null },
    };
    const realm: Record<string, unknown> = {};
    const lotus: Partial<Record<RealmPieceKind, boolean>> = {};
    for (const kind of REALM_PIECE_ORDER) {
      const a = L.avatars[kind];
      realm[kind] = {
        id: `${pl}-${kind}`,
        kind,
        pos: a.pos,
        inLimbo: false,
        maraLevel: null,
        unlocked: true,
        everCaptured: !!a.captured,
        maraLink: null,
      };
      if (a.lotus) lotus[kind] = true;
    }
    const nid: Partial<Record<RealmPieceKind, NidanaId>> = {};
    for (const [k, n] of Object.entries(L.nidanas ?? {})) nid[k as RealmPieceKind] = N(n!);
    return { pieces, realm, lotus, nid };
  };
  const w = side("P1");
  const b = side("P2");
  const stage = (pl: PlayerId) => ({
    ...state.realmProgress[pl],
    currentRealmStep: 6,
    stageStartedAtRoll: roll,
    capturesInStage: 0,
    movesInStage: 0,
  });
  return {
    ...state,
    genesisUIComplete: true,
    brunoRevealed: true,
    winner: null,
    turn: "P1",
    phase: "idle",
    rollOptions: null,
    pieces: { P1: w.pieces, P2: b.pieces } as GameState["pieces"],
    realmPieces: { P1: w.realm, P2: b.realm } as unknown as GameState["realmPieces"],
    consolidatedAvatars: { P1: w.lotus, P2: b.lotus },
    avatarNidana: { P1: w.nid, P2: b.nid },
    boardNidanas: {},
    pendingSnakeBet: null,
    snakeBet: null,
    pendingTrade: null,
    realmAscension: null,
    realmProgress: { P1: stage("P1"), P2: stage("P2") },
    cosmicClock: {
      era: "whitman",
      progress: 0,
      transitionSequence: Math.max(5, state.cosmicClock.transitionSequence + 1),
    },
  } as GameState;
}
