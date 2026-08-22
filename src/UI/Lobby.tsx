import React, { useState } from "react";
import introImage from "../assets/intro/intro_samsaragammon.webp";

type Props = {
  userId: string;
  onCreateGame: () => Promise<void>;
  onJoinGame: (code: string) => Promise<void>;
  onPlayLocal: () => void;
  createdCode?: string | null;
  isLoading?: boolean;
  error?: string | null;
};

export function Lobby({
  onCreateGame,
  onJoinGame,
  onPlayLocal,
  createdCode,
  isLoading,
  error,
}: Props) {
  const [joinCode, setJoinCode] = useState("");

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    await onJoinGame(joinCode.trim());
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#e8dcc8",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        gap: 32,
      }}
    >
      <div style={{ textAlign: "center", width: "100%", maxWidth: 420 }}>
        <img
          src={introImage}
          alt="Samsaragammon"
          style={{
            width: "100%",
            maxHeight: "45vh",
            objectFit: "contain",
            borderRadius: 12,
          }}
        />
      </div>

      {error && (
        <div
          style={{
            background: "rgba(255,80,80,0.12)",
            border: "1px solid rgba(255,80,80,0.3)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            color: "#ff8080",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 340,
        }}
      >
        {/* Crear partida */}
        <button
          onClick={onCreateGame}
          disabled={isLoading}
          style={btnStyle("primary")}
        >
          {isLoading ? "Creating…" : "Create game"}
        </button>

        {createdCode && (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 16,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
              Share this code with your opponent:
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                letterSpacing: 3,
                color: "#f0c060",
              }}
            >
              {createdCode}
            </div>
            <button
              onClick={() => navigator.clipboard?.writeText(createdCode)}
              style={{
                marginTop: 10,
                background: "none",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#e8dcc8",
                borderRadius: 8,
                padding: "4px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Copy code
            </button>
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 8 }}>
              Waiting for opponent…
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Game code (e.g. KARMA-7X3)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "#e8dcc8",
              fontSize: 14,
              fontFamily: "monospace",
              outline: "none",
            }}
          />
          <button
            onClick={handleJoin}
            disabled={isLoading || !joinCode.trim()}
            style={btnStyle("secondary")}
          >
            Join
          </button>
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 12,
          }}
        >
          <button onClick={onPlayLocal} style={btnStyle("ghost")}>
            Play local (hot-seat)
          </button>
        </div>
      </div>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary" | "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    transition: "opacity 0.15s",
    letterSpacing: 0.5,
  };

  if (variant === "primary") {
    return { ...base, background: "#c8a84b", color: "#1a1200" };
  }
  if (variant === "secondary") {
    return {
      ...base,
      width: "auto",
      background: "rgba(255,255,255,0.1)",
      color: "#e8dcc8",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "10px 16px",
    };
  }
  return {
    ...base,
    background: "none",
    color: "rgba(232,220,200,0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 13,
  };
}
