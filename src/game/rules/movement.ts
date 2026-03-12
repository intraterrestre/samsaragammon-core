import type { GameState, PlayerId, Realm } from "../types";

export type MoveResult =
  | { ok: true; next: GameState; capture: boolean }
  | { ok: false; reason: string };

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

// ✅ 6×4 = 24 casillas → 6 reinos
const REALMS: Realm[] = ["HUMAN", "PRETA", "NARAKA", "ANIMAL", "ASURA", "DEVA"];

export function realmFromPos(pos: number): Realm {
  const idx = Math.floor(pos / 4); // 0..5
  return REALMS[Math.max(0, Math.min(5, idx))];
}

export function applyMove(state: GameState, roll: number): MoveResult {
  if (state.winner) return { ok: false, reason: "La partida ya terminó." };

  if (state.phase !== "rolled") {
    return { ok: false, reason: "Primero debes tirar (ROLL)." };
  }

  if (!Number.isFinite(roll) || roll < 1) {
    return { ok: false, reason: "Tirada inválida." };
  }

  const me = state.turn;
  const opp = otherPlayer(me);

  const myPos = state.pieces[me].pos;
  const last = state.trackSize - 1;
  const target = myPos + roll;

  // ✅ Regla: rebote si te pasas del final
  let newPos = target;
  if (target > last) {
    const overflow = target - last;
    newPos = last - overflow;
    if (newPos < 0) newPos = 0; // por seguridad
  }

  const oppPos = state.pieces[opp].pos;
  const isCapture = newPos === oppPos;

  const didWin = newPos === last;
  const realm = realmFromPos(newPos);

  const next: GameState = {
    ...state,

    pieces: {
      ...state.pieces,
      [me]: { ...state.pieces[me], pos: newPos },
      [opp]: isCapture ? { ...state.pieces[opp], pos: 0 } : state.pieces[opp],
    },

    captures: isCapture
      ? { ...state.captures, [me]: state.captures[me] + 1 }
      : state.captures,

    // ✅ reino actualizado por posición
    currentRealm: realm,

    // ✅ winner opcional
    winner: didWin ? me : null,

    // turno: si ganó se queda, si no pasa al otro
    turn: didWin ? me : opp,

    // vuelve a idle y limpia opciones (tu reducer controla esto también)
    phase: "idle",
    rollOptions: null,
  };

  return { ok: true, next, capture: isCapture };
}