import { useEffect, useRef, useState } from "react";
import type { PlayerId } from "../game/types";
import { Die } from "./Die";

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

  // Rolling animation state
  const [rolling, setRolling] = useState(false);
  const prevPhase = useRef(phase);

  useEffect(() => {
    // When phase changes from idle → rolled, trigger animation
    if (prevPhase.current === "idle" && phase === "rolled") {
      setRolling(true);
      setTimeout(() => setRolling(false), 800);
    }
    prevPhase.current = phase;
  }, [phase]);

  const handleRoll = () => {
    setRolling(true);
    onRoll();
    setTimeout(() => setRolling(false), 800);
  };

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
            gap: 10,
            justifyContent: "center",
            opacity: leftActive ? 1 : 0.35,
          }}
        >
          <Die value={rollA} rolling={rolling && leftActive} color="black" />
          <Die value={rollB} rolling={rolling && leftActive} color="black" />
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
        {canRoll && (
          <button
            className="dockBtn"
            type="button"
            onClick={handleRoll}
          >
            Roll
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
            gap: 10,
            justifyContent: "center",
            opacity: rightActive ? 1 : 0.35,
          }}
        >
          <Die value={rollA} rolling={rolling && rightActive} color="white" />
          <Die value={rollB} rolling={rolling && rightActive} color="white" />
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
