import React from "react";
import type { MoveOption, PlayerId, PieceKind } from "../game/types";

type Props = {
  options: MoveOption[];
  player: PlayerId;
  onChoose: (option: MoveOption, all: MoveOption[]) => void;
  onHoverOption?: (option: MoveOption | null) => void;
};

const PIECE_ORDER: PieceKind[] = ["pig", "snake", "rooster"];

const pieceLabel = (p: PieceKind) => {
  if (p === "pig") return "🐖 Pig";
  if (p === "snake") return "🐍 Snake";
  return "🐓 Rooster";
};

export function MoveOptionsPanel({
  options,
  player,
  onChoose,
  onHoverOption,
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
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          fontWeight: 800,
          marginBottom: 10,
          opacity: 0.9,
        }}
      >
        Conscious Move · {player}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {PIECE_ORDER.map((piece) => {
          const opts = grouped[piece];
          if (!opts.length) return null;

          return (
            <div
              key={piece}
              style={{
                padding: 10,
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: 6,
                  opacity: 0.9,
                }}
              >
                {pieceLabel(piece)}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {opts.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => onChoose(opt, options)}
                    onMouseEnter={() => onHoverOption?.(opt)}
                    onMouseLeave={() => onHoverOption?.(null)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.15)",
                      background: "rgba(255,255,255,0.06)",
                      color: "white",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {opt.choice} → {opt.toPos}
                    {opt.meaning && (
                      <span style={{ marginLeft: 6, opacity: 0.7 }}>
                        {opt.meaning}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}