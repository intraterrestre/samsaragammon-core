// src/game/Vestigium.ts
//
// v68 (27 agosto 2026) — pedido de Federico (con revisión de Chaty):
// este archivo estaba duplicado — la lógica real de los stamps
// periódicos ("VESTIGIUM TUUM" cada 30 tiradas, ver TurnDock.tsx)
// vivía copiada a mano dentro de App.tsx (VestigiumSnapshot/
// loadVestigia/saveVestigium locales), y este módulo quedaba sin
// importar en ningún lado — código muerto. App.tsx ahora importa todo
// esto de acá; no queda una segunda copia.
//
// Ese v0 (los stamps cada 30 tiradas) y el FinalVestigium de abajo son
// DOS COSAS DISTINTAS a propósito, no se mezclan:
//   - VestigiumSnapshot = huella periódica DURANTE la partida (rastro
//     histórico interno, hasta 12 guardados).
//   - FinalVestigium = un único resumen al TERMINAR la partida ("SEE
//     YOUR TRACE" en el cartel de cierre).
import type { GameState, PlayerId } from "./types";
import { countNirvanaFormationProgress } from "./victory/nirvana";

/* =========================================================
 * Vestigium v0 — huella periódica (cada 30 tiradas)
 * ========================================================= */

export type VestigiumSnapshot = {
  at: number; // Date.now()
  rolls: number;
  level: number;
  turn: PlayerId;
  pos: { P1: number; P2: number };
  captures: { P1: number; P2: number };
};

const SNAPSHOT_KEY = "samsara_vestigia_v0";
const SNAPSHOT_LIMIT = 12;

export function loadVestigia(): VestigiumSnapshot[] {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVestigium(snapshot: VestigiumSnapshot): void {
  try {
    const all = loadVestigia();
    all.push(snapshot);
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify(all.slice(-SNAPSHOT_LIMIT))
    );
  } catch {
    // localStorage puede fallar (privado, cuota llena, etc.) — un
    // stamp perdido no es crítico, no vale la pena romper la partida.
  }
}

/* =========================================================
 * Identidad de partida — compartida entre gameStartedAt y gameId
 * (reducer.ts case "RESET", App.tsx primer render).
 * ========================================================= */

// v68 — mismo patrón que ya usa RunExport.runId en App.tsx
// (`local_${Date.now()}_${random}`), centralizado acá para no
// duplicarlo una tercera vez.
export function makeGameId(): string {
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/* =========================================================
 * FinalVestigium v1 — resumen único de fin de partida
 * ========================================================= */

// v68 — pedido de Federico/Chaty: objeto serializable y "backend-ready"
// desde ya, aunque por ahora solo se guarde en localStorage. `version`
// como literal permite migrar la forma más adelante sin romper los
// FinalVestigium ya guardados (mismo espíritu que
// RunExport.version="runexport_v1"). Deliberadamente SIN "most used
// poison", personalidad, estilo de decisión ni predicción — eso queda
// afuera hasta que el juego lo mida bien de verdad.
export type FinalVestigium = {
  version: 1;
  gameId: string;
  playerId: PlayerId;
  result: "nirvano" | "not_nirvano";
  rolls: number;
  captures: number;
  nidanasActivated: number;
  maraVisits: number;
  avatarsInHumans: number; // 0-6
  durationMs: number;
  completedAt: number; // Date.now()
};

// Construye el FinalVestigium de UN jugador a partir del estado real
// del juego — no toca el reducer ni ninguna regla, solo lee. Se llama
// una vez por jugador cuando state.winner deja de ser null (mismo
// gatillo que ya usa VictoryScreen).
export function buildFinalVestigium(
  state: GameState,
  playerId: PlayerId
): FinalVestigium {
  return {
    version: 1,
    gameId: state.gameId,
    playerId,
    result: state.winner === playerId ? "nirvano" : "not_nirvano",
    rolls: state.globalRollCount,
    captures: state.captures[playerId],
    nidanasActivated: state.nidanasActivated[playerId],
    maraVisits: state.maraVisits[playerId],
    avatarsInHumans: countNirvanaFormationProgress(state, playerId),
    durationMs: Date.now() - state.gameStartedAt,
    completedAt: Date.now(),
  };
}

const FINAL_KEY = "samsara_final_vestigia_v1";
const FINAL_LIMIT = 12;

// v68 — mismo criterio de "no un archivo/imagen por partida" que pidió
// Federico: guarda solo el objeto de datos (pocos KB), no una imagen
// ni un PDF. localStorage por ahora; el shape ya es el que viajaría a
// un backend el día que haya cuenta de jugador (gameId/playerId como
// clave natural).
export function loadFinalVestigia(): FinalVestigium[] {
  try {
    const raw = localStorage.getItem(FINAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFinalVestigium(v: FinalVestigium): void {
  try {
    const all = loadFinalVestigia();
    all.push(v);
    localStorage.setItem(FINAL_KEY, JSON.stringify(all.slice(-FINAL_LIMIT)));
  } catch {
    // ver saveVestigium arriba — mismo criterio, no crítico.
  }
}
