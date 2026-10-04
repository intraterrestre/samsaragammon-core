// src/UI/EvolutionClockIndicator.tsx
// v81 (31 agosto 2026) — indicador visual MUY discreto del Evolution
// Clock 666→777. Componente de presentación puro: no guarda ningún
// estado propio, todo se deriva de GameState (globalRollCount,
// realmProgress[player].currentRealmStep/stageStartedAtRoll — los
// mismos campos que ya usa evaluateOrchestrator, sin contador nuevo).
// Pedido explícito: nada de barra de progreso, XP, HUD grande ni caja —
// un símbolo pequeño que se va revelando.
import React from "react";
import type { GameState, PlayerId } from "../game/types";
import { useI18n } from "../i18n";
import "./beginnerHints.css";
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
  // 4 oct 2026 — PLAY WITH BUDDHA: flecha dorada que late mientras
  // Buddha explica el reloj (lección "evoClock").
  highlight?: boolean;
};

// 4 oct 2026 — Federico + ChatGPT: el reloj no decía de quién era cada
// línea ni qué significaba. Ahora: punto blanco/negro delante de cada
// línea (todas las partidas) y, al tocarlo o pasar el ratón, una ayuda
// breve. Primero significado; el ritmo 6→7 no se explica.
export function EvolutionClockIndicator({ state, highlight = false }: Props) {
  const { t } = useI18n();
  const [tipOpen, setTipOpen] = React.useState(false);
  const timer = React.useRef<number | null>(null);
  const p1 = getEvolutionClockDisplay(state, "P1");
  const p2 = getEvolutionClockDisplay(state, "P2");

  if (!p1 && !p2) return null;

  const showTip = (ms?: number) => {
    if (timer.current) window.clearTimeout(timer.current);
    setTipOpen(true);
    if (ms) timer.current = window.setTimeout(() => setTipOpen(false), ms);
  };

  const dot = (color: "white" | "black") => (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: "50%",
        marginRight: 8,
        verticalAlign: "middle",
        background: color === "white" ? "#f4efe4" : "#111",
        border: color === "white" ? "1px solid rgba(0,0,0,0.6)" : "1.5px solid rgba(255,255,255,0.85)",
        boxShadow: "0 0 4px rgba(0,0,0,0.8)",
      }}
    />
  );

  return (
    <div
      style={{
        // v85 (5 septiembre 2026) — esquina superior derecha, a la altura
        // de las casillas 13-14, P1 encima de P2.
        position: "absolute",
        top: 30,
        right: 20,
        zIndex: 30,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={t("evo.tip")}
        title={t("evo.tip")}
        onMouseEnter={() => showTip()}
        onMouseLeave={() => setTipOpen(false)}
        onClick={() => showTip(5000)}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 4,
          cursor: "help",
          pointerEvents: "auto",
          fontSize: 20,
          fontWeight: 900,
          letterSpacing: 1,
          color: "rgba(255,255,255,0.92)",
          textShadow:
            "0 0 6px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8), 0 2px 3px rgba(0,0,0,1)",
          borderRadius: 10,
          padding: highlight ? "4px 8px" : 0,
          outline: highlight ? "2px solid #ffd24a" : "none",
          boxShadow: highlight ? "0 0 16px rgba(255,210,74,0.8)" : "none",
        }}
      >
        {p1 && (
          <span>
            {dot("white")}
            {p1}
          </span>
        )}
        {p2 && (
          <span>
            {dot("black")}
            {p2}
          </span>
        )}
        {tipOpen && (
          <div className="evoClockTip" onClick={(e) => { e.stopPropagation(); setTipOpen(false); }}>
            {t("evo.tip")}
          </div>
        )}
      </div>
      {/* Flecha debajo, apuntando hacia arriba: a la izquierda del reloj
          quedaba tapada por las fichas de las casillas 13-15. */}
      {highlight && (
        <span className="evoClockArrow" aria-hidden="true">
          ⬆
        </span>
      )}
    </div>
  );
}

export default EvolutionClockIndicator;
