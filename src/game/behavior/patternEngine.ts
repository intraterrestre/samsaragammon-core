// src/game/behavior/patternEngine.ts
import type { PlayerId, Realm } from "../types";

export type Choice = "A" | "B" | "AB" | "ECO";

export type PatternEventType =
  | "cycle_completed"
  | "capture_bias"
  | "avoidance_bias"
  | "realm_stuck"
  | "realm_hopping"
  | "naraka_entry"
  | "stability_streak"
  | "volatility_spike";

export type PatternEvent = {
  type: PatternEventType;
  severity: 1 | 2 | 3;
  value?: number;
  details?: string;
  atTurn: number;
  atCycle: number;
  player: PlayerId;
};

export type PatternSnapshot = {
  // meta
  turns: number;
  cycles: number;

  // choices
  choiceCounts: Record<Choice, number>;
  choiceWhenAltAvailable: { chosen: number; total: number };

  // captures
  captureChosenWhenAlt: { chosen: number; total: number };

  // realms
  realmVisits: Record<Realm, number>;
  realmTransitions: Record<string, number>;
  narakaReturns: number;

  // stability/volatility
  stabilityStreak: number;
  volatilityScore: number;
  lastRealm?: Realm;

  // last event memory
  lastEvents: PatternEvent[];
};

export type RecordMoveInput = {
  player: PlayerId;
  turnIndex: number;
  cycleIndex: number;

  choice: Choice;
  hadAlternative: boolean;
  chosenWasCapture: boolean;
  captureWasAvoidable: boolean;

  fromPos: number;
  toPos: number;
  fromRealm: Realm;
  toRealm: Realm;
};

export type PatternEngineState = PatternSnapshot;

export function createPatternEngine(): PatternEngineState {
  return {
    turns: 0,
    cycles: 0,

    choiceCounts: { A: 0, B: 0, AB: 0, ECO: 0 },
    choiceWhenAltAvailable: { chosen: 0, total: 0 },

    captureChosenWhenAlt: { chosen: 0, total: 0 },

    realmVisits: {
      NARAKA: 0,
      PRETA: 0,
      ANIMAL: 0,
      HUMAN: 0,
      ASURA: 0,
      DEVA: 0,
    },
    realmTransitions: {},
    narakaReturns: 0,

    stabilityStreak: 0,
    volatilityScore: 0,
    lastRealm: undefined,

    lastEvents: [],
  };
}

function pushEvent(st: PatternEngineState, ev: PatternEvent) {
  st.lastEvents = [ev, ...st.lastEvents].slice(0, 12);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

export function recordMove(
  st: PatternEngineState,
  input: RecordMoveInput
): PatternEngineState {
  const next: PatternEngineState = {
    ...st,
    choiceCounts: { ...st.choiceCounts },
    choiceWhenAltAvailable: { ...st.choiceWhenAltAvailable },
    captureChosenWhenAlt: { ...st.captureChosenWhenAlt },
    realmVisits: { ...st.realmVisits },
    realmTransitions: { ...st.realmTransitions },
    lastEvents: [...st.lastEvents],
  };

  next.turns = Math.max(next.turns, input.turnIndex + 1);
  next.cycles = Math.max(next.cycles, input.cycleIndex);

  // choices
  next.choiceCounts[input.choice] = (next.choiceCounts[input.choice] ?? 0) + 1;

  if (input.hadAlternative) {
    next.choiceWhenAltAvailable.total += 1;
    next.choiceWhenAltAvailable.chosen += 1;
  }

  // capture bias (solo si había alternativa real)
  if (input.captureWasAvoidable) {
    next.captureChosenWhenAlt.total += 1;
    if (input.chosenWasCapture) next.captureChosenWhenAlt.chosen += 1;
  }

  // realms
  next.realmVisits[input.toRealm] = (next.realmVisits[input.toRealm] ?? 0) + 1;

  const key = `${input.fromRealm}->${input.toRealm}`;
  next.realmTransitions[key] = (next.realmTransitions[key] ?? 0) + 1;

  // v36 (12 agosto 2026) — renombrado de "naraka_return" a
  // "naraka_entry": el nombre viejo mentía. Esto dispara al ENTRAR a
  // Mara (fromRealm distinto de NARAKA, toRealm === NARAKA — el
  // "details" siempre apunta hacia adentro), no al volver. Mapeado a
  // la Nidana DEATH ("What formed must pass."). Candidato anotado para
  // más adelante, NO implementado todavía: un evento real
  // "mara_return" quede ficha SALE de Mara — hoy no existe ninguno,
  // porque recordMove() solo se llama desde CONSCIOUS_MOVE y el
  // regreso real de Mara ocurre en el bucle de ROLL, que nunca llama a
  // recordMove. Ese evento futuro mapearía bien a BIRTH.
  if (input.toRealm === "NARAKA" && input.fromRealm !== "NARAKA") {
    next.narakaReturns += 1;
    pushEvent(next, {
      type: "naraka_entry",
      severity: 2,
      atTurn: input.turnIndex,
      atCycle: input.cycleIndex,
      player: input.player,
      details: `${input.fromRealm}→NARAKA`,
    });
  }

  // stability / volatility
  if (input.fromRealm === input.toRealm) {
    next.stabilityStreak = (next.stabilityStreak ?? 0) + 1;
  } else {
    next.stabilityStreak = 0;
    next.volatilityScore = (next.volatilityScore ?? 0) + 1;
  }
  next.lastRealm = input.toRealm;

  // --------- events (ligero, sin spam) ---------
  const t = input.turnIndex;
  const c = input.cycleIndex;

  // capture bias (cuando hay suficiente muestra)
  if (next.captureChosenWhenAlt.total >= 6) {
    const rate = next.captureChosenWhenAlt.chosen / next.captureChosenWhenAlt.total;

    if (rate >= 0.7) {
      pushEvent(next, {
        type: "capture_bias",
        severity: rate >= 0.85 ? 3 : 2,
        value: clamp01(rate),
        atTurn: t,
        atCycle: c,
        player: input.player,
        details: `capture_when_avoidable=${rate.toFixed(2)}`,
      });
      next.captureChosenWhenAlt.total = 0;
      next.captureChosenWhenAlt.chosen = 0;
    } else if (rate <= 0.25) {
      pushEvent(next, {
        type: "avoidance_bias",
        severity: rate <= 0.12 ? 3 : 2,
        value: clamp01(rate),
        atTurn: t,
        atCycle: c,
        player: input.player,
        details: `capture_avoidance=${rate.toFixed(2)}`,
      });
      next.captureChosenWhenAlt.total = 0;
      next.captureChosenWhenAlt.chosen = 0;
    }
  }

  // realm stuck
  if (next.stabilityStreak === 6) {
    pushEvent(next, {
      type: "realm_stuck",
      severity: 2,
      atTurn: t,
      atCycle: c,
      player: input.player,
      details: `streak=6 realm=${input.toRealm}`,
    });
  }
  if (next.stabilityStreak === 10) {
    pushEvent(next, {
      type: "stability_streak",
      severity: 3,
      atTurn: t,
      atCycle: c,
      player: input.player,
      details: `streak=10 realm=${input.toRealm}`,
    });
  }

  // realm hopping
  if (next.volatilityScore === 8) {
    pushEvent(next, {
      type: "realm_hopping",
      severity: 2,
      atTurn: t,
      atCycle: c,
      player: input.player,
      details: "volatility=8",
    });
  }
  if (next.volatilityScore >= 14) {
    pushEvent(next, {
      type: "volatility_spike",
      severity: 3,
      atTurn: t,
      atCycle: c,
      player: input.player,
      details: `volatility=${next.volatilityScore}`,
    });
    next.volatilityScore = 0;
  }

  return next;
}