import React from "react";
import type { PlayerId } from "../game/types";

type Props = {
  turn: PlayerId; // "P1" | "P2"
  phase: "idle" | "rolled";
  rollA: number | null;
  rollB: number | null;
  level: number;
  onRoll: () => void;
  onReset: () => void;
  showVestigium?: boolean;
};

function DieBox({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="dieBox">
      <div className="dieLabel">{label}</div>
      <div className="dieValue">{value ?? "?"}</div>
    </div>
  );
}

export function TurnDock({
  turn,
  phase,
  rollA,
  rollB,
  level,
  onRoll,
  onReset,
  showVestigium = false,
}: Props) {
  const canRoll = phase !== "rolled";
  const leftActive = turn === "P2";
  const rightActive = turn === "P1";
  const sum = rollA !== null && rollB !== null ? rollA + rollB : null;

  return (
    <div className="turnDock">
      {showVestigium && <div className="vestigiumStamp">VESTIGIUM TUUM</div>}

      {/* Black */}
      <div className={`dockSide p2 ${leftActive ? "active" : "inactive"}`}>
        <div className="dockHeader">
          <span className="dockTitle">⚫ Black</span>
        </div>

        <div className="dockDice">
          <DieBox label="A" value={leftActive ? rollA : null} />
          <DieBox label="B" value={leftActive ? rollB : null} />
        </div>

        <div className="dockMeta">
          <span>
            Level: <b>{level}</b>
          </span>
          <span className="dockHint">{leftActive ? "Your turn" : "Waiting…"}</span>
        </div>
      </div>

      {/* Center */}
      <div className="dockCenter">
        <button
          className="dockBtn"
          type="button"
          onClick={onRoll}
          disabled={!canRoll}
        >
          Roll the dice
        </button>

        <button className="dockBtn ghost" type="button" onClick={onReset}>
          Reset
        </button>

        <div className="dockRead">
  {rollA === null || rollB === null ? (
    <span>🎲 Roll to generate your moves</span>
  ) : (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        fontWeight: 600,
      }}
    >
      <div>
        Choose your move:
      </div>

      <div style={{ opacity: 0.9 }}>
        A = {rollA} · B = {rollB}
        {sum !== null && (
          <>
            {" "}
            · <b className="sum">A+B = {sum}</b>
          </>
        )}
      </div>
    </div>
  )}
</div>
      </div>

      {/* White */}
      <div className={`dockSide p1 ${rightActive ? "active" : "inactive"}`}>
        <div className="dockHeader">
          <span className="dockTitle">⚪ White</span>
        </div>

        <div className="dockDice">
          <DieBox label="A" value={rightActive ? rollA : null} />
          <DieBox label="B" value={rightActive ? rollB : null} />
        </div>

        <div className="dockMeta">
          <span>
            Level: <b>{level}</b>
          </span>
          <span className="dockHint">{rightActive ? "Your turn" : "Waiting…"}</span>
        </div>
      </div>
    </div>
  );
}