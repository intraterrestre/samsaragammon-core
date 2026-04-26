import React from "react";
import type { GameState, PieceKind, PlayerId } from "../game/types";

import pigWhite from "../assets/pieces/pig_white.png";
import pigBlack from "../assets/pieces/pig_black.png";
import roosterWhite from "../assets/pieces/rooster_white.png";
import roosterBlack from "../assets/pieces/rooster_black.png";
import cobraWhite from "../assets/pieces/cobra_white.png";
import cobraBlack from "../assets/pieces/cobra_black.png";

type Props = {
  state: GameState;
};

const LEVELS = [6, 5, 4, 3, 2, 1];
const PIECES: PieceKind[] = ["pig", "snake", "rooster"];

function pieceLabel(kind: PieceKind) {
  if (kind === "pig") return "Pig";
  if (kind === "snake") return "Snake";
  return "Rooster";
}

function getPieceImage(player: PlayerId, kind: PieceKind) {
  if (kind === "pig") return player === "P1" ? pigWhite : pigBlack;
  if (kind === "snake") return player === "P1" ? cobraWhite : cobraBlack;
  return player === "P1" ? roosterWhite : roosterBlack;
}

function getPiecesAtLevel(
  state: GameState,
  player: PlayerId,
  level: number
): PieceKind[] {
  return PIECES.filter((kind) => {
    const piece = state.pieces[player][kind];
    return piece.inLimbo && piece.maraLevel === level;
  });
}

function Column({
  state,
  player,
}: {
  state: GameState;
  player: PlayerId;
}) {
  const title = player === "P1" ? "⚪ White Path" : "⚫ Black Path";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 180,
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          fontWeight: 800,
          opacity: 0.9,
          marginBottom: 4,
        }}
      >
        {title}
      </div>

      {LEVELS.map((level) => {
        const piecesHere = getPiecesAtLevel(state, player, level);

        return (
          <div
            key={`${player}-level-${level}`}
            style={{
              minHeight: 56,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                level >= 4
                  ? "rgba(255,255,255,0.07)"
                  : level >= 2
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                opacity: 0.7,
                minWidth: 54,
              }}
            >
              Eye {level}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "flex-end",
                flex: 1,
              }}
            >
              {piecesHere.length === 0 ? (
                <div
                  style={{
                    fontSize: 11,
                    opacity: 0.28,
                    fontStyle: "italic",
                  }}
                >
                  empty
                </div>
              ) : (
                piecesHere.map((kind) => (
                  <div
                    key={`${player}-${kind}-${level}`}
                    title={`${player} ${pieceLabel(kind)}`}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.22)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={getPieceImage(player, kind)}
                      alt=""
                      style={{
                        width: 26,
                        height: 26,
                        objectFit: "contain",
                        pointerEvents: "none",
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MaraPanel({ state }: Props) {
  const someoneInMara = (["P1", "P2"] as PlayerId[]).some((player) =>
    PIECES.some((kind) => state.pieces[player][kind].inLimbo)
  );

  return (
    <div
      style={{
        width: "min(760px, 94vw)",
        margin: "18px auto 14px",
        padding: "14px 14px 16px",
        borderRadius: 18,
        background: "rgba(0,0,0,0.16)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: 0.4,
          }}
        >
          Limbo of Mara
        </div>
        <div
          style={{
            fontSize: 12,
            opacity: 0.68,
            marginTop: 2,
          }}
        >
          Double ascending path through the eyes of illusion
        </div>
      </div>

      {!someoneInMara ? (
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            opacity: 0.45,
            padding: "10px 0 4px",
          }}
        >
          No pieces are trapped in Mara right now
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "stretch",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Column state={state} player="P1" />
          <Column state={state} player="P2" />
        </div>
      )}
    </div>
  );
}