// src/game/state/reducer.ts
import type {
  BasePieceKind,
  GameState,
  MoveOption,
  PieceKind,
  PlayerId,
  RealmPieceKind,
} from "../types";
import { initialState } from "./state";

import { behaviorAfterMove } from "../behavior/behavior";
import { recordMove } from "../behavior/patternEngine";
import { realmFromPos } from "../../UI/realm";
import { updateDecisionSignature } from "../karma/updateDecisionSignature";
import { computeKarmaTurn } from "../engine/computeKarmaTurn";
import { NIDANA_LIST } from "../nidanas";
import type { NidanaId } from "../nidanas";

function clampCurvature(value: number): number {
  return Math.max(0, Math.min(100, value));
}

type Action =
  | { type: "RESET" }
  | { type: "ROLL" }
  | { type: "SELECT_PIECE"; player: PlayerId; piece: PieceKind }
  | { type: "SHOW_LEDGER"; entry: string }
  | { type: "CLOSE_LEDGER" }
  | { type: "INTRO_DONE" }
  | { type: "SET_NIDANA"; nidana: NidanaId }
  | {
      type: "SET_NIDANA_EFFECT";
      effect: "CLARITY" | "DISTORTION" | "TENSION" | null;
    }
  | {
      type: "CONSCIOUS_MOVE";
      option: MoveOption;
      allOptions: MoveOption[];
    }
  | { type: "EMOJI"; emoji: string; player: PlayerId };

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const rollDie = () => 1 + Math.floor(Math.random() * 6);

// Las 3 fichas base / venenos.
const BASE_PIECES: BasePieceKind[] = ["pig", "snake", "rooster"];

// Las 6 fichas nuevas de reino. Todavía no se mueven aquí;
// primero las dejamos separadas para no mezclar sistemas.
const REALM_PIECE_ORDER: RealmPieceKind[] = [
  "hungry_ghost",
  "hell",
  "animals",
  "humans",
  "asura",
  "deva",
];

function playerHasActivePiece(state: GameState, player: PlayerId): boolean {
  return BASE_PIECES.some((kind) => !state.pieces[player][kind].inLimbo);
}

function detectVenomTrio(
  pieces: GameState["pieces"]
): GameState["venomTrio"] {
  const visible: { player: PlayerId; kind: BasePieceKind; pos: number }[] = [];

  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const kind of BASE_PIECES) {
      const piece = pieces[player][kind];
      if (!piece.inLimbo) {
        visible.push({ player, kind, pos: piece.pos });
      }
    }
  }

  const byPos = new Map<number, { player: PlayerId; kind: PieceKind }[]>();

  for (const p of visible) {
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos)!.push({ player: p.player, kind: p.kind });
  }

  for (const [pos, stack] of byPos.entries()) {
    if (stack.length < 3) continue;

    const hasPig = stack.some((s) => s.kind === "pig");
    const hasSnake = stack.some((s) => s.kind === "snake");
    const hasRooster = stack.some((s) => s.kind === "rooster");

    if (!(hasPig && hasSnake && hasRooster)) continue;

    const owners = Array.from(new Set(stack.map((s) => s.player)));

    return {
      pos,
      kind: owners.length === 1 ? "PURE" : "MIXED",
      owners,
      pieces: stack,
    };
  }

  return null;
}

function applyCollapseIfNeeded(
  pieces: GameState["pieces"]
): GameState["pieces"] {
  const nextPieces = {
    P1: {
      pig: { ...pieces.P1.pig },
      snake: { ...pieces.P1.snake },
      rooster: { ...pieces.P1.rooster },
    },
    P2: {
      pig: { ...pieces.P2.pig },
      snake: { ...pieces.P2.snake },
      rooster: { ...pieces.P2.rooster },
    },
  };

  const allAtSamePos: Record<number, { player: PlayerId; kind: PieceKind }[]> =
    {};

  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const kind of BASE_PIECES) {
      const p = nextPieces[player][kind];
      if (p.inLimbo) continue;

      if (!allAtSamePos[p.pos]) allAtSamePos[p.pos] = [];
      allAtSamePos[p.pos].push({ player, kind });
    }
  }

  for (const pos in allAtSamePos) {
    const stack = allAtSamePos[pos];

    if (stack.length >= 5) {
      for (const { player, kind } of stack) {
        nextPieces[player][kind] = {
          ...nextPieces[player][kind],
          pos: -1,
          inLimbo: true,
          maraLevel: 1,
        };
      }
    }
  }

  return nextPieces;
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "RESET":
      return initialState;

    case "ROLL": {
      if (state.phase === "rolled") return state;

      const randomNidana =
        NIDANA_LIST[Math.floor(Math.random() * NIDANA_LIST.length)];

      const nextRollCount = state.globalRollCount + 1;

      const releasedPieces = {
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

    // liberar fichas por maraLevel
for (const player of ["P1", "P2"] as PlayerId[]) {
  const opp = otherPlayer(player);

  for (const kind of BASE_PIECES) {
    const piece = releasedPieces[player][kind];

    if (piece.inLimbo && piece.maraLevel !== null) {
      const nextLevel = piece.maraLevel + 1;

      if (nextLevel > 6) {
        let spawnPos: number | null = null;

        for (let i = 0; i < state.trackSize; i++) {
          const occupied = BASE_PIECES.some((k) => {
            const e = releasedPieces[opp][k];
            return !e.inLimbo && e.pos === i;
          });

          if (!occupied) {
            spawnPos = i;
            break;
          }
        }

        if (spawnPos !== null) {
          piece.pos = spawnPos;
          piece.inLimbo = false;
          piece.maraLevel = null;
        }
      } else {
        piece.maraLevel = nextLevel;
      }
    }
  }
}

      const nextState: GameState = {
        ...state,
        globalRollCount: nextRollCount,
        pieces: releasedPieces,
        phase: "rolled",
        rollOptions: [rollDie(), rollDie()],
        currentNidana: randomNidana,
      };

      const nextVenomTrio = detectVenomTrio(nextState.pieces);

      if (!playerHasActivePiece(nextState, state.turn)) {
        return {
          ...nextState,
          venomTrio: nextVenomTrio,
          turn: otherPlayer(state.turn),
          phase: "idle",
          rollOptions: null,
        };
      }

      return {
        ...nextState,
        venomTrio: nextVenomTrio,
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

    case "SET_NIDANA":
      return {
        ...state,
        currentNidana: action.nidana,
      };
    case "SET_NIDANA_EFFECT":
    return {
    ...state,
    activeNidanaEffect: action.effect,
  };

    case "INTRO_DONE":
      return {
        ...state,
        introSeen: true,
      };

    case "EMOJI": {
      const newEvent = {
        player: action.player,
        emoji: action.emoji,
        at: Date.now(),
      };

      return {
        ...state,
        emojiEvents: [...state.emojiEvents, newEvent].slice(-20),
      };
    }

    case "CONSCIOUS_MOVE": {
      if (state.phase !== "rolled" || !state.rollOptions) return state;

      const me = state.turn;
      const opp = otherPlayer(me);
      const { option, allOptions } = action;

      if (!option) return state;

      const activePiece = option.pieceKind;
      const fromPos = option.fromPos;
      const toPos = option.toPos;

// TEMPORAL: la nidana NO cambia la casilla final.
// Así la raya visual coincide con donde cae la ficha.

const finalToPos = toPos;

      const [a, b] = state.rollOptions;

      const nextCurvature = {
        ...(state.curvature ?? { P1: 0, P2: 0 }),
      };
      const nextPiecesRealm = {
  P1: { ...state.realmPieces.P1 },
  P2: { ...state.realmPieces.P2 },
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
      let didAscendRealm = false;

     const loopsNeeded = 1;
    if (
  prevRealmProgress.currentRealmStep < 7 &&
  nextCompletedLoops >= loopsNeeded
) {
  const nextRealmStepValue = Math.min(
    prevRealmProgress.currentRealmStep + 1,
    7
  );

  nextRealmStep = nextRealmStepValue;
  didAscendRealm = true;
  nextRealmTransitions += 1;
  nextCompletedLoops = 0;
  nextLoopProgress = 0;

 // ===== DESBLOQUEAR FICHA DE REINO =====
const nextRealmKey = REALM_PIECE_ORDER[nextRealmStepValue - 2];

if (nextRealmKey) {
  nextPiecesRealm[me][nextRealmKey] = {
    ...(state.realmPieces[me]?.[nextRealmKey] ?? {
      id: `${me}-${nextRealmKey}`,
      kind: nextRealmKey,
      pos: finalToPos,
      inLimbo: true,
      maraLevel: null,
      unlocked: false,
    }),
    pos: finalToPos,
    inLimbo: false,
    maraLevel: null,
    unlocked: true,
  };
}
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
// ===== captura sobre posición final real =====
let didCapture = false;
let capturedPieceKind: PieceKind | null = null;

const enemiesAtFinalPos = BASE_PIECES.filter((enemyKind) => {
  const enemy = nextPieces[opp][enemyKind];
  return !enemy.inLimbo && enemy.pos === finalToPos;
});

// 2+ enemigos en destino final = casilla bloqueada.
// El movimiento queda prohibido aunque la UI se equivoque.
if (enemiesAtFinalPos.length >= 2) {
  return state;
}

const possibleCapturePositions = Array.from(new Set([toPos, finalToPos]));

const enemyPiecesAtTarget = BASE_PIECES.filter((enemyKind) => {
  const enemy = nextPieces[opp][enemyKind];

  return !enemy.inLimbo && possibleCapturePositions.includes(enemy.pos);
});

// se captura si hay 1 enemiga sola en la casilla
if (enemyPiecesAtTarget.length >= 1) {
 const enemyKind = enemyPiecesAtTarget.slice(-1)[0];

  didCapture = true;
  capturedPieceKind = enemyKind;
  nextCaptures[me] += 1;

  nextPieces[opp][enemyKind] = {
    ...nextPieces[opp][enemyKind],
    pos: -1,
    inLimbo: true,
    maraLevel: 1,
  };

  nextCurvature[me] = clampCurvature((nextCurvature[me] ?? 0) + 6);
  nextCurvature[opp] = clampCurvature((nextCurvature[opp] ?? 0) - 8);
}

// ===== movimiento final =====
// Por ahora este reducer SOLO mueve fichas base.
// Las fichas de reino ya se crean, pero todavía no se mueven.
if (!BASE_PIECES.includes(activePiece as BasePieceKind)) {
  return state;
}

const activeBasePiece = activePiece as BasePieceKind;

nextPieces[me][activeBasePiece].pos = finalToPos;
nextPieces[me][activeBasePiece].inLimbo = false;
nextPieces[me][activeBasePiece].maraLevel = null;
const currentRealm = realmFromPos(finalToPos);
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
// ===== presión sobre el rival cuando avanzas =====
if (!didCapture) {
  const oppProgress = nextRealmProgress[opp];

  nextRealmProgress = {
    ...nextRealmProgress,
    [opp]: {
      ...oppProgress,
      currentLoopProgress: Math.max(
        0,
        oppProgress.currentLoopProgress - Math.ceil(option.value * 0.25)
      ),
    },
  };
}
      const nextDecisionSignature = {
        ...state.decisionSignature,
        [me]: updateDecisionSignature(state.decisionSignature[me], {
          pieceKind: activePiece,
          choice: option.choice,
          meaning: option.meaning,
          didCapture,
          allOptions,
        }),
      };

      const karma = computeKarmaTurn({
        lastMove: state.lastMove,
        currentMove: option,
        didCapture,
        realm: currentRealm,
        decisionSignature: nextDecisionSignature[me],
        capturedPieceKind,
      });

      const nextBehavior = behaviorAfterMove({
        behavior: state.behavior,
        player: me,
        from: fromPos,
        to: finalToPos,
        didCapture,
        trackSize: state.trackSize,
      });

      const didWin = finalToPos === state.trackSize - 1;

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
        toRealm: realmFromPos(finalToPos),
      });

      const nextTurn = didWin ? me : opp;
      const nextTurnIndex = state.turnIndex + 1;
      const nextCycleIndex =
        state.turn === "P2" ? state.cycleIndex + 1 : state.cycleIndex;

      const nextLedgerOpen = state.ledgerOpen;
      const nextLedgerEntry = state.ledgerEntry;

      // ===== COLLAPSE (5+) =====
      let nextPiecesAfterCollapse = nextPieces;

// comprobar si hay stacks >= 5
const countByPos: Record<number, number> = {};

for (const player of ["P1", "P2"] as PlayerId[]) {
  for (const kind of BASE_PIECES) {
    const p = nextPieces[player][kind];
    if (p.inLimbo) continue;

    countByPos[p.pos] = (countByPos[p.pos] || 0) + 1;
  }
}

const shouldCollapse = Object.values(countByPos).some((c) => c >= 5);

if (shouldCollapse) {
  nextPiecesAfterCollapse = applyCollapseIfNeeded(nextPieces);
}
      const nextVenomTrio = detectVenomTrio(nextPiecesAfterCollapse);

      return {
        ...state,
        pieces: nextPiecesAfterCollapse,
        realmPieces: nextPiecesRealm,
        captures: nextCaptures,
        curvature: nextCurvature,
        realmProgress: nextRealmProgress,
        realmAscension: didAscendRealm
  ? {
      player: me,
      realmStep: nextRealmStep,
      at: Date.now(),
    }
  : null,
        behavior: nextBehavior,
        pattern: patternNext,
        decisionSignature: nextDecisionSignature,
        lastKarma: karma,
        karmaTotal: {
          ...state.karmaTotal,
          [me]: state.karmaTotal[me] + karma.total,
        },
        turnIndex: nextTurnIndex,
        cycleIndex: nextCycleIndex,
        turn: nextTurn,
        winner: didWin ? me : state.winner,
        venomTrio: nextVenomTrio,
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
          toPos: finalToPos,
          didCapture,
          capturedPieceKind,
          fromRealm: realmFromPos(fromPos),
         toRealm: realmFromPos(finalToPos),
          turnIndex: nextTurnIndex,
          cycleIndex: nextCycleIndex,
          level: state.level,
          availableOptions: allOptions,
          availableOptionsCount: allOptions.length,
        },
        activeNidanaEffect: null,
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