// src/game/state/reducer.ts
import type {
  GameState,
  MoveOption,
  PieceKind,
  PlayerId,
} from "../types";
import { initialState } from "./state";
import { applyRealmEffect } from "../realm/realmEffects";
import { behaviorAfterMove } from "../behavior/behavior";
import { recordMove } from "../behavior/patternEngine";
import { realmFromPos } from "../../UI/realm";

function clampCurvature(value: number): number {
  return Math.max(0, Math.min(100, value));
}

type Action =
  | { type: "RESET" }
  | { type: "ROLL" }
  | { type: "SELECT_PIECE"; player: PlayerId; piece: PieceKind }
  | { type: "SHOW_LEDGER"; entry: string }
  | { type: "CLOSE_LEDGER" }
  | {
      type: "CONSCIOUS_MOVE";
      option: MoveOption;
      allOptions: MoveOption[];
    };

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const rollDie = () => 1 + Math.floor(Math.random() * 6);

const ALL_PIECES: PieceKind[] = ["pig", "snake", "rooster"];

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

    case "SELECT_PIECE": {
      if (action.player !== state.turn) return state;

      return {
        ...state,
        selectedPiece: {
          ...state.selectedPiece,
          [action.player]: action.piece,
        },
      };
    }

    case "SHOW_LEDGER":
      return {
        ...state,
        ledgerOpen: true,
        ledgerEntry: action.entry,
      };

    case "CLOSE_LEDGER":
      return {
        ...state,
        ledgerOpen: false,
        ledgerEntry: null,
      };

    case "CONSCIOUS_MOVE": {
      if (state.phase !== "rolled" || !state.rollOptions) return state;

      const me = state.turn;
      const opp = otherPlayer(me);

      const { option, allOptions } = action;

      // Seguridad: no dejar ejecutar opciones del jugador equivocado
      if (!option) return state;

      const activePiece = option.pieceKind;
      const fromPos = option.fromPos;
      const toBase = option.toPos;

      const [a, b] = state.rollOptions;

      const nextCurvature = {
        ...(state.curvature ?? { P1: 0, P2: 0 }),
      };

      // ===== progreso de reino / loops =====
      const prevRealmProgress = state.realmProgress[me];

      let nextLoopProgress =
        prevRealmProgress.currentLoopProgress + option.value;

      let nextCompletedLoops = prevRealmProgress.completedLoopsInRealm;

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

      // ===== clonar piezas =====
      const nextPieces = {
        P1: {
          pig: { ...state.pieces.P1.pig },
          snake: { ...state.pieces.P1.snake },
          rooster: { ...state.pieces.P1.rooster },
        },
        P2: {
          pig: { ...state.pieces.P2.pig },
          snake: { ...state.pieces.P2.snake },
          rooster: { ...state.pieces.P2.rooster },
        },
      };

      const nextCaptures = {
        P1: state.captures.P1,
        P2: state.captures.P2,
      };

      // ===== aplicar movimiento base =====
      nextPieces[me][activePiece].pos = toBase;

      // ===== captura =====
      let didCapture = false;
      let capturedPieceKind: PieceKind | null = null;

      for (const enemyKind of ALL_PIECES) {
        if (nextPieces[opp][enemyKind].pos === nextPieces[me][activePiece].pos) {
          didCapture = true;
          capturedPieceKind = enemyKind;
          nextCaptures[me] += 1;
          nextPieces[opp][enemyKind].pos = 0;

          nextCurvature[me] = clampCurvature((nextCurvature[me] ?? 0) + 6);
          nextCurvature[opp] = clampCurvature((nextCurvature[opp] ?? 0) - 8);
          break;
        }
      }

      // ===== progreso de reino tras captura =====
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

      // ===== realm effect =====
      applyRealmEffect({
        level: state.level,
        trackSize: state.trackSize,
        toPos: nextPieces[me][activePiece].pos,
        didCapture,
        mover: me,
      });

      const toPos = nextPieces[me][activePiece].pos;

      // ===== behavior =====
      const nextBehavior = behaviorAfterMove({
        behavior: state.behavior,
        player: me,
        from: fromPos,
        to: toPos,
        didCapture,
        trackSize: state.trackSize,
      });

      // ===== win =====
      const didWin = toPos === state.trackSize - 1;

      // ===== pattern engine =====
      const samePieceAlternatives = allOptions.filter(
        (o) => o.pieceKind === activePiece
      );

      const hadAlternative = samePieceAlternatives.length > 1;

      const chosenWasCapture = option.meaning === "IMPACT";

      const captureWasAvoidable =
        allOptions.some((o) => o.meaning === "IMPACT") && !chosenWasCapture;

      const patternNext = recordMove(state.pattern, {
        player: me,
        turnIndex: state.turnIndex,
        cycleIndex: state.cycleIndex,

        choice: option.choice,
        hadAlternative,
        chosenWasCapture,
        captureWasAvoidable,

        fromPos,
        toPos,
        fromRealm: realmFromPos(fromPos),
        toRealm: realmFromPos(toPos),
      });

      const nextTurn = didWin ? me : opp;
      const nextTurnIndex = state.turnIndex + 1;
      const nextCycleIndex =
        state.turn === "P2" ? state.cycleIndex + 1 : state.cycleIndex;
      // ===== Ledger trigger =====
      let nextLedgerOpen = state.ledgerOpen;
      let nextLedgerEntry = state.ledgerEntry;

      if (option.meaning === "IMPACT") {
        nextLedgerOpen = true;
        nextLedgerEntry = "mara";
      }
      return {
        ...state,
        pieces: nextPieces,
        captures: nextCaptures,
        curvature: nextCurvature,
        realmProgress: nextRealmProgress,

        behavior: nextBehavior,
        pattern: patternNext,

        turnIndex: nextTurnIndex,
        cycleIndex: nextCycleIndex,

        turn: nextTurn,
        winner: didWin ? me : state.winner,

        lastMove: {
          at: Date.now(),

          player: me,
          pieceKind: activePiece,

          a,
          b,

          chosenValue: option.value,
          choice: option.choice,
          meaning: option.meaning,

          fromPos,
          toPos,

          didCapture,
          capturedPieceKind,

          fromRealm: realmFromPos(fromPos),
          toRealm: realmFromPos(toPos),

          turnIndex: nextTurnIndex,
          cycleIndex: nextCycleIndex,

          level: state.level,

          availableOptions: allOptions,
          availableOptionsCount: allOptions.length,
        },
        ledgerOpen: nextLedgerOpen,
        ledgerEntry: nextLedgerEntry,
        
        phase: "idle",
        rollOptions: null,
      };
    }

    default:
      return state;
  }
}