// src/UI/EvolutionClockIndicator.tsx
// v81 (31 agosto 2026) — indicador visual MUY discreto del Evolution
// Clock 666→777. Componente de presentación puro: no guarda ningún
// estado propio, todo se deriva de GameState (globalRollCount,
// realmProgress[player].currentRealmStep/stageStartedAtRoll — los
// mismos campos que ya usa evaluateOrchestrator, sin contador nuevo).
// Pedido explícito: nada de barra de progreso, XP, HUD grande ni caja —
// un símbolo pequeño que se va revelando.
import type { GameState, PlayerId } from "../game/types";
import { requiredRollsForNextAvatar } from "../game/orchestrator/Orchestrator";

export function getEvolutionClockDisplay(
  state: GameState,
  player: PlayerId
): string {
  if (!state.brunoRevealed) return "";

  const step = state.realmProgress[player].currentRealmStep;

  if (step >= 6) return "666 → 777";

  const rollsInStage =
    state.globalRollCount -
    (state.realmProgress[player].stageStartedAtRoll ?? 0);
  const required = requiredRollsForNextAvatar(step);
  const progress = Math.max(0, Math.min(rollsInStage, required));

  if (step === 1) return `6 · ${progress} · _`;
  if (step === 2) return `6 · 6 · ${progress}`;

  if (step === 3 && progress === 0) return "666";
  if (step === 3) return `666 → ${progress} · _ · _`;
  if (step === 4) return `666 → 7 · ${progress} · _`;
  return `666 → 7 · 7 · ${progress}`;
}

type Props = {
  state: GameState;
};

export function EvolutionClockIndicator({ state }: Props) {
  const p1 = getEvolutionClockDisplay(state, "P1");
  const p2 = getEvolutionClockDisplay(state, "P2");

  if (!p1 && !p2) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 30,
        display: "flex",
        gap: 14,
        pointerEvents: "none",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 1,
        color: "rgba(255,255,255,0.55)",
        textShadow: "0 1px 3px rgba(0,0,0,0.9)",
      }}
    >
      {p1 && <span>{p1}</span>}
      {p1 && p2 && <span style={{ opacity: 0.3 }}>|</span>}
      {p2 && <span>{p2}</span>}
    </div>
  );
}

export default EvolutionClockIndicator;
