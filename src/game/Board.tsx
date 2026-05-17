import React, { useEffect, useRef, useState } from "react";
import type { GameState, MoveOption, PieceKind, PlayerId } from "./types";

import {
  cellStyle as ringCellStyle,
  RING_SIZE,
  piecePosition,
} from "../UI/geometry";
import { realmFromPos, REALM_LABEL, pickLine } from "../UI/realm";
import { ExplainModal } from "../UI/ExplainModal";
import { MoveEmanations } from "../UI/MoveEmanations";

// 🔥 FICHAS
import pigWhite from "../assets/pieces/pig_white.png";
import pigBlack from "../assets/pieces/pig_black.png";
import roosterWhite from "../assets/pieces/rooster_white.png";
import roosterBlack from "../assets/pieces/rooster_black.png";
import cobraWhite from "../assets/pieces/cobra_white.png";
import cobraBlack from "../assets/pieces/cobra_black.png";

// 🔊 SONIDOS
import captureWhite from "../assets/sounds/capture_white.mp3";
import captureBlack from "../assets/sounds/capture_black.mp3";
import moveSound from "../assets/sounds/move.mp3";

import brunoP1 from "../assets/tokens/bruno_P1.png";
import brunoP2 from "../assets/tokens/bruno_P2.png";

import margotP1 from "../assets/tokens/margot_P1.png";
import margotP2 from "../assets/tokens/margot_P2.png";

import marinoP1 from "../assets/tokens/marino_P1.png";
import marinoP2 from "../assets/tokens/marino_P2.png";

import oriolP1 from "../assets/tokens/oriol_P1.png";
import oriolP2 from "../assets/tokens/oriol_P2.png";

import rufusP1 from "../assets/tokens/rufus_P1.png";
import rufusP2 from "../assets/tokens/rufus_P2.png";

import whitmanP1 from "../assets/tokens/whitman_P1.png";
import whitmanP2 from "../assets/tokens/whitman_P2.png";

type Props = {
  state: GameState;
  onSelectPiece?: (piece: string) => void;
  hoveredOption?: MoveOption | null;
  moveOptions?: MoveOption[];
  onChooseMove?: (option: MoveOption, allOptions: MoveOption[]) => void;
  onSendEmoji?: (emoji: string) => void;
  nidanaCoinSrc?: string | null;
  nidanaCoinSide?: "front" | "back";
};
const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

const playerLabel = (p: PlayerId) => (p === "P1" ? "⚪ White" : "⚫ Black");
const PIECE_KINDS: PieceKind[] = ["pig", "snake", "rooster"];
const EMOJIS = ["😴", "🔥", "🐷", "🐍", "⚔️", "🧘", "😂", "😡"];
const pieceShort = (k: PieceKind) => {
  if (k === "pig") return "P";
  if (k === "snake") return "S";
  return "R";
};
const REALM_TOKEN_MAP = {
  origin: { P1: brunoP1, P2: brunoP2 },
  hell: { P1: margotP1, P2: margotP2 },
  animal: { P1: oriolP1, P2: oriolP2 },
  human: { P1: marinoP1, P2: marinoP2 },
  titan: { P1: rufusP1, P2: rufusP2 },
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

export function Board({
  state,
  onSelectPiece,
  hoveredOption,
  moveOptions,
  onChooseMove,
  onSendEmoji,
  nidanaCoinSrc,
  nidanaCoinSide,
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

const activePos = activeBasePiece
  ? state.pieces[me][activeBasePiece].pos
  : activeRealmPiece?.pos ?? null;

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

  const piecesByPos: Record<number, { player: PlayerId; kind: PieceKind }[]> =
    {};

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
   PIECE_KINDS.forEach((kind) => {
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
    return PIECE_KINDS.map((kind) => {
      const pieceState = state.pieces[player][kind];
      if (pieceState.inLimbo) return null;

      const pos = pieceState.pos;

      const isCurrentSelected =
        player === state.turn && state.selectedPiece[player] === kind;

      const base = piecePosition(pos, size);
      const stack = piecesByPos[pos] ?? [];
      const stackIndex = stack.findIndex(
        (p) => p.player === player && p.kind === kind
      );
      const offset = stackOffset(stackIndex, stack.length);

      let src = player === "P1" ? pigWhite : pigBlack;

      if (kind === "rooster") {
        src = player === "P1" ? roosterWhite : roosterBlack;
      } else if (kind === "snake") {
        src = player === "P1" ? cobraWhite : cobraBlack;
      }

      return (
        <div
          key={`${player}-${kind}`}
          onClick={() => {
            if (player === state.turn && !pieceState.inLimbo) {
              onSelectPiece?.(kind);
            }
          }}
          style={{
            ...base,
            left: (base.left as number) + offset.x,
            top: (base.top as number) + offset.y,
            width: 36,
            height: 36,
            zIndex: isCurrentSelected ? 45 : 40,
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
    width: 36,
    height: 36,
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
              minWidth: 14,
              height: 14,
              borderRadius: 7,
              background: "rgba(0,0,0,0.72)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "white",
              fontSize: 9,
              fontWeight: 800,
              lineHeight: "12px",
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

      {/* ===== Emoji bar ===== */}
      <div
        style={{
          width: "min(560px, 92vw)",
          margin: "8px auto 10px",
          display: "flex",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              const now = Date.now();
              if (now - lastEmojiAt < 1800) return;
              setLastEmojiAt(now);
              onSendEmoji?.(emoji);
            }}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.16)",
              background: "rgba(0,0,0,0.16)",
              color: "white",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* ===== Behavior / Patterns HUD ===== */}
      <div
        style={{
          width: "min(560px, 92vw)",
          margin: "10px auto 8px",
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontSize: 13,
          display: "grid",
          gap: 8,
        }}
      >
        {(["P1", "P2"] as PlayerId[]).map((p) => {
          const pat = state.behavior?.stablePattern?.[p] ?? "—";
          const streak = state.behavior?.stableStreak?.[p] ?? 0;
          const life = state.behavior?.lifeStabilized?.[p]
            ? "stabilized"
            : "forming";

          return (
            <div
              key={p}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div>
                <b>{playerLabel(p)}</b> Pattern: {pat} | Streak: {streak} | Life:{" "}
                {life}
              </div>

              <button
                type="button"
                onClick={() => {
                  setExplainPlayer(p);
                  setExplainOpen(true);
                }}
                style={{
                  height: 32,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(0,0,0,0.22)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Explain
              </button>
            </div>
          );
        })}
      </div>

      {/* ===== Ring ===== */}
{state.activeNidanaEffect && (
  <div className="nidanaLivingBanner">
    <div className="nidanaLivingTitle">
      {state.activeNidanaEffect === "CLARITY" && "🔔 CLARITY ACTIVE"}
      {state.activeNidanaEffect === "DISTORTION" && "🫠 DISTORTION ACTIVE"}
      {state.activeNidanaEffect === "TENSION" && "⚔️ TENSION ACTIVE"}
    </div>

    <div className="nidanaLivingBody">
      {state.activeNidanaEffect === "CLARITY" && "PROGRESS gets a bonus."}
      {state.activeNidanaEffect === "DISTORTION" && "RISK may punish you."}
      {state.activeNidanaEffect === "TENSION" &&
        "IMPACT is rewarded. Everything else costs."}
    </div>
  </div>
)}

      <div
        className="ringWrap"
        style={{
          position: "relative",
          width: RING_SIZE,
          height: RING_SIZE,
          margin: "20px auto",
          borderRadius: "50%",
        }}
      >
     {nidanaCoinSrc && (
  <div
    style={{
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      pointerEvents: "none",
    }}
  >
    <img
      src={nidanaCoinSrc}
      className={`nidanaCoinImage ${
        nidanaCoinSide === "back" ? "isBack" : ""
      }`}
      style={{
        width: Math.min(RING_SIZE * 0.55, 320),
        height: "auto",
        borderRadius: "50%",
        boxShadow:
          "0 0 50px rgba(0,0,0,0.5), 0 0 30px rgba(255,220,120,0.25)",
      }}
    />
  </div>
)}
  {Array.from({ length: size }, (_, i) => {
  const cellRealm = realmFromPos(i);
  const isHoveredTarget = hoveredOption?.toPos === i;

  const enemyPlayer = state.turn === "P1" ? "P2" : "P1";

  const enemiesOnCell = PIECE_KINDS.filter((kind) => {
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

       
 {state.phase === "rolled" && moveOptions.length > 0 && onChooseMove && (
          <MoveEmanations
            options={moveOptions}
            player={state.turn}
            trackSize={size}
            selectedPiece={state.selectedPiece[state.turn]}
            onChoose={onChooseMove}
          />
        )}
{(["P1", "P2"] as PlayerId[]).flatMap((player) => {
  const realmList = Object.values(state.realmPieces[player] ?? {});

  return realmList.map((piece) => {
    if (!piece || piece.inLimbo || !piece.unlocked) {
      return null;
    }

    const base = piecePosition(piece.pos, size);

    return (
      <div
        key={piece.id}
        onClick={() => {
          if (player === state.turn) {
            onSelectPiece?.(piece.kind);
          }
        }}
        className={`realmPieceToken realmPiece-${piece.kind} ${
          player === "P1" ? "realmPieceP1" : "realmPieceP2"
        }`}
      style={{
  ...base,
  width: 48,
  height: 48,

  border:
player==="P1"
 ? "3px solid #fff"
 : "3px solid #000",

  borderRadius: "50%",

 boxShadow:
player==="P1"
? "0 0 0 2px gold,0 0 14px white"
: "0 0 0 2px #500,0 0 14px black",

  zIndex: 38,
  position: "absolute",
  pointerEvents: player === state.turn ? "auto" : "none",
  cursor: player === state.turn ? "pointer" : "default",
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