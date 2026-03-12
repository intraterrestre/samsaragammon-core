// src/game/Board.tsx
// src/game/Board.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, PlayerId } from "./types";
import { previewMove } from "./rules/preview";

import { cellStyle as ringCellStyle, RING_SIZE, piecePosition } from "../UI/geometry";
import { realmFromPos, REALM_LABEL, pickLine } from "../UI/realm";
import { ExplainModal } from "../UI/ExplainModal";

type Props = {
  state: GameState;
  onChooseRoll?: (value: number) => void;
};

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

type Choice = "A" | "B" | "AB" | "ECO" | null;

export function Board({ state, onChooseRoll }: Props) {
  const size = state.trackSize;
  const other = otherPlayer(state.turn);
  const rolls = state.phase === "rolled" ? state.rollOptions : null;

  // ===== Explain modal state (ONLY ONCE) =====
  const [explainOpen, setExplainOpen] = useState(false);
  const [explainPlayer, setExplainPlayer] = useState<PlayerId>("P1");

  // =========================
  // Local UI state
  // =========================
  const [pending, setPending] = useState(false);
  const pendingTimer = useRef<number | null>(null);

  const [ghost, setGhost] = useState<string | null>(null);
  const ghostTimer = useRef<number | null>(null);

  const lastChoiceRef = useRef<Choice>(null);

  const [beat, setBeat] = useState(false);
  const beatTimer = useRef<number | null>(null);

  const [radialMessage, setRadialMessage] = useState<string | null>(null);
  const radialTimer = useRef<number | null>(null);

  // =========================
  // Move previews
  // =========================
  const prevA =
    rolls !== null ? previewMove(state.pieces[state.turn].pos, rolls[0], state.trackSize) : null;

  const prevB =
    rolls !== null ? previewMove(state.pieces[state.turn].pos, rolls[1], state.trackSize) : null;

  const capA = prevA !== null && state.pieces[other].pos === prevA;
  const capB = prevB !== null && state.pieces[other].pos === prevB;

  const allowSum = state.level >= 3 && rolls !== null && !capA && !capB;
  const sumRoll = allowSum && rolls ? rolls[0] + rolls[1] : null;

  const prevC =
    allowSum && sumRoll !== null
      ? previewMove(state.pieces[state.turn].pos, sumRoll, state.trackSize)
      : null;

  const isSameAB = prevA !== null && prevB !== null && prevA === prevB;

  const labelForCell = (i: number) => {
    if (prevC === i) return "A+B";
    if (isSameAB && i === prevA) return "ECO";
    if (prevA === i) return "A";
    if (prevB === i) return "B";
    return "";
  };

  const choiceForCell = (i: number): Choice => {
    if (!rolls || !onChooseRoll) return null;
    if (prevC === i && sumRoll !== null) return "AB";
    if (isSameAB && prevA === i) return "ECO";
    if (prevA === i) return "A";
    if (prevB === i) return "B";
    return null;
  };

  const rollForChoice = (ch: Choice): number | null => {
    if (!rolls) return null;
    if (ch === "AB" && sumRoll !== null) return sumRoll;
    if (ch === "ECO") return rolls[0];
    if (ch === "A") return rolls[0];
    if (ch === "B") return rolls[1];
    return null;
  };

  // =========================
  // Snapshot + animation logic
  // =========================
  const lastSnapshot = useRef({
    p1: state.pieces.P1.pos,
    p2: state.pieces.P2.pos,
    c1: state.captures.P1,
    c2: state.captures.P2,
    turn: state.turn,
  });

  useEffect(() => {
    const prev = lastSnapshot.current;
    const now = {
      p1: state.pieces.P1.pos,
      p2: state.pieces.P2.pos,
      c1: state.captures.P1,
      c2: state.captures.P2,
      turn: state.turn,
    };

    const moved = prev.p1 !== now.p1 || prev.p2 !== now.p2;
    const turnChanged = prev.turn !== now.turn;

    if (moved || turnChanged) {
      setBeat(true);
      if (beatTimer.current) window.clearTimeout(beatTimer.current);
      beatTimer.current = window.setTimeout(() => setBeat(false), 650);
    }

    if (moved) {
      const mover: PlayerId = prev.p1 !== now.p1 ? "P1" : prev.p2 !== now.p2 ? "P2" : state.turn;

      const oldPos = mover === "P1" ? prev.p1 : prev.p2;
      const newPos = mover === "P1" ? now.p1 : now.p2;

      const oldRealm = realmFromPos(oldPos);
      const newRealm = realmFromPos(newPos);

      setGhost(oldRealm !== newRealm ? pickLine(newRealm) : "flow");

      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
      ghostTimer.current = window.setTimeout(() => setGhost(null), 1200);
    }

    lastSnapshot.current = now;
  }, [state.pieces.P1.pos, state.pieces.P2.pos, state.turn, state.captures.P1, state.captures.P2]);

  useEffect(() => {
    return () => {
      if (pendingTimer.current) window.clearTimeout(pendingTimer.current);
      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
      if (beatTimer.current) window.clearTimeout(beatTimer.current);
      if (radialTimer.current) window.clearTimeout(radialTimer.current);
    };
  }, []);

  const turnClass = state.turn === "P1" ? "turnP1" : "turnP2";
  const beatClass = beat ? "beat" : "";

  // =========================
  // Render
  // =========================
  return (
    <div className={`board ${turnClass} ${beatClass}`}>
      {ghost && <div className="ghostWord">{ghost}</div>}

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
          const life = state.behavior?.lifeStabilized?.[p] ? "stabilized" : "forming";

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
                <b>{p}</b> Pattern: {pat} | Streak: {streak} | Life: {life}
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

      {/* ✅ Explain Modal */}
      <ExplainModal
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        player={explainPlayer}
        behavior={state.behavior}
      />

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
          const p1Here = state.pieces.P1.pos === i;
          const p2Here = state.pieces.P2.pos === i;

          const label = labelForCell(i);
          const choice = choiceForCell(i);
          const rollValue = choice ? rollForChoice(choice) : null;

          const clickable = rollValue !== null && !pending;
          const cellRealm = realmFromPos(i);

          return (
            <button
              key={i}
              type="button"
              disabled={!clickable}
              className="cellBtn"
              style={ringCellStyle(i, size)}
              onClick={() => {
                if (!clickable || rollValue === null || !onChooseRoll) return;

                lastChoiceRef.current = choice;

                setPending(true);
                if (pendingTimer.current) window.clearTimeout(pendingTimer.current);

                pendingTimer.current = window.setTimeout(() => {
                  setPending(false);
                  onChooseRoll(rollValue);
                }, 260);
              }}
              title={`${REALM_LABEL[cellRealm]}`}
            >
              {i}
       
              {label && <div className="moveTag">{label}</div>}
            </button>
          );
        })}
        {/* P1 */}
<div
  className={`pieceTag p1Tag realm-${realmFromPos(state.pieces.P1.pos)}`}
  style={piecePosition(state.pieces.P1.pos, size)}
>
  P1
</div>

{/* P2 */}
<div
  className={`pieceTag p2Tag realm-${realmFromPos(state.pieces.P2.pos)}`}
  style={piecePosition(state.pieces.P2.pos, size)}
>
  P2
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
    </div>
  );
}