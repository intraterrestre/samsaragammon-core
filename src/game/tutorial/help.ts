// src/game/tutorial/help.ts
//
// PLAY WITH BUDDHA — ayuda a demanda (2 octubre 2026).
//
// Lo que Buddha responde cuando el principiante toca su icono y pregunta.
// Todo sale del GameState real y de las mismas funciones con las que el
// motor decide (legalMoves, nirvana, dharma777...): Buddha nunca puede
// decir algo que el juego no haría. Funciones puras, sin efectos: la
// ayuda no es una jugada y no toca el estado.
//
// Cada respuesta es una lista corta de frases (una por línea en pantalla).

import type { BasePieceKind, GameState, PieceKind, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { REALM_AVATAR_NAME } from "../realmAvatarNames";
import { CANONICAL_REALM_LABEL, canonicalRealmFromPos } from "../../UI/realm";
import { getAllLegalMoves, isPhase2 } from "../rules/legalMoves";
import { getPigForcedAvatar } from "../rules/getMoveOptionsForPlayer";
import { getDharma777Opportunity } from "../dharma777";
import { isVictoryEnabled, countNirvanaFormationProgress } from "../victory/nirvana";

export type HelpTopic = "now" | "win" | "happened";

const VENOM_NAME: Record<BasePieceKind, string> = {
  pig: "Pig",
  snake: "Snake",
  rooster: "Rooster",
};

const COLOR: Record<PlayerId, string> = { P1: "White", P2: "Black" };

function pieceName(kind: PieceKind): string {
  return kind in VENOM_NAME
    ? VENOM_NAME[kind as BasePieceKind]
    : REALM_AVATAR_NAME[kind as RealmPieceKind];
}

function realmName(pos: number): string {
  return CANONICAL_REALM_LABEL[canonicalRealmFromPos(pos)];
}

function list(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
}

// ---------------------------------------------------------------- now
function whatCanIDoNow(state: GameState, player: PlayerId): string[] {
  if (state.winner) {
    return [`The game is over. ${COLOR[state.winner]} reached Nirvana.`];
  }
  if (state.phase === "idle") {
    return ["Roll the stones: tap the dice."];
  }

  const legal = getAllLegalMoves(state, player);
  if (legal.length === 0) {
    return ["No path this roll.", "Press PASS. The wheel keeps turning."];
  }

  const lines: string[] = [];
  const [a, b] = state.rollOptions ?? [0, 0];
  const pig = getPigForcedAvatar(state, player);

  if (!isPhase2(state, player)) {
    const movable = [...new Set(legal.map((m) => m.option.pieceKind))];
    lines.push(`You rolled ${a} and ${b}.`);
    lines.push(`Tap a glowing piece (${list(movable.map(pieceName))}), then a line.`);
  } else if (pig) {
    lines.push(`${REALM_AVATAR_NAME[pig]} just came back from Mara and must move first.`);
    lines.push(`Tap ${REALM_AVATAR_NAME[pig]}, then one of the animals.`);
  } else {
    const selected = state.selectedPiece[player] as RealmPieceKind;
    const avatars = [...new Set(legal.map((m) => m.avatar).filter(Boolean))] as RealmPieceKind[];
    const selectedHasMove = avatars.includes(selected);
    if (!selectedHasMove) {
      lines.push(`Tap an Avatar that can move: ${list(avatars.map((k) => REALM_AVATAR_NAME[k]))}.`);
      lines.push("Then tap an animal. The animal decides where the Avatar lands.");
    } else {
      const venoms = [
        ...new Set(legal.filter((m) => m.avatar === selected).map((m) => m.venom)),
      ].filter(Boolean) as BasePieceKind[];
      lines.push(`${REALM_AVATAR_NAME[selected]} is chosen.`);
      lines.push(`Now tap ${list(venoms.map((v) => VENOM_NAME[v]))}, then a line.`);
    }
  }

  const captures = legal.filter((m) => m.option.meaning === "IMPACT");
  if (captures.length > 0) {
    lines.push("A red line captures: it sends that piece to Mara.");
  }
  if (captures.some((m) => getDharma777Opportunity(state, player, m.option))) {
    lines.push("Round Dharma 777: you may spare a rival in Humans and seal one of yours instead.");
  }
  const collect = legal.some(
    (m) =>
      m.avatar !== null &&
      !state.avatarNidana[player]?.[m.avatar] &&
      !!state.boardNidanas[m.option.toPos] &&
      canonicalRealmFromPos(m.option.toPos) === m.avatar
  );
  if (collect) {
    lines.push("One of your lines lands on a Nidana in its own realm: it would collect it.");
  }
  return lines;
}

// ---------------------------------------------------------------- win
function howDoIWin(state: GameState, player: PlayerId): string[] {
  const lines = [
    "Bring your six Avatars to Humans, sealed.",
    "An Avatar seals itself if it reaches Humans without ever being captured.",
    "If it was captured once, seal it with Square Karma 666 or Round Dharma 777.",
  ];

  const sealedInHumans = countNirvanaFormationProgress(state, player);
  lines.push(`You have ${sealedInHumans} of 6 sealed in Humans.`);
  if (!isVictoryEnabled(state, player)) {
    lines.push("Victory opens when Whitman, your sixth Avatar, is born.");
  }

  const status = REALM_PIECE_ORDER.map((kind) => {
    const piece = state.realmPieces[player]?.[kind];
    const name = REALM_AVATAR_NAME[kind];
    if (!piece?.unlocked) return `${name}: not born yet`;
    if (piece.inLimbo) return `${name}: in Mara`;
    const sealed = !!state.consolidatedAvatars[player]?.[kind];
    const here = canonicalRealmFromPos(piece.pos) === "humans";
    if (sealed && here) return `${name}: sealed, in Humans`;
    if (sealed) return `${name}: sealed, must return to Humans`;
    if (here) return `${name}: in Humans, not sealed (needs 666 or 777)`;
    if (piece.everCaptured) return `${name}: will need 666 or 777 to seal`;
    return `${name}: on its way`;
  });
  return [...lines, ...status];
}

// ---------------------------------------------------------------- happened
function whatJustHappened(state: GameState): string[] {
  const m = state.lastMove;
  if (!m) return ["Nothing yet. The wheel is waiting for the first move."];

  const who = COLOR[m.player];
  const mover = pieceName(m.pieceKind);
  const via =
    m.venomUsed && m.pieceKind !== m.venomUsed ? ` with the ${VENOM_NAME[m.venomUsed]}` : "";
  const lines = [
    `${who} moved ${mover}${via} from ${realmName(m.fromPos)} (cell ${m.fromPos}) to ${realmName(m.toPos)} (cell ${m.toPos}), using ${m.chosenValue}.`,
  ];
  if (m.didCapture && m.capturedPieceKind) {
    const victim = COLOR[m.player === "P1" ? "P2" : "P1"];
    lines.push(`It captured ${victim}'s ${pieceName(m.capturedPieceKind)}.`);
    const rival = m.player === "P1" ? "P2" : "P1";
    const victimKind = m.capturedPieceKind;
    const realm = REALM_PIECE_ORDER.includes(victimKind as RealmPieceKind)
      ? state.realmPieces[rival]?.[victimKind as RealmPieceKind]
      : state.pieces[rival][victimKind as BasePieceKind];
    lines.push(
      realm && !realm.inLimbo
        ? "Its Nidana shielded it: it escaped Mara, but lost the Nidana."
        : "It waits in Mara for 6 rolls, then is reborn anywhere but Humans."
    );
  }
  if (m.captureWasAvailable && !m.didCapture) {
    lines.push("A capture was possible, but another path was chosen.");
  }
  return lines;
}

export function getBuddhaHelp(
  state: GameState,
  player: PlayerId,
  topic: HelpTopic
): string[] {
  if (topic === "now") return whatCanIDoNow(state, player);
  if (topic === "win") return howDoIWin(state, player);
  return whatJustHappened(state);
}
