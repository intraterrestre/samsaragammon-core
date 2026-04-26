import React from "react";
import type { MoveOption, PlayerId, PieceKind } from "../game/types";

import pigWhite from "../assets/pieces/pig_white.png";
import pigBlack from "../assets/pieces/pig_black.png";
import roosterWhite from "../assets/pieces/rooster_white.png";
import roosterBlack from "../assets/pieces/rooster_black.png";
import cobraWhite from "../assets/pieces/cobra_white.png";
import cobraBlack from "../assets/pieces/cobra_black.png";

type NidanaPreview = {
  outcome: "IMPACT" | "DEFLECTED" | "LOOP" | "FLOW" | "RISK";
  line: string;
} | null;

type Props = {
  options: MoveOption[];
  player: PlayerId;
  onChoose: (option: MoveOption, all: MoveOption[]) => void;
  onHoverOption?: (option: MoveOption | null) => void;
  nidanaPreviewByOption?: Record<string, NidanaPreview>;
};

const PIECE_ORDER: PieceKind[] = ["pig", "snake", "rooster"];

const venomLabel = (p: PieceKind) => {
  if (p === "pig") return "IGNORANCE";
  if (p === "snake") return "ANGER";
  return "IMPULSE";
};

const getPieceImage = (piece: PieceKind, player: PlayerId) => {
  if (piece === "rooster") {
    return player === "P1" ? roosterWhite : roosterBlack;
  }
  if (piece === "snake") {
    return player === "P1" ? cobraWhite : cobraBlack;
  }
  return player === "P1" ? pigWhite : pigBlack;
};

const getVenomTint = (piece: PieceKind) => {
  if (piece === "pig") return "rgba(255, 160, 190, 0.10)";
  if (piece === "snake") return "rgba(255, 70, 70, 0.10)";
  return "rgba(170, 255, 80, 0.10)";
};

export function MoveOptionsPanel({
  options,
  player,
  onChoose,
  onHoverOption,
  nidanaPreviewByOption,
}: Props) {
  if (!options.length) return null;

  const grouped: Record<PieceKind, MoveOption[]> = {
    pig: [],
    snake: [],
    rooster: [],
  };

  for (const opt of options) grouped[opt.pieceKind].push(opt);

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "12px auto",
        padding: 14,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.15)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          marginBottom: 12,
          opacity: 0.95,
          textAlign: "center",
          letterSpacing: 0.4,
        }}
      >
        Conscious Move · {player}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {PIECE_ORDER.map((piece) => {
          const opts = grouped[piece];
          if (!opts.length) return null;

          const imgSrc = getPieceImage(piece, player);
          const tint = getVenomTint(piece);

          return (
            <div
              key={piece}
              style={{
                position: "relative",
                overflow: "hidden",
                padding: "14px 14px 12px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                minHeight: 110,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background: `radial-gradient(circle at 80% 60%, ${tint} 0%, rgba(255,255,255,0) 42%)`,
                  opacity: 0.55,
                }}
              />

              <img
                src={imgSrc}
                alt=""
                style={{
                  position: "absolute",
                  right: 12,
                  bottom: -38,
                  width: 150,
                  height: 104,
                  objectFit: "contain",
                  objectPosition: "center bottom",
                  opacity: 0.96,
                  pointerEvents: "none",
                  transform: "scale(1.05)",
                  filter: "drop-shadow(0 0 8px rgba(0,0,0,0.22))",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <img
                  src={imgSrc}
                  alt={venomLabel(piece)}
                  style={{
                    width: 42,
                    height: 42,
                    objectFit: "contain",
                    filter: "drop-shadow(0 0 6px rgba(0,0,0,0.22))",
                    flexShrink: 0,
                  }}
                />

                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 18,
                    letterSpacing: 1.8,
                    lineHeight: 1,
                    opacity: 0.98,
                    textShadow: "0 1px 0 rgba(0,0,0,0.12)",
                  }}
                >
                  {venomLabel(piece)}
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {opts.map((opt, i) => {
                  const previewKey = `${opt.pieceKind}-${opt.choice}-${opt.toPos}`;
                  const nidanaPreview =
                    nidanaPreviewByOption?.[previewKey] ?? null;

                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      <button
                        onClick={() => onChoose(opt, options)}
                        onMouseEnter={() => onHoverOption?.(opt)}
                        onMouseLeave={() => onHoverOption?.(null)}
                        style={{
                          padding: "7px 11px",
                          borderRadius: 10,
                          border: "1px solid rgba(255,255,255,0.15)",
                          background: "rgba(255,255,255,0.06)",
                          color: "white",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          backdropFilter: "blur(2px)",
                          textAlign: "left",
                        }}
                      >
                        {opt.choice} → {opt.toPos}
                        {opt.meaning && (
                          <span style={{ marginLeft: 6, opacity: 0.72 }}>
                            {opt.meaning}
                          </span>
                        )}
                      </button>

                      {nidanaPreview && (
                        <div
                          style={{
                            maxWidth: 180,
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            fontSize: 11,
                            lineHeight: 1.35,
                            opacity: 0.9,
                          }}
                        >
                          <div style={{ fontWeight: 800 }}>
                            {nidanaPreview.outcome}
                          </div>
                          <div style={{ opacity: 0.78 }}>
                            {nidanaPreview.line}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}