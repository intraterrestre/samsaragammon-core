import React from "react";

import pigWhite from "../assets/pieces/pig_white.png";
import pigBlack from "../assets/pieces/pig_black.png";

import cobraWhite from "../assets/pieces/cobra_white.png";
import cobraBlack from "../assets/pieces/cobra_black.png";

import roosterWhite from "../assets/pieces/rooster_white.png";
import roosterBlack from "../assets/pieces/rooster_black.png";
const LEFT_EYE = {
  x: 118,
  y: 182,
  rotate: -11,
};

const RIGHT_EYE = {
  x: 164,
  y: 178,
  rotate: -11,
};

const PIECES = ["pig", "snake", "rooster"] as const;

function EyeCell({ piece }: { piece?: any }) {

 let image: string | null = null;

if (piece?.player === "P1") {
  if (piece.kind === "pig") image = pigWhite;
  if (piece.kind === "snake") image = cobraWhite;
  if (piece.kind === "rooster") image = roosterWhite;
}

if (piece?.player === "P2") {
  if (piece.kind === "pig") image = pigBlack;
  if (piece.kind === "snake") image = cobraBlack;
  if (piece.kind === "rooster") image = roosterBlack;
}
  return (
    <div
      style={{
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {image ? (
        <img
          src={image}
          alt={piece?.kind ?? ""}
          style={{
            width: 28,
            height: 28,
            objectFit: "contain",
          }}
        />
      ) : (
        <div
          style={{
            width: 27,
            height: 27,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,.25)",
            background: "rgba(0,0,0,.25)",
          }}
        />
      )}
    </div>
  );
}

type EyeRailProps = {

  x: number;

  y: number;

  rotate?: number;

  cells: (string | null)[];

};

function EyeRail({ x, y, rotate = 0, cells }: EyeRailProps) {

  return (

    <div

      style={{

        position: "absolute",

        left: x,

        top: y,

        zIndex: 99999,

        display: "flex",

        flexDirection: "column",

        gap: 4,

        transform: `rotate(${rotate}deg)`,

        transformOrigin: "top center",

      }}

    >

      {cells.map((piece, i) => (

        <EyeCell key={i} piece={piece ?? undefined} />

      ))}

    </div>

  );

}

function buildMaraCells(state: any, player: "P1" | "P2") {

 const cells: any[] = Array(6).fill(null);

  for (const kind of PIECES) {

    const piece = state.pieces[player][kind];

    if (!piece?.inLimbo || piece.maraLevel == null) continue;

    const level = Math.max(1, Math.min(6, piece.maraLevel));

    const index = 6 - level;

  cells[index] = { player, kind };

  }

  return cells;

}

export function MaraPanel({ state }: { state: any }) {

  const leftCells = buildMaraCells(state, "P1");

  const rightCells = buildMaraCells(state, "P2");

  return (

    <>

      <EyeRail

        x={LEFT_EYE.x}

        y={LEFT_EYE.y}

        rotate={LEFT_EYE.rotate}

        cells={leftCells}

      />

      <EyeRail

        x={RIGHT_EYE.x}

        y={RIGHT_EYE.y}

        rotate={RIGHT_EYE.rotate}

        cells={rightCells}

      />

    </>

  );

}