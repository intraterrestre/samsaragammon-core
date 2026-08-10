// src/game/state/reducer.ts
import type {
  BasePieceKind,
  GameState,
  MoveOption,
  PieceKind,
  PlayerId,
  PlayerRealmPiecesState,
  RealmPieceKind,
} from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { checkNirvana } from "../victory/nirvana";
import { initialState } from "./state";

import { behaviorAfterMove } from "../behavior/behavior";
import { recordMove } from "../behavior/patternEngine";
import { realmFromPos } from "../../UI/realm";
import { updateDecisionSignature } from "../Karma/updateDecisionSignature";
import { computeKarmaTurn } from "../engine/computeKarmaTurn";
import { NIDANA_LIST } from "../nidanas";
import type { NidanaId } from "../nidanas";
import { isBasePieceUnlocked } from "../era";
import { evaluateOrchestrator, evaluateGenesisToBruno } from "../orchestrator/Orchestrator";

const BASE_PIECE_KINDS: BasePieceKind[] = ["pig", "snake", "rooster"];
const isBasePieceKind = (kind: PieceKind): kind is BasePieceKind =>
  BASE_PIECE_KINDS.includes(kind as BasePieceKind);

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
  | { type: "EMOJI"; emoji: string; player: PlayerId }
  | { type: "SET_MULTIPLAYER_STATE"; state: GameState }
  | { type: "SET_GENESIS_UI_COMPLETE" };

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const rollDie = () => 1 + Math.floor(Math.random() * 6);

// Las 3 fichas base / venenos.
const BASE_PIECES: BasePieceKind[] = ["pig", "snake", "rooster"];

// Las 6 fichas de reino (una por Avatar/era) — REALM_PIECE_ORDER
// importado de types.ts (fuente única). v6: ya se mueven, se capturan
// y se envían a Mara igual que los Venenos (D-014, Avatar-vs-Avatar).

// v4 — RFC Cosmic Clock (APLAZADO). El Orquestador ya expone avatarStep
// (1=Bruno..6=Whitman, ver Orchestrator.ts) cuando dispara
// REVEAL_NEXT_AVATAR. Este mapa solo traduce ese número a un ActorId para
// que cosmicClock.era pueda actualizarse — no agrega ninguna condición ni
// lógica nueva de progresión.
const STEP_TO_ACTOR_ID: Record<number, import("../actors/actorProfiles").ActorId> = {
  1: "bruno",
  2: "margot",
  3: "oriol",
  4: "marino",
  5: "rufus",
  6: "whitman",
};

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
    case "SET_MULTIPLAYER_STATE":
      return action.state;

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

    // liberar fichas por maraLevel (Venenos + Avatares)
let anyMaraReturnThisRoll = false;

const releasedPiecesRealm: Record<PlayerId, PlayerRealmPiecesState> = {
  P1: { ...state.realmPieces.P1 },
  P2: { ...state.realmPieces.P2 },
};

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
          anyMaraReturnThisRoll = true;
        }
      } else {
        piece.maraLevel = nextLevel;
      }
    }
  }

  // Mismo ciclo de Mara (6 lances) para Avatares capturados (D-014).
  // Un Avatar en Mara nunca antes salía de ahí — este bucle no existía.
  for (const kind of REALM_PIECE_ORDER) {
    const piece = releasedPiecesRealm[player][kind];
    if (!piece || !piece.inLimbo || piece.maraLevel === null) continue;

    const nextLevel = piece.maraLevel + 1;

    if (nextLevel > 6) {
      let spawnPos: number | null = null;

      for (let i = 0; i < state.trackSize; i++) {
        const occupied = REALM_PIECE_ORDER.some((k) => {
          const e = releasedPiecesRealm[opp][k];
          return e && !e.inLimbo && e.pos === i;
        });

        if (!occupied) {
          spawnPos = i;
          break;
        }
      }

      if (spawnPos !== null) {
        releasedPiecesRealm[player][kind] = {
          ...piece,
          pos: spawnPos,
          inLimbo: false,
          maraLevel: null,
        };
        anyMaraReturnThisRoll = true;
      }
    } else {
      releasedPiecesRealm[player][kind] = { ...piece, maraLevel: nextLevel };
    }
  }
}

      // v5 — Acto 0: eventos de novedad (ver types.ts / Orchestrator.ts).
      // Cada flag se enciende una sola vez, la primera vez que ocurre.
      const nextGenesisNovelty = {
        ...state.genesisNovelty,
        hasRolled: true,
        hasMaraReturn: state.genesisNovelty.hasMaraReturn || anyMaraReturnThisRoll,
      };

      const nextState: GameState = {
        ...state,
        globalRollCount: nextRollCount,
        pieces: releasedPieces,
        realmPieces: releasedPiecesRealm,
        phase: "rolled",
        rollOptions: [rollDie(), rollDie()],
        currentNidana: randomNidana,
        genesisNovelty: nextGenesisNovelty,
      };

      const nextVenomTrio = detectVenomTrio(nextState.pieces);
      const nextBrunoRevealed =
        state.brunoRevealed || evaluateGenesisToBruno(nextState);

      // v10 — reparación de identidad de etapa (10 agosto 2026). Antes:
      // brunoRevealed solo marcaba una bandera narrativa y desbloqueaba el
      // actor legacy sin renderizado; la ficha/video/mural de Bruno de
      // verdad nacían mucho después, cuando el Orquestador cumplía sus
      // propios umbrales (bruno_to_margot) — y para entonces cosmicClock.era
      // ya decía "margot" (ver hallazgo del off-by-one). Ahora: el momento
      // en que brunoRevealed pasa de false a true ES el único evento
      // Genesis→Bruno y crea el paquete completo de una vez, para los dos
      // jugadores a la vez (un acontecimiento, dos manifestaciones — P-001).
      const brunoJustRevealed = !state.brunoRevealed && nextBrunoRevealed;

      const nextActorsOnRoll = brunoJustRevealed
        ? {
            ...state.actors,
            bruno: { ...state.actors.bruno, unlocked: true },
          }
        : state.actors;

      const nextPiecesRealmWithBruno = brunoJustRevealed
        ? {
            P1: {
              ...nextState.realmPieces.P1,
              hungry_ghost: {
                id: "P1-hungry_ghost",
                kind: "hungry_ghost" as RealmPieceKind,
                pos: 0,
                inLimbo: false,
                maraLevel: null,
                unlocked: true,
              },
            },
            P2: {
              ...nextState.realmPieces.P2,
              hungry_ghost: {
                id: "P2-hungry_ghost",
                kind: "hungry_ghost" as RealmPieceKind,
                pos: 12,
                inLimbo: false,
                maraLevel: null,
                unlocked: true,
              },
            },
          }
        : nextState.realmPieces;

      const nextCosmicClockOnRoll = brunoJustRevealed
        ? {
            era: "bruno" as const,
            progress: 0,
            transitionSequence: state.cosmicClock.transitionSequence + 1,
          }
        : state.cosmicClock;

      const nextRealmAscensionOnRoll = brunoJustRevealed
        ? {
            player: state.turn,
            realmStep: 1,
            realmKey: "hungry_ghost" as RealmPieceKind,
            at: Date.now(),
          }
        : state.realmAscension;

      const nextRealmProgressOnRoll = brunoJustRevealed
        ? {
            P1: { ...state.realmProgress.P1, stageStartedAtRoll: nextRollCount },
            P2: { ...state.realmProgress.P2, stageStartedAtRoll: nextRollCount },
          }
        : state.realmProgress;

      if (!playerHasActivePiece(nextState, state.turn)) {
        return {
          ...nextState,
          venomTrio: nextVenomTrio,
          turn: otherPlayer(state.turn),
          phase: "idle",
          rollOptions: null,
          brunoRevealed: nextBrunoRevealed,
          actors: nextActorsOnRoll,
          realmPieces: nextPiecesRealmWithBruno,
          cosmicClock: nextCosmicClockOnRoll,
          realmAscension: nextRealmAscensionOnRoll,
          realmProgress: nextRealmProgressOnRoll,
        };
      }

      return {
        ...nextState,
        venomTrio: nextVenomTrio,
        brunoRevealed: nextBrunoRevealed,
        actors: nextActorsOnRoll,
        realmPieces: nextPiecesRealmWithBruno,
        cosmicClock: nextCosmicClockOnRoll,
        realmAscension: nextRealmAscensionOnRoll,
        realmProgress: nextRealmProgressOnRoll,
      };
    }

    case "SELECT_PIECE": {
      if (action.player !== state.turn) return state;

      // Era gate: Snake/Rooster (and any future locked base piece) can't be
      // selected while their era hasn't unlocked them yet. Realm pieces are
      // unaffected — they carry their own `unlocked` flag.
      if (
        isBasePieceKind(action.piece) &&
        !isBasePieceUnlocked(action.piece)
      ) {
        return state;
      }

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

    case "SET_GENESIS_UI_COMPLETE":
      return { ...state, genesisUIComplete: true };

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
const nextActors = {
  ...state.actors,
};
      // ===== progreso de reino por globalRollCount =====
      // Sistema híbrido: mínimo de lances globales + condiciones objetivas
      // Reemplaza el sistema de vueltas (loopsNeeded) que era impredecible
      const prevRealmProgress = state.realmProgress[me];

      // Mantenemos loopProgress para compatibilidad visual (barras de progreso)
      // pero ya no dispara la transición
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
      let unlockedRealmKey: RealmPieceKind | null = null;

      // ===== ORQUESTADOR DE PROGRESIÓN (D-009, D-020) =====
      // Evalúa condiciones objetivas para la transición entre Avatares
      const orchestratorResult = evaluateOrchestrator(state, me);
      const conditionsMet = orchestratorResult.event === "REVEAL_NEXT_AVATAR";

      // v4 — RFC Cosmic Clock (APLAZADO): solo actualiza el estado mínimo
      // (era + contador de transición) cuando el Orquestador ya decidió por
      // su cuenta revelar el siguiente Avatar. No añade ninguna condición
      // propia — es puro reflejo de una decisión que el sistema actual ya
      // toma. progress se deja en 0 (ver types.ts).
      let nextCosmicClock = state.cosmicClock;
      if (conditionsMet && orchestratorResult.event === "REVEAL_NEXT_AVATAR") {
        const newEra = STEP_TO_ACTOR_ID[orchestratorResult.avatarStep];
        if (newEra && newEra !== state.cosmicClock.era) {
          nextCosmicClock = {
            era: newEra,
            progress: 0,
            transitionSequence: state.cosmicClock.transitionSequence + 1,
          };
        }
      }

    if (
  prevRealmProgress.currentRealmStep < 7 &&
  conditionsMet
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
 // v10 — reparación de identidad de etapa (10 agosto 2026). Antes:
 // `nextRealmStepValue - 2`. Con avatarStep = currentStep + 1 (mismo
 // valor que nextRealmStepValue) usado para cosmicClock.era más arriba,
 // esa fórmula quedaba UN Avatar por detrás de lo que decía el reloj
 // cósmico — cuando el Orquestador revelaba "margot" en cosmicClock.era,
 // esta línea creaba en realidad la ficha de "hungry_ghost" (Bruno).
 // Con Bruno ahora creado directamente en Genesis (ver case "ROLL"),
 // esta cadena empieza en Margot: `bruno_to_margot` debe crear a Margot
 // (hell), no a Bruno. -1 alinea el índice con avatarStep.
unlockedRealmKey =
  REALM_PIECE_ORDER[nextRealmStepValue - 1] ?? null;

const nextRealmKey = unlockedRealmKey;

if (nextRealmKey) {
  const existingRealmPiece = state.realmPieces[me]?.[nextRealmKey];

  if (!existingRealmPiece?.unlocked) {
    nextPiecesRealm[me][nextRealmKey] = {
      id: `${me}-${nextRealmKey}`,
      kind: nextRealmKey,
      pos: finalToPos,
      inLimbo: false,
      maraLevel: null,
      unlocked: true,
    };
}
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
// ===== captura sobre posición final real (Venenos + Avatares, D-014) =====
// v6 — Avatar-vs-Avatar: la misma regla 0/1/2+ que ya regía solo para
// Venenos ahora se evalúa sobre el conjunto combinado de piezas del
// rival (Venenos + Avatares de reino) presentes en la casilla. Un
// jugador con 2+ piezas propias (de cualquier tipo combinado) en una
// casilla queda protegido frente al rival — apilamiento estilo
// Backgammon, sección 6.3 de la RFC.
let didCapture = false;
let capturedPieceKind: PieceKind | null = null;

type EnemyRef =
  | { system: "base"; kind: BasePieceKind }
  | { system: "realm"; kind: RealmPieceKind };

const getEnemyRefsAtPos = (pos: number): EnemyRef[] => {
  const refs: EnemyRef[] = [];

  for (const kind of BASE_PIECES) {
    const enemy = nextPieces[opp][kind];
    if (!enemy.inLimbo && enemy.pos === pos) {
      refs.push({ system: "base", kind });
    }
  }

  for (const kind of REALM_PIECE_ORDER) {
    const enemy = nextPiecesRealm[opp][kind];
    if (enemy && enemy.unlocked && !enemy.inLimbo && enemy.pos === pos) {
      refs.push({ system: "realm", kind });
    }
  }

  return refs;
};

const enemiesAtFinalPos = getEnemyRefsAtPos(finalToPos);

// 2+ enemigos (Venenos + Avatares combinados) en destino final =
// casilla bloqueada. El movimiento queda prohibido aunque la UI se
// equivoque.
if (enemiesAtFinalPos.length >= 2) {
  return state;
}

const possibleCapturePositions = Array.from(new Set([toPos, finalToPos]));

const enemyRefsAtTarget = possibleCapturePositions.flatMap(getEnemyRefsAtPos);

// se captura si hay 1 enemiga sola en la casilla
if (enemyRefsAtTarget.length >= 1) {
  const enemyRef = enemyRefsAtTarget[enemyRefsAtTarget.length - 1];

  didCapture = true;
  capturedPieceKind = enemyRef.kind;
  nextCaptures[me] += 1;

  if (enemyRef.system === "base") {
    nextPieces[opp][enemyRef.kind] = {
      ...nextPieces[opp][enemyRef.kind],
      pos: -1,
      inLimbo: true,
      maraLevel: 1,
    };
  } else {
    const capturedRealmPiece = nextPiecesRealm[opp][enemyRef.kind]!;
    nextPiecesRealm[opp][enemyRef.kind] = {
      ...capturedRealmPiece,
      pos: -1,
      inLimbo: true,
      maraLevel: 1,
    };
  }

  nextCurvature[me] = clampCurvature((nextCurvature[me] ?? 0) + 6);
  nextCurvature[opp] = clampCurvature((nextCurvature[opp] ?? 0) - 8);
}

// ===== movimiento final =====

const isBasePiece =
  BASE_PIECES.includes(activePiece as BasePieceKind);

if (isBasePiece) {
  const activeBasePiece = activePiece as BasePieceKind;

  nextPieces[me][activeBasePiece].pos = finalToPos;
  nextPieces[me][activeBasePiece].inLimbo = false;
  nextPieces[me][activeBasePiece].maraLevel = null;

  // ===== BRUNO SE MUEVE USANDO LOS BICHOS =====
  const bruno = nextActors.bruno;

  if (bruno?.unlocked && bruno.owner === me) {
    nextActors.bruno = {
      ...bruno,
      pos: finalToPos,
      inLimbo: false,
      maraLevel: null,
    };
  }
} else {
  const activeRealmPiece =
    activePiece as RealmPieceKind;

  const realmPiece =
    nextPiecesRealm[me]?.[activeRealmPiece];

  if (!realmPiece) {
    return state;
  }

  nextPiecesRealm[me][activeRealmPiece] = {
    ...realmPiece,
    pos: finalToPos,
    inLimbo: false,
    maraLevel: null,
    unlocked: true,
  };

  // v3 — Actualización Crítica (D-001/D-014): el Veneno que originó este
  // destino viaja junto con el Avatar. Los otros dos Venenos y los demás
  // Avatares permanecen donde estaban.
  if (option.venomId) {
    const venomPiece = nextPieces[me][option.venomId];

    if (venomPiece && !venomPiece.inLimbo) {
      nextPieces[me][option.venomId] = {
        ...venomPiece,
        pos: finalToPos,
      };
    }
  }
}
const currentRealm = realmFromPos(finalToPos);
      let nextRealmProgress = {
        ...state.realmProgress,
        [me]: {
          ...state.realmProgress[me],
          currentRealmStep: nextRealmStep,
          completedLoopsInRealm: nextCompletedLoops,
          currentLoopProgress: nextLoopProgress,
          realmTransitions: nextRealmTransitions,
          // v10 — reparación de identidad de etapa: se resetea SOLO cuando
          // esta jugada de verdad ascendió de Avatar (didAscendRealm),
          // para que el guardrail relativo del Orquestador (sección 1.5,
          // rollsInCurrentStage) cuente desde que el Avatar actual
          // apareció, no desde el inicio de la partida.
          stageStartedAtRoll: didAscendRealm
            ? state.globalRollCount
            : state.realmProgress[me].stageStartedAtRoll,
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

      // v6 — Victory Architecture (RFC v1.1 sección 6, módulo separado
      // en src/game/victory/nirvana.ts). Reemplaza el placeholder
      // "llegar al final de la pista" por la condición real: Whitman
      // alcanzado + 6 Avatares propios en Humans + Karma (stub READY).
      // Se comprueba al final del turno del jugador activo, como pedía
      // la RFC — el propio move que se está resolviendo ya dejó el
      // estado de piezas actualizado más abajo (nextPiecesRealm), así
      // que la formación se evalúa sobre ese estado ya movido, no
      // sobre el previo.
      const stateAfterThisMove: GameState = {
        ...state,
        pieces: nextPieces,
        realmPieces: nextPiecesRealm,
        realmProgress: {
          ...state.realmProgress,
          [me]: { ...state.realmProgress[me], currentRealmStep: nextRealmStep },
        },
      };
      const didWin = checkNirvana(stateAfterThisMove, me);

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

      // v5 — Acto 0: eventos de novedad (ver ROLL más arriba para hasRolled
      // / hasMaraReturn). Aquí se encienden los otros dos.
      const nextGenesisNovelty = {
        ...state.genesisNovelty,
        hasMoved: true,
        hasCaptured: state.genesisNovelty.hasCaptured || didCapture,
      };

      const nextBrunoRevealed =
        state.brunoRevealed ||
        evaluateGenesisToBruno({
          ...state,
          decisionSignature: nextDecisionSignature,
          genesisNovelty: nextGenesisNovelty,
        });

      // v15 (10 agosto 2026) — mismo paquete completo de nacimiento de
      // Bruno que ya existe en case "ROLL", replicado aquí. Caso límite
      // real: si hasMaraReturn ya estaba en true de antes (de un ciclo
      // de Mara anterior sin relación con Genesis) y las otras tres
      // condiciones se completan durante un CONSCIOUS_MOVE en vez de un
      // ROLL, la transición ocurre AQUÍ — y antes de este arreglo, este
      // camino solo tocaba el actor legacy sin renderizado, sin crear
      // la ficha real, el video, ni el reloj cósmico.
      const brunoJustRevealedInMove = !state.brunoRevealed && nextBrunoRevealed;

      if (brunoJustRevealedInMove) {
        nextActors.bruno = { ...nextActors.bruno, unlocked: true };

        nextPiecesRealm.P1 = {
          ...nextPiecesRealm.P1,
          hungry_ghost: nextPiecesRealm.P1.hungry_ghost ?? {
            id: "P1-hungry_ghost",
            kind: "hungry_ghost" as RealmPieceKind,
            pos: 0,
            inLimbo: false,
            maraLevel: null,
            unlocked: true,
          },
        };
        nextPiecesRealm.P2 = {
          ...nextPiecesRealm.P2,
          hungry_ghost: nextPiecesRealm.P2.hungry_ghost ?? {
            id: "P2-hungry_ghost",
            kind: "hungry_ghost" as RealmPieceKind,
            pos: 12,
            inLimbo: false,
            maraLevel: null,
            unlocked: true,
          },
        };
      }

      const nextCosmicClockForBrunoInMove = brunoJustRevealedInMove
        ? { era: "bruno" as const, progress: 0, transitionSequence: state.cosmicClock.transitionSequence + 1 }
        : nextCosmicClock;

      const nextRealmAscensionForBrunoInMove = brunoJustRevealedInMove
        ? { player: me, realmStep: 1, realmKey: "hungry_ghost" as RealmPieceKind, at: Date.now() }
        : undefined; // undefined = dejar que el cálculo normal de más abajo decida

      if (brunoJustRevealedInMove) {
        nextRealmProgress = {
          ...nextRealmProgress,
          P1: { ...nextRealmProgress.P1, stageStartedAtRoll: state.globalRollCount },
          P2: { ...nextRealmProgress.P2, stageStartedAtRoll: state.globalRollCount },
        };
      }

      return {
        ...state,
        pieces: nextPiecesAfterCollapse,
        realmPieces: nextPiecesRealm,
        captures: nextCaptures,
        actors: nextActors,
        curvature: nextCurvature,
        realmProgress: nextRealmProgress,
        cosmicClock: nextCosmicClockForBrunoInMove,
        genesisNovelty: nextGenesisNovelty,
        brunoRevealed: nextBrunoRevealed,
// v15 (10 agosto 2026) — bug real reproducido: antes esto forzaba
// realmAscension a null en CADA movimiento que no fuera él mismo una
// ascensión — es decir, borraba el evento un turno después de que
// naciera. En un navegador real eso puede alcanzar a dispararse (si
// App.tsx procesa el efecto antes del siguiente movimiento), pero no
// es confiable, y en la reproducción directa contra el reducer el
// evento se perdía en cuanto el jugador hacía su siguiente jugada
// normal. No hay ninguna razón para resetearlo — el dedup del video
// ya lo maneja un ref en App.tsx (playedRealmIntrosRef), así que aquí
// solo hace falta conservar el último evento, no borrarlo.
realmAscension: nextRealmAscensionForBrunoInMove ?? (didAscendRealm && unlockedRealmKey
  ? {
      player: me,
      realmStep: nextRealmStep,
      realmKey: unlockedRealmKey,
      at: Date.now(),
    }
  : state.realmAscension),
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

          // v2: Avatar activo y Veneno usado (para KarmaEngine v2)
          avatarId: state.actors.bruno?.owner === me && state.actors.bruno?.unlocked
            ? "bruno"
            : undefined,
          // v3 — Actualización Crítica (D-007): el Veneno usado es el propio
          // (Fase 1, moviéndose por sí mismo) o el que originó el destino
          // del Avatar (option.venomId, ver getMoveOptionsForPlayer v3).
          venomUsed: isBasePiece
            ? (activePiece as import("../actors/actorProfiles").VenomId)
            : (option.venomId as import("../actors/actorProfiles").VenomId | undefined),

          // v3: posición del Veneno antes y después — fromPos/finalToPos ya
          // representan la posición del Veneno en ambos casos (ver arriba).
          venomPositionBefore:
            isBasePiece || option.venomId ? fromPos : undefined,
          venomPositionAfter:
            isBasePiece || option.venomId ? finalToPos : undefined,

          // v2: datos para detección de capturas declinadas (D-018)
          captureWasAvailable: allOptions.some(o => o.meaning === "IMPACT"),
          legalCapturesCount: allOptions.filter(o => o.meaning === "IMPACT").length,
          turnLost: false,

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