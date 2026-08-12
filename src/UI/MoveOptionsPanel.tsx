// src/UI/MoveOptionsPanel.tsx
// v32 (12 agosto 2026) — reescrito. Este archivo existía pero nunca se
// conectó a nada (código muerto), construido para un modelo viejo donde
// el Veneno era el actor (agrupaba opciones por pig/snake/rooster). Con
// el flujo de hoy (Avatar+Veneno de dos pasos), todas las opciones que
// llegan aquí ya comparten el mismo pieceKind (el Avatar elegido) — solo
// cambia el destino. Reescrito simple para eso.
//
// Motivo: en pantallas chicas, las líneas de destino (MoveEmanations)
// pueden quedar tapadas por fichas apiladas con z-index más alto, así
// que un clic ahí cae sobre una ficha en vez del destino — "cambia de
// Veneno" en vez de confirmar el movimiento (reportado por Federico).
// Este panel es una alternativa segura: botones grandes, sin ambigüedad
// de zonas superpuestas. No reemplaza las líneas — conviven, dan
// contexto visual distinto del mismo destino.
import type { MoveOption } from "../game/types";

type Props = {
  options: MoveOption[];
  onChoose: (option: MoveOption, allOptions: MoveOption[]) => void;
};

function meaningLabel(meaning: MoveOption["meaning"]): string {
  switch (meaning) {
    case "IMPACT":
      return "¡Captura!";
    case "RISK":
      return "Riesgo";
    case "SAFE":
      return "Seguro";
    case "SAME":
      return "Se queda";
    default:
      return "";
  }
}

function meaningColor(meaning: MoveOption["meaning"]): string {
  switch (meaning) {
    case "IMPACT":
      return "rgba(255, 70, 70, 1)";
    case "RISK":
      return "rgba(255, 170, 0, 1)";
    case "SAFE":
      return "rgba(80, 180, 255, 1)";
    case "SAME":
      return "rgba(255, 255, 255, 1)";
    default:
      return "rgba(0, 220, 120, 1)";
  }
}

export function MoveOptionsPanel({ options, onChoose }: Props) {
  if (!options.length) return null;

  // Evita dos botones idénticos (mismo destino) si dos vías de cálculo
  // llegan a la misma casilla — el jugador solo necesita verlo una vez.
  const seen = new Set<number>();
  const uniqueOptions = options.filter((opt) => {
    if (seen.has(opt.toPos)) return false;
    seen.add(opt.toPos);
    return true;
  });

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
        zIndex: 10500,
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        maxWidth: "92%",
        padding: "8px 10px",
        borderRadius: 14,
        background: "rgba(10, 10, 14, 0.82)",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 6px 24px rgba(0,0,0,0.55)",
        pointerEvents: "auto",
      }}
    >
      {uniqueOptions.map((opt, i) => {
        const color = meaningColor(opt.meaning);
        const label = meaningLabel(opt.meaning);

        return (
          <button
            key={`${opt.toPos}-${opt.choice}-${i}`}
            type="button"
            onClick={() => onChoose(opt, options)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 76,
              minHeight: 52,
              padding: "8px 12px",
              borderRadius: 10,
              border: `2px solid ${color}`,
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontWeight: 800,
              fontSize: 15,
              lineHeight: 1.15,
              cursor: "pointer",
              boxShadow: `0 0 10px ${color}`,
            }}
          >
            <span>Casilla {opt.toPos}</span>
            {label && (
              <span style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default MoveOptionsPanel;
