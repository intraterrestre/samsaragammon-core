// src/UI/VictoryScreen.tsx
// v34 (12 agosto 2026) — hueco real confirmado: state.winner ya se
// calculaba correctamente (checkNirvana, reducer.ts) pero ningún lugar
// de la interfaz lo leía — el jugador podía cumplir la condición real
// de victoria sin que el juego se lo dijera nunca. Esta pantalla es
// puramente de interfaz: no toca la regla de victoria, el reducer, ni
// checkNirvana — solo reacciona a un valor que ya existía.
import type { PlayerId } from "../game/types";

type Props = {
  winner: PlayerId;
  onPlayAgain: () => void;
};

export function VictoryScreen({ winner, onPlayAgain }: Props) {
  const label = winner === "P1" ? "White" : "Black";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background: "rgba(4, 4, 8, 0.92)",
        backdropFilter: "blur(3px)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 15,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.55)",
          fontWeight: 700,
        }}
      >
        Nirvana reached
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 900,
          color: "white",
          textShadow: "0 0 24px rgba(255,220,140,0.6), 0 2px 6px rgba(0,0,0,0.8)",
          maxWidth: 520,
          lineHeight: 1.15,
        }}
      >
        {label} has completed the cycle
      </div>

      <div
        style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.75)",
          maxWidth: 460,
          lineHeight: 1.5,
        }}
      >
        All six Avatars arrived together in Humans. The wheel stops
        for {label.toLowerCase()}.
      </div>

      <button
        type="button"
        onClick={onPlayAgain}
        style={{
          marginTop: 12,
          padding: "12px 28px",
          borderRadius: 12,
          border: "2px solid rgba(255,220,140,0.7)",
          background: "rgba(255,220,140,0.12)",
          color: "white",
          fontSize: 16,
          fontWeight: 800,
          cursor: "pointer",
          boxShadow: "0 0 16px rgba(255,220,140,0.35)",
        }}
      >
        Play again
      </button>
    </div>
  );
}

export default VictoryScreen;
