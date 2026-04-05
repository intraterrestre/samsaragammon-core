import type {
  Choice,
  GameState,
  MoveMeaning,
  MoveOption,
  PieceKind,
  PlayerId,
} from "../types";
import { previewMove } from "./preview";

const ALL_PIECES: PieceKind[] = ["pig", "snake", "rooster"];

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

function inferMeaning(
  target: number,
  enemyPositions: number[],
  isSame: boolean
): MoveMeaning {
  if (isSame) return "SAME";
  if (enemyPositions.includes(target)) return "IMPACT";
  if (enemyPositions.some((p) => Math.abs(p - target) <= 1)) return "RISK";
  return "";
}

export function getMoveOptionsForPlayer(
  state: GameState,
  player: PlayerId
): MoveOption[] {
  if (!state.rollOptions) return [];

  const [a, b] = state.rollOptions;
  const opp = otherPlayer(player);

  const enemyPositions = ALL_PIECES.map((k) => state.pieces[opp][k].pos);

  const options: MoveOption[] = [];

  for (const pieceKind of ALL_PIECES) {
    const fromPos = state.pieces[player][pieceKind].pos;

    const toA = previewMove(fromPos, a, state.trackSize);
    const toB = previewMove(fromPos, b, state.trackSize);

    const capA = enemyPositions.includes(toA);
    const capB = enemyPositions.includes(toB);

    const isSame = toA === toB;

    // A
    options.push({
      pieceKind,
      choice: "A",
      value: a,
      fromPos,
      toPos: toA,
      meaning: inferMeaning(toA, enemyPositions, false),
    });

    // B
    options.push({
      pieceKind,
      choice: "B",
      value: b,
      fromPos,
      toPos: toB,
      meaning: inferMeaning(toB, enemyPositions, false),
    });

    // SAME (extra semántico; sustituye lectura A/B cuando convergen)
    if (isSame) {
      options.push({
        pieceKind,
        choice: "ECO",
        value: a,
        fromPos,
        toPos: toA,
        meaning: inferMeaning(toA, enemyPositions, true),
      });
    }

    // A+B
    const allowSum = state.level >= 3 && !capA && !capB;
    if (allowSum) {
      const sum = a + b;
      const toAB = previewMove(fromPos, sum, state.trackSize);

      options.push({
        pieceKind,
        choice: "AB",
        value: sum,
        fromPos,
        toPos: toAB,
        meaning: inferMeaning(toAB, enemyPositions, false),
      });
    }
  }

  return options;
}