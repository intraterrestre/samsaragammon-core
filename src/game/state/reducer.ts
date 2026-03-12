// src/game/state/reducer.ts
import type { GameState, PlayerId } from "../types";
import { previewMove } from "../rules/preview";
import { initialState } from "./state";
import { applyRealmEffect } from "../realm/realmEffects";
import { behaviorAfterMove } from "../behavior/behavior";

// 🔥 pattern engine
import { recordMove } from "../behavior/patternEngine";

// ⚠️ ideal mover esto a utils, pero por ahora sirve
import { realmFromPos } from "../../UI/realm";

type Action =
  | { type: "RESET" }
  | { type: "ROLL" }
  | { type: "CHOOSE_ROLL"; value: number };

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const rollDie = () => 1 + Math.floor(Math.random() * 6);

type Choice = "A" | "B" | "AB" | "ECO";

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return initialState;

    case "ROLL": {
      if (state.phase === "rolled") return state;

      return {
        ...state,
        phase: "rolled",
        rollOptions: [rollDie(), rollDie()],
      };
    }

    case "CHOOSE_ROLL": {
      if (state.phase !== "rolled" || !state.rollOptions) return state;

      const me = state.turn;
      const opp = otherPlayer(me);

      const [a, b] = state.rollOptions;

      // ===== infer choice from value =====
      const prevA = previewMove(state.pieces[me].pos, a, state.trackSize);
      const prevB = previewMove(state.pieces[me].pos, b, state.trackSize);

      const capA = prevA === state.pieces[opp].pos;
      const capB = prevB === state.pieces[opp].pos;

      const allowSum = state.level >= 3 && !capA && !capB;
      const sumRoll = allowSum ? a + b : null;

      const prevAB =
        allowSum && sumRoll !== null
          ? previewMove(state.pieces[me].pos, sumRoll, state.trackSize)
          : null;

      const isEcho = prevA === prevB;

      let chosenChoice: Choice = "A";
      if (sumRoll !== null && action.value === sumRoll) chosenChoice = "AB";
      else if (isEcho && action.value === a) chosenChoice = "ECO";
      else if (action.value === b) chosenChoice = "B";
      else chosenChoice = "A";

      const hadAlternative = !isEcho; // A y B llevan a distinto sitio

      // si existía captura posible en A o B, pero elegiste algo que NO captura
      const chosenTargetPreview =
        chosenChoice === "AB" ? prevAB : chosenChoice === "B" ? prevB : prevA;

      const chosenWasCapture =
        chosenTargetPreview !== null && chosenTargetPreview === state.pieces[opp].pos;

      const captureWasAvoidable = (capA || capB) && !chosenWasCapture;

          // ===== Snapshot BEFORE move =====
      const fromPos = state.pieces[me].pos;

      const prevRealmProgress = state.realmProgress[me];

      let nextLoopProgress =
        prevRealmProgress.currentLoopProgress + action.value;

      let nextCompletedLoops =
        prevRealmProgress.completedLoopsInRealm;

      if (nextLoopProgress >= state.trackSize) {
        nextCompletedLoops += 1;
        nextLoopProgress = nextLoopProgress % state.trackSize;
      }

      let nextRealmStep = prevRealmProgress.currentRealmStep;
      let nextRealmTransitions = prevRealmProgress.realmTransitions;

      const loopsNeeded =
        prevRealmProgress.currentRealmStep >= 7
          ? 0
          : prevRealmProgress.currentRealmStep * 7;

      if (
        prevRealmProgress.currentRealmStep < 7 &&
        nextCompletedLoops >= loopsNeeded
      ) {
        nextRealmStep = Math.min(prevRealmProgress.currentRealmStep + 1, 7);
        nextRealmTransitions += 1;
        nextCompletedLoops = 0;
        nextLoopProgress = 0;
      }

      // 1) Base movement (preview)
      const toBase = previewMove(fromPos, action.value, state.trackSize);

      // 2) Clone next state pieces/captures
      const nextPieces = {
        P1: { ...state.pieces.P1 },
        P2: { ...state.pieces.P2 },
      };

      const nextCaptures = {
        P1: state.captures.P1,
        P2: state.captures.P2,
      };

      // 3) Apply base move
      nextPieces[me].pos = toBase;

      // 4) Capture check (base)
      let didCapture = false;
      if (nextPieces[opp].pos === nextPieces[me].pos) {
        didCapture = true;
        nextCaptures[me] += 1;
        nextPieces[opp].pos = 0;
      }

      let nextRealmProgress = {
        ...state.realmProgress,
        [me]: {
          ...state.realmProgress[me],
          currentRealmStep: nextRealmStep,
          completedLoopsInRealm: nextCompletedLoops,
          currentLoopProgress: nextLoopProgress,
          realmTransitions: nextRealmTransitions,
        },
      };

      if (didCapture) {
        const oppPrev = state.realmProgress[opp];

        nextRealmProgress = {
          ...nextRealmProgress,
          [opp]: {
            ...oppPrev,
            completedLoopsInRealm: Math.max(
              0,
              oppPrev.completedLoopsInRealm - 1
            ),
            currentLoopProgress: 0,
          },
        };
      }

      // 5) Realm Effect (progressive by level)
      const eff = applyRealmEffect({
        level: state.level,
        trackSize: state.trackSize,
        toPos: nextPieces[me].pos,
        didCapture,
        mover: me,
      });

      nextPieces[me].pos = eff.finalPos;

      // 6) Capture check AGAIN (after realm shift)
      if (nextPieces[opp].pos === nextPieces[me].pos) {
        didCapture = true;
        nextCaptures[me] += 1;
        nextPieces[opp].pos = 0;

        const oppPrev = state.realmProgress[opp];

        nextRealmProgress = {
          ...nextRealmProgress,
          [opp]: {
            ...oppPrev,
            completedLoopsInRealm: Math.max(
              0,
              oppPrev.completedLoopsInRealm - 1
            ),
            currentLoopProgress: 0,
          },
        };
      }

      const toPos = nextPieces[me].pos;

      // 7) Behavior update
      const nextBehavior = behaviorAfterMove({
        behavior: state.behavior,
        player: me,
        from: fromPos,
        to: toPos,
        didCapture,
        trackSize: state.trackSize,
      });

      // 8) Win condition
      const didWin = toPos === state.trackSize - 1;

      // 9) Pattern engine record
      const patternNext = recordMove(state.pattern, {
        player: me,
        turnIndex: state.turnIndex,
        cycleIndex: state.cycleIndex,

        choice: chosenChoice,
        hadAlternative,
        chosenWasCapture,
        captureWasAvoidable,

        fromPos,
        toPos,
        fromRealm: realmFromPos(fromPos),
        toRealm: realmFromPos(toPos),
      });

      const nextTurn = didWin ? me : opp;

      // incrementa cycleIndex cuando termina el turno de P2 (vuelta completa)
      const nextTurnIndex = state.turnIndex + 1;
      const nextCycleIndex =
        state.turn === "P2" ? state.cycleIndex + 1 : state.cycleIndex;

      return {
        ...state,
        pieces: nextPieces,
        captures: nextCaptures,
        realmProgress: nextRealmProgress,

        behavior: nextBehavior,
        pattern: patternNext,

        turnIndex: nextTurnIndex,
        cycleIndex: nextCycleIndex,

        turn: nextTurn,
        winner: didWin ? me : state.winner,

        // ✅ DATA PRO (C): guarda el movimiento real elegido
        lastMove: {
          at: Date.now(),
          player: me,

          a,
          b,

          chosenValue: action.value,
          choice: chosenChoice,

          fromPos,
          toPos,
          didCapture,

          fromRealm: realmFromPos(fromPos),
          toRealm: realmFromPos(toPos),

          turnIndex: nextTurnIndex,
          cycleIndex: nextCycleIndex,

          level: state.level,
        },

               phase: "idle",
        rollOptions: null,
      };
    }

    default:
      return state;
  }
}