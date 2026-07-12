import React, { useEffect, useRef, useState } from "react";
import type { GameState, MoveOption, PieceKind, BasePieceKind, PlayerId } from "./types";
import {  cellStyle as ringCellStyle, RING_SIZE,  piecePosition,} from "../UI/geometry";
import { realmFromPos, REALM_LABEL, pickLine } from "../UI/realm";
import { ExplainModal } from "../UI/ExplainModal";
import { MoveEmanations } from "../UI/MoveEmanations";
import budaKarmaER from "../assets/tokens/buda-karma-er.webp";
import BigHeadSchoolOverlay from "../UI/BigHeadSchoolOverlay";
import { getUnlockedBasePieces } from "./era";
import { STONE_GRADIENT, STONE_RING, STONE_SHADOW } from "./dice/stoneDiceStyle";

// 🔥 FICHAS
import pigWhite from "../assets/pieces/pig_white.webp";
import pigBlack from "../assets/pieces/pig_black.webp";
import roosterWhite from "../assets/pieces/rooster_white.webp";
import roosterBlack from "../assets/pieces/rooster_black.webp";
import cobraWhite from "../assets/pieces/cobra_white.webp";
import cobraBlack from "../assets/pieces/cobra_black.webp";

// 🔊 SONIDOS
import captureWhite from "../assets/sounds/capture_white.mp3";
import captureBlack from "../assets/sounds/capture_black.mp3";
import moveSound from "../assets/sounds/move.mp3";

import brunoP1 from "../assets/tokens/bruno_P1.webp";
import brunoP2 from "../assets/tokens/bruno_P2.webp";

import margotP1 from "../assets/tokens/margot_P1.webp";
import margotP2 from "../assets/tokens/margot_P2.webp";

import marinoP1 from "../assets/tokens/marino_P1.webp";
import marinoP2 from "../assets/tokens/marino_P2.webp";

import oriolP1 from "../assets/tokens/oriol_P1.webp";
import oriolP2 from "../assets/tokens/oriol_P2.webp";

import rufusP1 from "../assets/tokens/rufus_P1.webp";
import rufusP2 from "../assets/tokens/rufus_P2.webp";

import whitmanP1 from "../assets/tokens/whitman_P1.webp";
import whitmanP2 from "../assets/tokens/whitman_P2.webp";

// 🎲 Previous dice art — retired from the active roll button for this sprint
// (see point 4 of the Genesis Intro brief) but kept imported/usable so a
// future era can bring the spinning portal dice back.
import diceWhitePortal from "../assets/dice/dice_white_portal.webp";
import diceBlackPortal from "../assets/dice/dice_black_portal.webp";

// Real reference photo for the Primitive Era roll-button icon (pitted stone
// dice pair), dropped in by hand — see src/assets/dice/primitive/.
import diceGenesisStonePair from "../assets/dice/primitive/dice_genesis_1.webp";

// Flip this back to `true` to restore the white/black portal dice as the
// roll-button art. Off by default while the Primitive Era stone dice photo
// is active.
const USE_LEGACY_PORTAL_DICE_ART = false;

// Flip this to `true` to fall back to the CSS-drawn stone circles below
// instead of the real photo, e.g. if the photo asset is ever missing.
const USE_CSS_STONE_ICON_FALLBACK = false;

// CSS approximation of a carved-stone dice pair (see
// src/game/dice/stoneDiceStyle.ts) — superseded by the real photo above,
// kept as a fallback so the roll button still has *something* if the photo
// asset is removed.
function StoneDiceIcon({ color }: { color: "white" | "black" }) {
  return (
    <div
      style={{
        width: "42%",
        height: "68%",
        borderRadius: "50%",
        background: STONE_GRADIENT[color],
        border: `1px solid ${STONE_RING[color]}`,
        boxShadow: STONE_SHADOW,
        flexShrink: 0,
      }}
    />
  );
}

type Props = {
  state: GameState;
  onSelectPiece?: (piece: string) => void;
  hoveredOption?: MoveOption | null;
  moveOptions?: MoveOption[];
  onChooseMove?: (option: MoveOption, allOptions: MoveOption[]) => void;
  onSendEmoji?: (emoji: string) => void;
  onRoll?: () => void;
  nidanaCoinSrc?: string | null;
  nidanaCoinSide?: "front" | "back";
  nidanaCoinId?: number | null;
};
const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

const playerLabel = (p: PlayerId) => (p === "P1" ? "⚪ White" : "⚫ Black");
const PIECE_KINDS: PieceKind[] = ["pig", "snake", "rooster"];

// Era 1 (Ignorance) gate: only unlocked base pieces render on the board or
// can be clicked/selected. Snake and Rooster stay fully coded (imports,
// styles, sort keys, etc. are untouched below) — they're just filtered out
// of the active render list until a later era unlocks them.
const ACTIVE_PIECE_KINDS: PieceKind[] = getUnlockedBasePieces(
  ["pig", "snake", "rooster"] as BasePieceKind[]
);

// Visual size per base piece. Pig is enlarged vs. the previous uniform
// 50px so it reads clearly as the sole active drive of Era 1. Capped at
// 90px: the ring sits close to the top/bottom edge of the scaled
// samsaraScene (which clips overflow), so anything much bigger than this
// gets its head cut off on the topmost/bottommost cells. Snake/Rooster
// keep the original size for whenever their era switches them back on.
const PIECE_VISUAL_SIZE: Record<BasePieceKind, number> = {
  pig: 90,
  snake: 50,
  rooster: 50,
};
const NIDANA_EFFECT_LINES: Record<number, {
  title: string;
  body: string;
}> = {
  1: {
    title: "🌑 IGNORANCE ACTIVE",
    body: "You mistake the shadow for the thing itself.",
  },
  2: {
    title: "🔄 FORMATIONS ACTIVE",
    body: "Old patterns begin moving before you choose.",
  },
  3: {
    title: " CONSCIOUSNESS ACTIVE",
    body: "A witness appears, but still believes the dream.",
  },
  4: {
    title: "🧍 NAME & FORM ACTIVE",
    body: "Identity hardens around what should keep flowing.",
  },
  5: {
    title: "🪟 SIX SENSES ACTIVE",
    body: "The gates open. The world rushes in.",
  },
  6: {
    title: "🤝 CONTACT ACTIVE",
    body: "Touch becomes trigger. The chain tightens.",
  },
  7: {
    title: "💢 FEELING ACTIVE",
    body: "Pleasure and pain begin choosing for you.",
  },
  8: {
    title: "🔥 CRAVING ACTIVE",
    body: "The hand reaches before wisdom arrives.",
  },
  9: {
    title: "🪢 CLINGING ACTIVE",
    body: "What you hold begins holding you.",
  },
  10: {
    title: "♻️ BECOMING ACTIVE",
    body: "A new self is being assembled.",
  },
  11: {
    title: "🌱 BIRTH ACTIVE",
    body: "A fresh form enters the wheel.",
  },
  12: {
    title: "💀 DEATH ACTIVE",
    body: "The ending prepares the next beginning.",
  },
};
const EMOJIS = ["😴", "🔥", "🐷", "🐍", "⚔️", "🧘", "😂", "😡"];
const pieceShort = (k: PieceKind) => {
  if (k === "pig") return "P";
  if (k === "snake") return "S";
  return "R";
};
const REALM_TOKEN_MAP = {
  hungry_ghost: { P1: brunoP1, P2: brunoP2 },
  hell: { P1: margotP1, P2: margotP2 },
  animals: { P1: oriolP1, P2: oriolP2 },
  humans: { P1: marinoP1, P2: marinoP2 },
  asura: { P1: rufusP1, P2: rufusP2 },
  deva: { P1: whitmanP1, P2: whitmanP2 },
} as const;
function pieceSortKey(player: PlayerId, kind: PieceKind) {
  const playerOrder = player === "P1" ? 0 : 10;
  const kindOrder = kind === "pig" ? 0 : kind === "snake" ? 1 : 2;
  return playerOrder + kindOrder;
}

function stackOffset(index: number, total: number) {
  if (total <= 1) return { x: 0, y: 0 };

  if (total === 2) {
    return index === 0 ? { x: -10, y: 0 } : { x: 10, y: 0 };
  }

  if (total === 3) {
    const offsets = [
      { x: 0, y: -10 },
      { x: -9, y: 8 },
      { x: 9, y: 8 },
    ];
    return offsets[index] ?? { x: 0, y: 0 };
  }

  const radius = 10;
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
/* =====================================================
   /* =====================================================
   STACK ENGINE
   ===================================================== */

function getStackedTokenPosition({
  base,
  pieceSize,
  indexInStack,
  totalInStack,
  wheelCenter,
  spacing = 26,
}: {
  base: { left: number; top: number };
  pieceSize: number;
  indexInStack: number;
  totalInStack: number;
  wheelCenter: { x: number; y: number };
  spacing?: number;
}) {
  if (totalInStack <= 1) {
    return {
      left: base.left,
      top: base.top,
      zIndex: 40,
    };
  }

  const cellCenterX = base.left + pieceSize / 2;
  const cellCenterY = base.top + pieceSize / 2;

  const dx = wheelCenter.x - cellCenterX;
  const dy = wheelCenter.y - cellCenterY;

  const len = Math.hypot(dx, dy) || 1;

  const ux = dx / len;
  const uy = dy / len;

  const px = -uy;
  const py = ux;

  const compressedSpacing =
    totalInStack >= 6 ? 18 :
    totalInStack === 5 ? 21 :
    totalInStack === 4 ? 25 :
    totalInStack === 3 ? 30 :
    spacing;

  const radialOffset = indexInStack * compressedSpacing;

  const midIndex = (totalInStack - 1) / 2;

  const lateralOffset =
    totalInStack > 4
      ? (indexInStack - midIndex) * 10
      : 0;

  return {
    left:
      cellCenterX +
      ux * radialOffset +
      px * lateralOffset -
      pieceSize / 2,

    top:
      cellCenterY +
      uy * radialOffset +
      py * lateralOffset -
      pieceSize / 2,

    zIndex: 40 + indexInStack,
  };
}

function buildUnifiedStackMap(
  state: GameState
): Map<string, { stackIndex: number; stackTotal: number }> {
  const byPos = new Map<
    number,
    { player: PlayerId; kind: string }[]
  >();

  const addToken = (pos: number, player: PlayerId, kind: string) => {
    if (!byPos.has(pos)) byPos.set(pos, []);
    byPos.get(pos)!.push({ player, kind });
  };

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
    ACTIVE_PIECE_KINDS.forEach((kind) => {
      const piece = state.pieces[player][kind];

      if (!piece.inLimbo) {
        addToken(piece.pos, player, kind);
      }
    });
  });

  const realmOrder = [
    "hungry_ghost",
    "hell",
    "animals",
    "humans",
    "asura",
    "deva",
  ] as const;

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
    realmOrder.forEach((kind) => {
      const piece = state.realmPieces?.[player]?.[kind];

      if (piece && !piece.inLimbo && piece.unlocked) {
        addToken(piece.pos, player, kind);
      }
    });
  });

  const result = new Map<
    string,
    { stackIndex: number; stackTotal: number }
  >();

  byPos.forEach((tokens) => {
    const stackTotal = tokens.length;

    tokens.forEach(({ player, kind }, stackIndex) => {
      result.set(`${player}-${kind}`, {
        stackIndex,
        stackTotal,
      });
    });
  });

  return result;
}

export function Board({
  state,
  onSelectPiece,
  hoveredOption,
  moveOptions,
  onChooseMove,
  onSendEmoji,
  onRoll,
  nidanaCoinSrc,
  nidanaCoinSide,
  nidanaCoinId,
}: Props){

  const captureAudioWhite = useRef<HTMLAudioElement | null>(null);
  const captureAudioBlack = useRef<HTMLAudioElement | null>(null);
  const moveAudio = useRef<HTMLAudioElement | null>(null);

const [lastEmojiAt, setLastEmojiAt] = useState(0);
const [explainOpen, setExplainOpen] = useState(false);
const [explainPlayer, setExplainPlayer] = useState<PlayerId>("P1");

const [impactPos, setImpactPos] = useState<number | null>(null);
const [flashCell, setFlashCell] = useState<number | null>(null);

const [ghost, setGhost] = useState<string | null>(null);
const ghostTimer = useRef<number | null>(null);

const [beat, setBeat] = useState(false);
const beatTimer = useRef<number | null>(null);

  // 🔊 INICIALIZAR AUDIOS

  useEffect(() => {
    captureAudioWhite.current = new Audio(captureWhite);
    captureAudioBlack.current = new Audio(captureBlack);
    moveAudio.current = new Audio(moveSound);

    if (moveAudio.current) moveAudio.current.volume = 0.03;
    if (captureAudioWhite.current) captureAudioWhite.current.volume = 0.35;
    if (captureAudioBlack.current) captureAudioBlack.current.volume = 0.35;
    
}, []);
  const size = state.trackSize;
const me = state.turn;
const other = otherPlayer(me);
const rolls = state.phase === "rolled" ? state.rollOptions : null;

const activePiece = state.selectedPiece[me];

const activeBasePiece = PIECE_KINDS.includes(activePiece as PieceKind)
  ? (activePiece as PieceKind)
  : null;

const activeRealmPiece =
  state.realmPieces?.[me]?.[
    activePiece as keyof typeof state.realmPieces.P1
  ];

const activePos =
  activeBasePiece
    ? state.pieces?.[me]?.[activeBasePiece]?.pos
    : activeRealmPiece?.pos ?? null;

  const [bigHeadSchoolBy, setBigHeadSchoolBy] =
  useState<"white" | "black" | null>(null);

  const [dharmaEmergencyFor, setDharmaEmergencyFor] =
  useState<PlayerId | null>(null);

  // 🔊 DISPARAR SONIDO / FX POR LAST MOVE
  useEffect(() => {
    if (!state.lastMove) return;

    if (state.lastMove.didCapture) {
      const player = state.lastMove.player;

      if (player === "P1") {
        if (captureAudioWhite.current) {
          captureAudioWhite.current.currentTime = 0;
          captureAudioWhite.current.play().catch(() => {});
        }
      } else {
        if (captureAudioBlack.current) {
          captureAudioBlack.current.currentTime = 0;
          captureAudioBlack.current.play().catch(() => {});
        }
      }
    } else {
      if (moveAudio.current) {
        moveAudio.current.currentTime = 0;
        moveAudio.current.play().catch(() => {});
      }
    }

    setBeat(true);
    if (beatTimer.current) window.clearTimeout(beatTimer.current);
    beatTimer.current = window.setTimeout(() => setBeat(false), 650);

    const oldRealm = realmFromPos(state.lastMove.fromPos);
    const newRealm = realmFromPos(state.lastMove.toPos);

    setGhost(oldRealm !== newRealm ? pickLine(newRealm) : "flow");

    if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
    ghostTimer.current = window.setTimeout(() => setGhost(null), 1200);

    setImpactPos(state.lastMove.toPos);
    setFlashCell(state.lastMove.toPos);

    const t = window.setTimeout(() => {
      setImpactPos(null);
      setFlashCell(null);
    }, 320);

    return () => window.clearTimeout(t);
  }, [state.lastMove]);

  useEffect(() => {
    return () => {
      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
      if (beatTimer.current) window.clearTimeout(beatTimer.current);
    };
  }, []);

  const turnClass = state.turn === "P1" ? "turnP1" : "turnP2";
  const beatClass = beat ? "beat" : "";

const unifiedStackMap = buildUnifiedStackMap(state);

const wheelCenter = {
  x: RING_SIZE / 2,
  y: RING_SIZE / 2,
};
 const cajaMagica = useRef<number | null>(null);
const [showNidanaBanner, setShowNidanaBanner] = useState(false);

useEffect(() => {
  if (nidanaCoinId && nidanaCoinSide === "front") {
    cajaMagica.current = nidanaCoinId;
    setShowNidanaBanner(false);

    const t = window.setTimeout(() => {
      setShowNidanaBanner(true);
    }, 5600);

    return () => window.clearTimeout(t);
  }
}, [nidanaCoinId, nidanaCoinSide]);

  const piecesByPos: Record<number, { player: PlayerId; kind: PieceKind }[]> =
    {};

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
   ACTIVE_PIECE_KINDS.forEach((kind) => {
      const pieceState = state.pieces[player][kind];
      if (pieceState.inLimbo) return;

      const pos = pieceState.pos;
      if (!piecesByPos[pos]) piecesByPos[pos] = [];
      piecesByPos[pos].push({ player, kind });
    });
  });

  Object.values(piecesByPos).forEach((stack) => {
    stack.sort(
      (a, b) => pieceSortKey(a.player, a.kind) - pieceSortKey(b.player, b.kind)
    );
  });

  const renderedPieces = (["P1", "P2"] as PlayerId[]).flatMap((player) => {
    return ACTIVE_PIECE_KINDS.map((kind) => {
      const pieceState = state.pieces[player][kind];
      if (pieceState.inLimbo) return null;

      const pos = pieceState.pos;

      const isCurrentSelected =
        player === state.turn && state.selectedPiece[player] === kind;

    const base = piecePosition(pos, size);

const stackKey = `${player}-${kind}`;
const { stackIndex, stackTotal } =
  unifiedStackMap.get(stackKey) ?? {
    stackIndex: 0,
    stackTotal: 1,
  };

const visualSize = PIECE_VISUAL_SIZE[kind as BasePieceKind] ?? 50;

const stackedPosition = getStackedTokenPosition({
  base: {
    left: base.left as number,
    top: base.top as number,
  },
  pieceSize: visualSize,
  indexInStack: stackIndex,
  totalInStack: stackTotal,
  wheelCenter,
  spacing: 32,
});

      let src = player === "P1" ? pigWhite : pigBlack;

      if (kind === "rooster") {
        src = player === "P1" ? roosterWhite : roosterBlack;
      } else if (kind === "snake") {
        src = player === "P1" ? cobraWhite : cobraBlack;
      }

      const badgeSize = kind === "pig" ? 22 : 14;

      return (
        <div
          key={`${player}-${kind}`}
          onClick={() => {
            if (player === state.turn && !pieceState.inLimbo) {
              setShowNidanaBanner(false);
              onSelectPiece?.(kind);
            }
          }}
          style={{
            ...base,
            left: stackedPosition.left,
top: stackedPosition.top,
            width: visualSize,
            height: visualSize,
           zIndex: isCurrentSelected ? 9000 : 8000 + stackedPosition.zIndex,
            pointerEvents: player === state.turn ? "auto" : "none",
            position: "absolute",
            cursor: player === state.turn ? "pointer" : "default",
            borderRadius: 18,
            boxShadow: isCurrentSelected
              ? "0 0 0 2px rgba(255,255,255,0.18)"
              : "none",
          }}
        >
<img
  src={src}
  alt=""
  onError={(e) => {
    e.currentTarget.remove();
  }}
  className={impactPos === pos ? "pieceHit" : ""}
  style={{
    width: visualSize,
    height: visualSize,
    objectFit: "contain",
    pointerEvents: "none",
    transform: isCurrentSelected
      ? "scale(1.08) translateY(-4px)"
      : "translateY(-1px)",
    filter: isCurrentSelected
      ? "drop-shadow(0 0 8px rgba(255,255,255,0.4))"
      : "none",
  }}
/>

          <div
            style={{
              position: "absolute",
              right: -3,
              bottom: -3,
              minWidth: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              background: "rgba(0,0,0,0.72)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontSize: kind === "pig" ? 13 : 9,
              fontWeight: 800,
              lineHeight: `${badgeSize - 2}px`,
              textAlign: "center",
              padding: "0 3px",
              pointerEvents: "none",
            }}
          >
            {pieceShort(kind)}
          </div>
        </div>
      );
    });
  });

  return (
    <div className={`board ${turnClass} ${beatClass}`}>
      {ghost && <div className="ghostWord">{ghost}</div>}
      {state.emojiEvents?.length ? (
  <div
    style={{
      textAlign: "center",
      fontSize: 26,
      margin: "6px 0 10px",
      minHeight: 32,
    }}
  >
    {state.emojiEvents[state.emojiEvents.length - 1].emoji}
  </div>
) : null}

{true && (
  <div className="nidanaLivingBanner">

    <div className="nidanaLivingIcon">
      👁️
    </div>

    <div className="nidanaLivingTitle">
      {NIDANA_EFFECT_LINES[cajaMagica.current]?.title}
    </div>

    <div className="nidanaLivingBody">
      {NIDANA_EFFECT_LINES[cajaMagica.current]?.body}
    </div>

  </div>
)}

      {/* ===== Ring ===== */}
<div
  className="ringWrap"
  style={{
    position: "absolute",
    left: 512,
    top: 50,

    width: RING_SIZE,
    height: RING_SIZE,

    margin: 0,
    borderRadius: "50%",

    overflow: "visible",
    zIndex: 5000,

    transform: "scale(1.12)",
    transformOrigin: "center center",
  }}
>
  <img
src={budaKarmaER}
onClick={() => {
  setDharmaEmergencyFor(state.turn);

  setBigHeadSchoolBy(state.turn === "P1" ? "white" : "black");

  setTimeout(() => {
    setBigHeadSchoolBy(null);
    setDharmaEmergencyFor(null);
  }, 5000);
}}

onMouseEnter={(e)=>{
e.currentTarget.style.transform="scale(1.12)"
}}

onMouseLeave={(e)=>{
e.currentTarget.style.transform="scale(1)"
}}

style={{
position:"absolute",

left:"-8%",
top:"75%",

width:115,

zIndex:90,

pointerEvents: "auto",
transition:"0.3s",

filter:"drop-shadow(0 0 7px rgba(255,255,255,.95))"
}}
/>
{bigHeadSchoolBy && (
  <BigHeadSchoolOverlay openedBy={bigHeadSchoolBy} />
)}
{onRoll && !dharmaEmergencyFor && (
<button
  type="button"
  className="samsaraDicePortalButton"
  onClick={onRoll}
  title="Roll dice"
  style={{ top: "40%" }}
>
    {USE_LEGACY_PORTAL_DICE_ART ? (
      <img
        src={state.turn === "P1" ? diceWhitePortal : diceBlackPortal}
        alt="Roll dice"
        className="samsaraDicePortalImg"
      />
    ) : USE_CSS_STONE_ICON_FALLBACK ? (
      <div
        className="samsaraDicePortalImg"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6%",
          animation: "none",
        }}
      >
        <StoneDiceIcon color="white" />
        <StoneDiceIcon color="black" />
      </div>
    ) : (
      <img
        src={diceGenesisStonePair}
        alt="Roll dice"
        className="samsaraDicePortalImg"
      />
    )}
  </button>
)}
     {nidanaCoinSrc && (
  <div
    style={{
      position: "absolute",
      left: "-290px",
      top: "160px",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      pointerEvents: "none",
    }}
  >
    <img
    key={`${nidanaCoinSrc}-${nidanaCoinSide}`}
      src={nidanaCoinSrc}
      className={`nidanaCoinImage ${
        nidanaCoinSide === "back" ? "isBack" : ""
      }`}
      style={{
        width: 220,
        height: "auto",
        borderRadius: "50%",
animation: "nidanaReveal 2.6s cubic-bezier(.16,1.25,.32,1) both",
      }}
    />
  </div>
)}
  {Array.from({ length: size }, (_, i) => {
  const cellRealm = realmFromPos(i);
  const isHoveredTarget = hoveredOption?.toPos === i;

  const enemyPlayer = state.turn === "P1" ? "P2" : "P1";

  const enemiesOnCell = ACTIVE_PIECE_KINDS.filter((kind) => {
    const piece = state.pieces[enemyPlayer][kind];
    return !piece.inLimbo && piece.pos === i;
  });

  const isBlockedCell = enemiesOnCell.length >= 2;

  return (
    <button
      key={i}
      type="button"
      disabled={true}
      className={`cellBtn ${
        isHoveredTarget
          ? hoveredOption?.meaning === "IMPACT"
            ? "moveB"
            : hoveredOption?.meaning === "RISK"
            ? "moveAB"
            : "moveA"
          : ""
      } ${flashCell === i ? "cellFlash" : ""} ${
        isBlockedCell ? "blockedCell" : ""
      }`}
      style={ringCellStyle(i, size)}
      onClick={() => {}}
      title={`${REALM_LABEL[cellRealm]}`}
    >
      {i}
              {isHoveredTarget && (
                <>
                  <div className="moveTag">{hoveredOption?.choice}</div>
                  {hoveredOption?.meaning && (
                    <div className="moveMeaning">{hoveredOption.meaning}</div>
                  )}
                </>
              )}
            </button>
          );
        })}

      {moveOptions.length > 0 && onChooseMove && (
          <MoveEmanations
            options={moveOptions}
            player={state.turn}
            trackSize={size}
            selectedPiece={state.selectedPiece[state.turn]}
            onChoose={onChooseMove}
          />
        )}
{(["P1", "P2"] as PlayerId[]).flatMap((player) => {
 const realmOrder = [
  "hungry_ghost",
  "hell",
  "animals",
  "humans",
  "asura",
  "deva",

] as const;

const seen = new Set<number>();

const realmList = realmOrder
  .map((key) => state.realmPieces[player]?.[key])
  .filter((piece) => piece && !piece.inLimbo && piece.unlocked);
  const realmStackCountByPos = new Map<number, number>();

for (const piece of realmList) {
  realmStackCountByPos.set(
    piece.pos,
    (realmStackCountByPos.get(piece.pos) ?? 0) + 1
  );
}

const realmStackIndexByPos = new Map<number, number>();
  return realmList.map((piece) => {
    if (!piece || piece.inLimbo || !piece.unlocked) {
      return null;
    }

const base = piecePosition(piece.pos, size);

const stackKey = `${player}-${piece.kind}`;
const { stackIndex, stackTotal } =
  unifiedStackMap.get(stackKey) ?? {
    stackIndex: 0,
    stackTotal: 1,
  };

const stackedPosition = getStackedTokenPosition({
  base: {
    left: base.left as number,
    top: base.top as number,
  },
  pieceSize: 48,
  indexInStack: stackIndex,
  totalInStack: stackTotal,
  wheelCenter,
  spacing: 34,
});


    return (
      <div
        key={piece.id}
        onClick={() => {
          if (player === state.turn) {
              setShowNidanaBanner(false);
            onSelectPiece?.(piece.kind);
          }
        }}
        className={`realmPieceToken realmPiece-${piece.kind} ${
          player === "P1" ? "realmPieceP1" : "realmPieceP2"
        }`}
style={{
  left: stackedPosition.left,
  top: stackedPosition.top,
  width: 48,
  height: 48,
  borderRadius: "50%",
  position: "absolute",
  zIndex: 9999 + stackedPosition.zIndex,
  pointerEvents: player === state.turn ? "auto" : "none",
  cursor: player === state.turn ? "pointer" : "default",
  /* glow: dejar que overlays.css maneje box-shadow y border */
}}
        title={`${player} ${piece.kind}`}
           >
      <img
  src={
    REALM_TOKEN_MAP[piece.kind as keyof typeof REALM_TOKEN_MAP]?.[player] ??
    brunoP1
  }
  alt={`${piece.kind} token`}
  className="realmPieceTokenImg"
/>
      </div>
    );
  });
})}
        {renderedPieces}

  
      </div>

      <ExplainModal
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        player={explainPlayer}
        last={
          (() => {
            const hist = state.behavior?.history?.[explainPlayer] ?? [];
            return hist[hist.length - 1] ?? null;
          })()
        }
      />
    </div>
  );
}