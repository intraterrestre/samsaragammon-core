import React from "react";
import type { PlayerId } from "../game/types";

type Props = {
  turn: PlayerId;
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
    <div
      className="dieBox"
      style={{
        minWidth: 48,
        padding: "6px 8px",
        borderRadius: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        textAlign: "center",
      }}
    >
      <div
        className="dieLabel"
        style={{
          fontSize: 11,
          opacity: 0.7,
          marginBottom: 2,
          letterSpacing: 0.4,
        }}
      >
        {label}
      </div>

      <div
        className="dieValue"
        style={{
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.1,
        }}
      >
        {value !== null ? value : "–"}
      </div>
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

  const centerMessage =
    rollA === null || rollB === null
      ? ""
      : "Pig · Snake · Rooster — choose your path";

  return (
    <div className="turnDock">
      {showVestigium && <div className="vestigiumStamp">VESTIGIUM TUUM</div>}

      {/* Black */}
      <div className={`dockSide p2 ${leftActive ? "active" : "inactive"}`}>
        <div className="dockHeader">
          <span className="dockTitle">Black</span>
        </div>

        <div
          className="dockDice"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            opacity: leftActive ? 1 : 0.45,
          }}
        >
          <DieBox label="A" value={rollA} />
          <DieBox label="B" value={rollB} />
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
       {false && (
  <button
    className="dockBtn"
    type="button"
    onClick={onRoll}
    disabled={!canRoll}
  >
    Roll the dice
  </button>
)}

        <button className="dockBtn ghost" type="button" onClick={onReset}>
          Reset
        </button>

        <div className="dockRead">
          <span>{centerMessage}</span>
        </div>
      </div>

      {/* White */}
      <div className={`dockSide p1 ${rightActive ? "active" : "inactive"}`}>
        <div className="dockHeader">
          <span className="dockTitle">White</span>
        </div>

        <div
          className="dockDice"
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            opacity: rightActive ? 1 : 0.45,
          }}
        >
          <DieBox label="A" value={rollA} />
          <DieBox label="B" value={rollB} />
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