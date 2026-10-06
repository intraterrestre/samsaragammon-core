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
// Multilingüe: los textos viven en src/i18n (en.ts, es.ts); aquí solo se
// eligen las claves y se rellenan los datos.

import { humansRevealed } from "../rules/humansReveal";
import type { BasePieceKind, GameState, PieceKind, PlayerId, RealmPieceKind } from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { REALM_AVATAR_NAME } from "../realmAvatarNames";
import { canonicalRealmFromPos } from "../../UI/realm";
import { getAllLegalMoves, isPhase2 } from "../rules/legalMoves";
import { getPigForcedAvatar } from "../rules/getMoveOptionsForPlayer";
import { getDharma777Opportunity } from "../dharma777";
import { isVictoryEnabled, countNirvanaFormationProgress } from "../victory/nirvana";
import { translate, type Lang, type Vars } from "../../i18n";
import type { MessageKey } from "../../i18n/en";

export type HelpTopic = "now" | "win" | "happened";

const VENOMS: BasePieceKind[] = ["pig", "snake", "rooster"];

function make(lang: Lang) {
  const t = (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
  const venom = (v: BasePieceKind) => t(`venom.${v}` as MessageKey);
  const piece = (k: PieceKind) =>
    VENOMS.includes(k as BasePieceKind)
      ? venom(k as BasePieceKind)
      : REALM_AVATAR_NAME[k as RealmPieceKind];
  const realm = (pos: number) => t(`realm.${canonicalRealmFromPos(pos)}` as MessageKey);
  const color = (p: PlayerId) => t(`color.${p}` as MessageKey);
  const list = (names: string[]) =>
    names.length <= 1
      ? names.join("")
      : `${names.slice(0, -1).join(", ")} ${t("list.or")} ${names[names.length - 1]}`;
  return { t, venom, piece, realm, color, list };
}

// ---------------------------------------------------------------- now
function whatCanIDoNow(state: GameState, player: PlayerId, lang: Lang): string[] {
  const { t, venom, piece, list, color } = make(lang);

  if (state.winner) return [t("help.gameOver", { color: color(state.winner) })];
  if (state.phase === "idle") return [t("help.roll")];

  const legal = getAllLegalMoves(state, player);
  if (legal.length === 0) return [t("help.noPath"), t("help.pressPass")];

  const lines: string[] = [];
  const [a, b] = state.rollOptions ?? [0, 0];
  const pig = getPigForcedAvatar(state, player);

  if (!isPhase2(state, player)) {
    const movable = [...new Set(legal.map((m) => m.option.pieceKind))];
    lines.push(t("help.rolled", { a, b }));
    lines.push(t("help.tapPiece", { pieces: list(movable.map(piece)) }));
  } else if (pig) {
    lines.push(t("help.pigForced", { name: REALM_AVATAR_NAME[pig] }));
    lines.push(t("help.tapPigAvatar", { name: REALM_AVATAR_NAME[pig] }));
  } else {
    const selected = state.selectedPiece[player] as RealmPieceKind;
    const avatars = [...new Set(legal.map((m) => m.avatar).filter(Boolean))] as RealmPieceKind[];
    if (!avatars.includes(selected)) {
      lines.push(t("help.tapAvatar", { names: list(avatars.map((k) => REALM_AVATAR_NAME[k])) }));
      lines.push(t("help.thenAnimal"));
    } else {
      const venoms = [
        ...new Set(legal.filter((m) => m.avatar === selected).map((m) => m.venom)),
      ].filter(Boolean) as BasePieceKind[];
      lines.push(t("help.avatarChosen", { name: REALM_AVATAR_NAME[selected] }));
      lines.push(t("help.tapVenom", { venoms: list(venoms.map(venom)) }));
    }
  }

  const captures = legal.filter((m) => m.option.meaning === "IMPACT");
  if (captures.length > 0) lines.push(t("help.redLine"));
  if (captures.some((m) => getDharma777Opportunity(state, player, m.option))) {
    lines.push(t("help.dharma"));
  }
  const collect = legal.some(
    (m) =>
      m.avatar !== null &&
      !state.avatarNidana[player]?.[m.avatar] &&
      !!state.boardNidanas[m.option.toPos] &&
      canonicalRealmFromPos(m.option.toPos) === m.avatar
  );
  if (collect) lines.push(t("help.collect"));
  return lines;
}

// ---------------------------------------------------------------- win
function howDoIWin(state: GameState, player: PlayerId, lang: Lang): string[] {
  const { t } = make(lang);
  const lines = [
    t("win.goal"),
    t("win.autoSeal"),
    t("win.revenge"),
    t("win.count", { n: countNirvanaFormationProgress(state, player) }),
  ];
  if (!isVictoryEnabled(state, player)) lines.push(t("win.whitmanGate"));

  for (const kind of REALM_PIECE_ORDER) {
    const p = state.realmPieces[player]?.[kind];
    const name = REALM_AVATAR_NAME[kind];
    if (!p?.unlocked) {
      lines.push(t("win.notBorn", { name }));
      continue;
    }
    if (p.inLimbo) {
      lines.push(t("win.inMara", { name }));
      continue;
    }
    const sealed = !!state.consolidatedAvatars[player]?.[kind];
    const here = canonicalRealmFromPos(p.pos) === "humans";
    if (sealed && here) lines.push(t("win.sealedHere", { name }));
    else if (sealed) lines.push(t("win.sealedAway", { name }));
    else if (here && !humansRevealed(state)) lines.push(t("win.waitsReveal", { name }));
    else if (here) lines.push(t("win.hereUnsealed", { name }));
    else if (p.everCaptured) lines.push(t("win.willNeed", { name }));
    else lines.push(t("win.onWay", { name }));
  }
  return lines;
}

// ---------------------------------------------------------------- happened
function whatJustHappened(state: GameState, lang: Lang): string[] {
  const { t, venom, piece, realm, color } = make(lang);
  const m = state.lastMove;
  if (!m) return [t("happened.nothing")];

  const via =
    m.venomUsed && m.pieceKind !== m.venomUsed
      ? t("happened.via", { venom: venom(m.venomUsed as BasePieceKind) })
      : "";
  const lines = [
    t("happened.moved", {
      who: color(m.player),
      mover: piece(m.pieceKind),
      via,
      from: realm(m.fromPos),
      fromPos: m.fromPos,
      to: realm(m.toPos),
      toPos: m.toPos,
      value: m.chosenValue,
    }),
  ];

  if (m.didCapture && m.capturedPieceKind) {
    const rival: PlayerId = m.player === "P1" ? "P2" : "P1";
    lines.push(t("happened.captured", { victim: color(rival), piece: piece(m.capturedPieceKind) }));
    const victim = REALM_PIECE_ORDER.includes(m.capturedPieceKind as RealmPieceKind)
      ? state.realmPieces[rival]?.[m.capturedPieceKind as RealmPieceKind]
      : state.pieces[rival][m.capturedPieceKind as BasePieceKind];
    lines.push(victim && !victim.inLimbo ? t("happened.shielded") : t("happened.toMara"));
  }
  if (m.captureWasAvailable && !m.didCapture) lines.push(t("happened.declined"));
  return lines;
}

export function getBuddhaHelp(
  state: GameState,
  player: PlayerId,
  topic: HelpTopic,
  lang: Lang = "en"
): string[] {
  if (topic === "now") return whatCanIDoNow(state, player, lang);
  if (topic === "win") return howDoIWin(state, player, lang);
  return whatJustHappened(state, lang);
}
