import React from "react";

import pigWhite from "../assets/pieces/pig_white.png";
import pigBlack from "../assets/pieces/pig_black.png";

import cobraWhite from "../assets/pieces/cobra_white.png";
import cobraBlack from "../assets/pieces/cobra_black.png";

import roosterWhite from "../assets/pieces/rooster_white.png";
import roosterBlack from "../assets/pieces/rooster_black.png";

// v21 (10 agosto 2026) — REALM_TOKEN_MAP exportado desde Board.tsx para
// que un Avatar capturado también pueda mostrarse aquí (antes solo se
// sabían dibujar Venenos — el estado ya movía bien al Avatar por Mara,
// pero visualmente no aparecía nunca).
import { REALM_TOKEN_MAP } from "../game/Board";

const LEFT_EYE = {
  x: 136,
  y: 200,
  rotate: -11,
};

const RIGHT_EYE = {
  x: 182,
  y: 196,
  rotate: -11,
};

const PIECES = ["pig", "snake", "rooster"] as const;
const REALM_KINDS = [
  "hungry_ghost",
  "hell",
  "animals",
  "humans",
  "asura",
  "deva",
] as const;

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

// v21 — un Avatar capturado usa la misma imagen de token que ya se ve
// en el tablero (REALM_TOKEN_MAP), en vez de quedar sin dibujar.
if (piece?.player && (REALM_TOKEN_MAP as any)[piece.kind]) {
  image = (REALM_TOKEN_MAP as any)[piece.kind][piece.player] ?? image;
}

  // Antes, cuando no había ficha en este nivel de Mara, se dibujaba un
  // cuadrito con borde/fondo — eso es lo que hacía visible "el circuito
  // de Mara" (12 cuadritos, 6 por ojo) incluso sin fichas comidas. El
  // usuario pidió que no se vean esos cuadros: que solo aparezca la
  // ficha comida caminando sobre el bastidor. El div sigue existiendo
  // (mismo tamaño) para mantener el espaciado de los 6 niveles, pero
  // ahora es invisible cuando no hay ficha.
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
      {image && (
        <img
          src={image}
          alt={piece?.kind ?? ""}
          style={{
            width: 28,
            height: 28,
            objectFit: "contain",
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

  // v21 — mismo criterio, ahora también para Avatares (state.realmPieces).
  // Antes de esto, un Avatar capturado sí ciclaba por Mara en el estado
  // real (confirmado con pruebas), pero nunca aparecía dibujado aquí.
  for (const kind of REALM_KINDS) {

    const piece = state.realmPieces?.[player]?.[kind];

    if (!piece?.inLimbo || piece.maraLevel == null) continue;

    const level = Math.max(1, Math.min(6, piece.maraLevel));

    const index = 6 - level;

    if (!cells[index]) cells[index] = { player, kind };

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