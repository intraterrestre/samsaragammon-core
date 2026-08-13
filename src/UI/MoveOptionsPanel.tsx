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
import { createPortal } from "react-dom";
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

  // v33 (13 agosto 2026) — portal a document.body + position:fixed.
  // Antes vivia dentro de .ringWrap (position:absolute), asi que
  // "bottom: 12" se media contra la caja del ANILLO (520x520), no contra
  // la pantalla real — el anillo ocupa casi toda la escena, asi que el
  // panel terminaba superpuesto sobre el circuito bajo (reportado por
  // Federico). Con portal + fixed queda anclado al fondo real de la
  // pantalla, como un HUD, sin depender del tamano/escala del tablero.
  //
  // v34 (13 agosto 2026) — reposicionado arriba a la izquierda, afuera
  // del anillo, sobre la zona de Mara (a pedido de Federico).
  //
  // v35 (13 agosto 2026) — portal a document.body + position:fixed
  // anclaba esto a la ventana REAL del navegador, no al lienzo del
  // juego (.samsaraScene, 1100x620, que se escala/centra distinto en
  // cada pantalla) — en Mac quedaba flotando en la franja negra arriba
  // del cuadro pintado en vez de "sobre Mara". Portal ahora directo a
  // .samsaraScene (position:relative) + position:absolute: las
  // coordenadas quedan relativas al LIENZO, no a la ventana, así que
  // escala y se reposiciona junto con el arte en cualquier dispositivo.
  const sceneEl =
    typeof document !== "undefined"
      ? document.querySelector(".samsaraScene")
      : null;

  return createPortal(
    <div
      style={{
        position: sceneEl ? "absolute" : "fixed",
        left: 20,
        top: 20,
        zIndex: 10500,
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        gap: 8,
        maxWidth: "min(92vw, 260px)",
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
            <span>Cell {opt.toPos}</span>
            {label && (
              <span style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>
                {label}
              </span>
            )}
          </button>
        );
      })}
    </div>,
    sceneEl ?? document.body
  );
}

export default MoveOptionsPanel;
