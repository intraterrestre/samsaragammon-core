import React, { useEffect, useRef, useState } from "react";
import type { GameState, MoveOption, PieceKind, PlayerId } from "./types";
import { previewMove } from "./rules/preview";
import {
  cellStyle as ringCellStyle,
  RING_SIZE,
  piecePosition,
} from "../UI/geometry";
import { realmFromPos, REALM_LABEL, pickLine } from "../UI/realm";
import { ExplainModal } from "../UI/ExplainModal";
import pawnWhite from "../assets/pieces/pawn_white.png";
import pawnBlack from "../assets/pieces/pawn_black.png";
import captureWhite from "../assets/sounds/capture_white.mp3";
import captureBlack from "../assets/sounds/capture_black.mp3";
import moveSound from "../assets/sounds/move.mp3";

type Props = {
  state: GameState;
  onSelectPiece?: (piece: PieceKind) => void;
  hoveredOption?: MoveOption | null;
};

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

const playerLabel = (p: PlayerId) => (p === "P1" ? "⚪ White" : "⚫ Black");
const PIECE_KINDS: PieceKind[] = ["pig", "snake", "rooster"];

const pieceLabel = (k: PieceKind) => {
  if (k === "pig") return "Pig";
  if (k === "snake") return "Snake";
  return "Rooster";
};

const pieceShort = (k: PieceKind) => {
  if (k === "pig") return "P";
  if (k === "snake") return "S";
  return "R";
};

const pieceOffset = (kind: PieceKind) => {
  switch (kind) {
    case "pig":
      return { x: -8, y: -8 };
    case "snake":
      return { x: 0, y: 8 };
    case "rooster":
      return { x: 8, y: -8 };
  }
};
export function Board({ state, onSelectPiece, hoveredOption }: Props) {
const captureAudioWhite = useRef<HTMLAudioElement | null>(null);
const captureAudioBlack = useRef<HTMLAudioElement | null>(null);
const moveAudio = useRef<HTMLAudioElement | null>(null);

// 🔊 INICIALIZAR AUDIOS
useEffect(() => {
  captureAudioWhite.current = new Audio(captureWhite);
  captureAudioBlack.current = new Audio(captureBlack);
  moveAudio.current = new Audio(moveSound);
  if (moveAudio.current) moveAudio.current.volume = 0.03;
  if (captureAudioWhite.current) captureAudioWhite.current.volume = 0.35;
  if (captureAudioBlack.current) captureAudioBlack.current.volume = 0.35;
}, []);

// 🔊 DISPARAR SONIDO (CAPTURA)
useEffect(() => {
  if (!state.lastMove?.didCapture) return;

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
}, [state.lastMove]);

// 👇 continúa tu código
  const size = state.trackSize;
  const me = state.turn;
  const other = otherPlayer(me);
  const rolls = state.phase === "rolled" ? state.rollOptions : null;
  const activePiece = state.selectedPiece[me];
  const activePos = state.pieces[me][activePiece].pos;
  const enemyPositions = PIECE_KINDS.map((k) => state.pieces[other][k].pos);

  // ===== Explain modal state =====
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainPlayer, setExplainPlayer] = useState<PlayerId>("P1");

  const [impactPos, setImpactPos] = useState<number | null>(null);
  const [flashCell, setFlashCell] = useState<number | null>(null);

  const [ghost, setGhost] = useState<string | null>(null);
  const ghostTimer = useRef<number | null>(null);

  const [beat, setBeat] = useState(false);
  const beatTimer = useRef<number | null>(null);

  // ===== Move previews sobre la ficha activa =====
  const prevA =
    rolls !== null ? previewMove(activePos, rolls[0], state.trackSize) : null;

  const prevB =
    rolls !== null ? previewMove(activePos, rolls[1], state.trackSize) : null;

  const capA = prevA !== null && enemyPositions.includes(prevA);
  const capB = prevB !== null && enemyPositions.includes(prevB);

  const allowSum = state.level >= 3 && rolls !== null && !capA && !capB;
  const sumRoll = allowSum && rolls ? rolls[0] + rolls[1] : null;

  const prevC =
    allowSum && sumRoll !== null
      ? previewMove(activePos, sumRoll, state.trackSize)
      : null;

  const isSameAB = prevA !== null && prevB !== null && prevA === prevB;

  // ===== Snapshot + animation logic (basado en lastMove) =====
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

  return (
    <div className={`board ${turnClass} ${beatClass}`}>
      {ghost && <div className="ghostWord">{ghost}</div>}

      {/* ===== Active piece selector ===== */}
      <div
        style={{
          width: "min(560px, 92vw)",
          margin: "8px auto 8px",
          padding: "8px 10px",
          borderRadius: 12,
          background: "rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {playerLabel(me)} moving:{" "}
          <span style={{ opacity: 0.9 }}>{pieceLabel(activePiece)}</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {PIECE_KINDS.map((kind) => {
            const selected = state.selectedPiece[me] === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => onSelectPiece?.(kind)}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 10,
                  border: selected
                    ? "1px solid rgba(255,255,255,0.45)"
                    : "1px solid rgba(255,255,255,0.14)",
                  background: selected
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(0,0,0,0.18)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: selected ? 800 : 600,
                  fontSize: 12,
                }}
              >
                {pieceLabel(kind)}
              </button>
            );
          })}
        </div>
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
        {Array.from({ length: size }, (_, i) => {
          const cellRealm = realmFromPos(i);
          const isHoveredTarget = hoveredOption?.toPos === i;

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
              } ${flashCell === i ? "cellFlash" : ""}`}
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

        {/* ===== Render all 6 pieces ===== */}
        {(["P1", "P2"] as PlayerId[]).flatMap((player) =>
          PIECE_KINDS.map((kind) => {
            const pos = state.pieces[player][kind].pos;
            const offset = pieceOffset(kind);
            const isCurrentSelected =
              player === state.turn && state.selectedPiece[player] === kind;

            const base = piecePosition(pos, size);
            const src = player === "P1" ? pawnWhite : pawnBlack;

            return (
              <div
                key={`${player}-${kind}`}
                style={{
                  ...base,
                  left: (base.left as number) + offset.x,
                  top: (base.top as number) + offset.y,
                  width: 36,
                  height: 36,
                  zIndex: isCurrentSelected ? 45 : 40,
                  pointerEvents: "none",
                  position: "absolute",
                }}
              >
                <img
                  src={src}
                  alt={`${player}-${kind}`}
                  className={impactPos === pos ? "pieceHit" : ""}
                  style={{
                    width: 36,
                    height: 36,
                    objectFit: "contain",
                    pointerEvents: "none",
                    transform: isCurrentSelected
                      ? "translateZ(0) translateY(-3px)"
                      : "translateZ(0) translateY(-1px)",
                    filter: isCurrentSelected
                      ? "drop-shadow(0 0 6px rgba(255,255,255,0.35))"
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
                  }}
                >
                  {pieceShort(kind)}
                </div>
              </div>
            );
          })
        )}
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