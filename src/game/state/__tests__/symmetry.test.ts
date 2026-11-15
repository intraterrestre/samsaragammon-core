// 15 nov 2026 — Simetría blancas/negras del motor.
//
// Bug que protege: al capturar un Avatar, su Veneno (y el Avatar salvado
// por una Nidana) se recolocaban "hacia adelante" buscando SIEMPRE en
// sentido horario — hacia atrás para las negras. Daba ~62 % de victorias
// a las negras entre dos Buddha iguales (ver tools/lab/mirrorCheck.ts).
//
// Solo usa el motor (reglas + reducer), sin el bot: las partidas eligen
// jugadas legales al azar con semilla fija.
//
// Qué comprueba, sobre posiciones reales de partidas con semilla fija:
//   1. Cada pieza recolocada queda por delante de la casilla vaciada
//      según el sentido de giro de SU color.
//   2. Espejo: P1<->P2 y pos -> 21-pos (deja Humanos 21..0 en su sitio y
//      convierte el sentido horario en antihorario). La misma jugada en la
//      posición reflejada debe dar exactamente el resultado reflejado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { reducer } from "../reducer";
import { initialState } from "../state";
import { getMoveOptionsForPlayer } from "../../rules/getMoveOptionsForPlayer";
import { getAllLegalMoves, type LegalMove } from "../../rules/legalMoves";
import { REALM_PIECE_ORDER, type GameState, type PlayerId } from "../../types";

const BASE = ["pig", "snake", "rooster"] as const;
const act = (s: GameState, a: object) => reducer(s, a as never);
const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const R = (p: number) => (p < 0 ? p : (21 - p + 24) % 24);
const SW: Record<string, string> = { P1: "P2", P2: "P1" };
const PLAYER_KEYS = new Set(["turn", "byPlayer", "fromPlayer", "winner", "player", "mover", "owner", "by"]);

function mirror(x: unknown, key = ""): unknown {
  if (Array.isArray(x)) return x.map((v) => mirror(v));
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const hasP = "P1" in o && "P2" in o;
    for (const [k, v] of Object.entries(o)) {
      let nk = k;
      if (hasP && (k === "P1" || k === "P2")) nk = SW[k];
      if (key === "boardNidanas" && /^\d+$/.test(k)) nk = String(R(Number(k)));
      out[nk] = mirror(v, k);
    }
    return out;
  }
  if (typeof x === "number" && /pos$/i.test(key)) return R(x);
  if (typeof x === "string" && PLAYER_KEYS.has(key) && SW[x]) return SW[x];
  return x;
}

/** Posiciones de todas las piezas (lo que la recolocación puede cambiar). */
function board(s: GameState) {
  const out: Record<string, number | string> = {};
  for (const pl of ["P1", "P2"] as PlayerId[]) {
    for (const v of BASE) { const x = s.pieces[pl][v]; out[`${pl}.${v}`] = x.inLimbo ? "M" : x.pos; }
    for (const k of REALM_PIECE_ORDER) {
      const a = s.realmPieces[pl]?.[k];
      if (a && a.unlocked) out[`${pl}.${k}`] = a.inLimbo ? "M" : a.pos;
    }
  }
  return out;
}
/** Aplica una jugada legal igual que la UI: selección (Avatar + Veneno) y CONSCIOUS_MOVE. */
function applyMove(s: GameState, p: PlayerId, m: LegalMove): GameState {
  const selected = {
    ...s,
    selectedPiece: { ...s.selectedPiece, [p]: m.avatar ?? m.option.pieceKind },
    selectedVenom: { ...s.selectedVenom, [p]: m.avatar ? m.venom : null },
  } as GameState;
  return act(selected, { type: "CONSCIOUS_MOVE", option: m.option, allOptions: getMoveOptionsForPlayer(selected, p) });
}
const sameMove = (a: LegalMove, b: LegalMove) =>
  a.avatar === b.avatar && a.venom === b.venom && a.option.pieceKind === b.option.pieceKind &&
  a.option.choice === b.option.choice &&
  R(a.option.fromPos) === b.option.fromPos && R(a.option.toPos) === b.option.toPos;

function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Piezas del rival que estaban en la casilla del Avatar capturado y ya no. */
function relocations(before: GameState, after: GameState, mover: PlayerId) {
  const victim = other(mover);
  const out: { kind: string; from: number; to: number }[] = [];
  for (const k of REALM_PIECE_ORDER) {
    const a0 = before.realmPieces[victim]?.[k];
    const a1 = after.realmPieces[victim]?.[k];
    if (!a0 || !a1 || !a0.unlocked || a0.inLimbo) continue;
    const vacated = a0.pos;
    const captured = a1.inLimbo;
    const shielded = !a1.inLimbo && a1.pos !== vacated && after.realmPieces[mover] && Object.values(after.realmPieces[mover]!).some((m) => m && !m.inLimbo && m.pos === vacated);
    if (!captured && !shielded) continue;
    if (shielded) out.push({ kind: k, from: vacated, to: a1.pos });
    for (const v of BASE) {
      const v0 = before.pieces[victim][v], v1 = after.pieces[victim][v];
      if (!v0.inLimbo && v0.pos === vacated && !v1.inLimbo && v1.pos !== vacated) out.push({ kind: v, from: vacated, to: v1.pos });
    }
  }
  return out;
}

beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterAll(() => vi.restoreAllMocks());

describe("Simetría blancas/negras del motor", () => {
  it("las recolocaciones tras una captura van hacia adelante según el color y son simétricas en espejo", () => {
    const realRandom = Math.random;
    let checked = 0;
    const byColor = { P1: 0, P2: 0 };
    const problems: string[] = [];
    try {
      for (let g = 0; g < 20 && checked < 12; g++) {
        Math.random = seeded(500 + g);
        let s = { ...initialState, gameStartedAt: 1, gameId: "sym" } as GameState;
        s = act(s, { type: "SET_TUTORIAL_MODE", on: true });
        s = act(s, { type: "SET_GENESIS_UI_COMPLETE" });
        for (let t = 0; t < 250 && !s.winner; t++) {
          const p = s.turn;
          s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
          const moves = getAllLegalMoves(s, p);
          for (const a of moves) {
            const keep = Math.random;
            Math.random = seeded(1);
            const after = applyMove(s, p, a);
            Math.random = seeded(2);
            const again = applyMove(s, p, a);
            const rel = relocations(s, after, p);
            let ok = rel.length > 0 && JSON.stringify(board(after)) === JSON.stringify(board(again)); // jugada sin azar
            if (ok) {
              const victim = other(p);
              for (const r of rel) {
                const ahead = victim === "P1" ? (r.to - r.from + 24) % 24 : (r.from - r.to + 24) % 24;
                if (ahead < 1 || ahead > 12) problems.push(`${victim} ${r.kind} ${r.from}->${r.to} no avanza`);
              }
              const ms = mirror(s) as GameState;
              const b = getAllLegalMoves(ms, other(p)).find((x) => sameMove(a, x));
              if (!b) { problems.push(`sin jugada espejo t=${t}`); ok = false; }
              else {
                Math.random = seeded(1);
                const mAfter = applyMove(ms, other(p), b);
                const expected = board(mirror(after) as GameState);
                if (JSON.stringify(board(mAfter)) !== JSON.stringify(expected)) problems.push(`espejo distinto t=${t} ${p}`);
                checked++;
                byColor[victim]++;
              }
            }
            Math.random = keep;
          }
          s = moves.length
            ? applyMove(s, p, moves[Math.floor(Math.random() * moves.length)])
            : act(s, { type: "PASS_NO_MOVES", player: p });
        }
      }
    } finally {
      Math.random = realRandom;
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThanOrEqual(12);
    expect(byColor.P1).toBeGreaterThan(0);
    expect(byColor.P2).toBeGreaterThan(0);
  }, 120000);
});
