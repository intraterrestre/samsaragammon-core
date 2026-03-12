// src/UI/ExplainModal.tsx
import React from "react";
import type { PlayerId } from "../game/types";
import type { CycleStats } from "../game/behavior/types";

type Props = {
  open: boolean;
  onClose: () => void;
  player: PlayerId;
  last?: CycleStats | null;
};

function pct(x: number) {
  const v = Math.max(0, Math.min(1, x));
  return `${Math.round(v * 100)}%`;
}

function interpretPattern(last?: CycleStats | null) {
  if (!last) {
    return "Not yet — complete a full lap around the ring to reveal your pattern.";
  }

  const lines: string[] = [];

  switch (last.pattern) {
    case "AGGRESSIVE":
      lines.push("You move toward impact.");
      lines.push("Conflict is processed through action.");
      break;
    case "REACTIVE":
      lines.push("You return to Naraka under pressure.");
      lines.push("Emotion moves faster than intention.");
      break;
    case "WANDERING":
      lines.push("You shift realms frequently.");
      lines.push("Stability is not yet your anchor.");
      break;
    case "STEADY":
    default:
      lines.push("You move with internal balance.");
      lines.push("You do not rush the wheel.");
      break;
  }

  if (last.aggressionScore > 0.6) lines.push("When capture is possible, you rarely hesitate.");
  if (last.reactivityScore > 0.4) lines.push("You revisit reactive states more than most.");
  if (last.wanderingScore > 0.5) lines.push("You resist remaining in one realm for long.");

  return lines.join("\n");
}

export function ExplainModal({ open, onClose, player, last }: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 18,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(20,30,22,0.92)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
          color: "rgba(255,255,255,0.92)",
          padding: "14px 14px 12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Explain
            </div>

            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>
              {player} — {last ? `Pattern: ${last.pattern}` : "Pattern not revealed yet"}
            </div>

            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>
              {last
                ? "Based on your last completed lap around the ring."
                : "Not yet — complete a full lap around the ring to reveal your pattern."}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(0,0,0,0.25)",
              color: "rgba(255,255,255,0.9)",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Close
          </button>
        </div>

        {/* Narrative block (always shown, even if last is null) */}
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.1)",
            lineHeight: 1.5,
            whiteSpace: "pre-line",
          }}
        >
          {interpretPattern(last)}
        </div>

        {/* Metrics only if last exists */}
        {last && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={cardStyle}>
                <div style={kStyle}>Aggression</div>
                <div style={vStyle}>{pct(last.aggressionScore)}</div>
                <div style={hStyle}>captures / moves</div>
              </div>

              <div style={cardStyle}>
                <div style={kStyle}>Reactivity</div>
                <div style={vStyle}>{pct(last.reactivityScore)}</div>
                <div style={hStyle}>Naraka landings</div>
              </div>

              <div style={cardStyle}>
                <div style={kStyle}>Wandering</div>
                <div style={vStyle}>{pct(last.wanderingScore)}</div>
                <div style={hStyle}>realm changes</div>
              </div>
            </div>

            <div style={{ fontWeight: 800, marginTop: 12, marginBottom: 6 }}>Raw stats (last lap)</div>
            <div>Moves: <b>{last.moves}</b></div>
            <div>Captures: <b>{last.captures}</b></div>
            <div>Naraka landings: <b>{last.narakaLandings}</b></div>
            <div>Realm changes: <b>{last.realmChanges}</b></div>

            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 10 }}>
              Tip: patterns become stable after repeated laps (your “streak”).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: "10px 10px",
  borderRadius: 14,
  background: "rgba(0,0,0,0.20)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const kStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.75,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const vStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  marginTop: 4,
};

const hStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.7,
  marginTop: 2,
};