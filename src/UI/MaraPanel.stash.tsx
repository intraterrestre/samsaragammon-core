import React from "react";

import pigWhite from "../assets/pieces/pig_white.webp";
import pigBlack from "../assets/pieces/pig_black.webp";

import cobraWhite from "../assets/pieces/cobra_white.webp";
import cobraBlack from "../assets/pieces/cobra_black.webp";

import roosterWhite from "../assets/pieces/rooster_white.webp";
import roosterBlack from "../assets/pieces/rooster_black.webp";
const LEFT_EYE = {
  x: 140,
  y: 242,
  rotate: -11,
};

const RIGHT_EYE = {
  x: 190,
  y: 238,
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
        width: 15,
        height: 20,
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
            width: 35,
            height: 35,
            objectFit: "contain",
    filter: `

  drop-shadow(0 0 6px rgba(255,255,255,1))

  drop-shadow(0 0 12px rgba(255,255,255,.9))

  drop-shadow(0 0 24px rgba(255,255,255,.8))

  drop-shadow(0 0 40px rgba(255,255,255,.6))

`,
          }}
        />
      ) : (
        <div
          style={{
            width: 16,
            height: 16,
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

        gap: 7,

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