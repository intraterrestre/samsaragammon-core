// src/UI/LessonCard.tsx — tarjeta de lección de PLAY WITH BUDDHA.
//
// 3 oct 2026, pedido de Federico: "que ese cartel yo lo pueda apartar
// con el dedo o clicarlo para desaparecerlo". Un toque (o clic) la
// cierra; arrastrarla hacia un lado o hacia arriba la aparta. Mientras
// se arrastra, la tarjeta sigue al dedo y se va desvaneciendo.

import React from "react";

type Props = {
  message: string;
  fading: boolean;
  onDismiss: () => void;
  dismissLabel: string;
  // Lecciones de Nidana: las 12 monedas numeradas; active = en juego ahora.
  nidanas?: { id: string; src: string; active: boolean }[];
  // Imagen en lugar de la rueda ☸ (p. ej. el loto).
  icon?: string;
  // "left": a la izquierda, centrada en vertical (no tapa la esquina
  // superior derecha, p. ej. el Reloj de la Evolución).
  placement?: "top" | "left" | "bottom";
  // 6 oct 2026 — icono grande (la moneda de Buddha dentro del cartel).
  iconLarge?: boolean;
  // Sin desenfoque de fondo (deja ver el tablero nítido).
  plain?: boolean;
  // 16 nov 2026 — enlace "No mostrar más ayudas" (jugadores expertos).
  onDisableHelps?: () => void;
  disableHelpsLabel?: string;
};

const SWIPE_PX = 60;

// 15 nov 2026 — Federico: los carteles tapaban demasiado tablero. Ahora
// todos viven en la columna izquierda de la escena (el muro / la pintura de
// Mara), debajo del panel de destinos y a la izquierda del dado, sin óvalo
// ni fondo. Se mide .samsaraScene (que se escala y centra distinto en cada
// pantalla) para quedar pegados al lienzo y no a la ventana.
const COL = { left: 0.02, top: 0.25, width: 0.195, height: 0.68 };

function useSceneColumn() {
  const [rect, setRect] = React.useState<DOMRect | null>(null);
  React.useLayoutEffect(() => {
    const measure = () => {
      const el = document.querySelector(".samsaraScene");
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);
  if (!rect) return undefined;
  return {
    left: rect.left + rect.width * COL.left,
    top: rect.top + rect.height * COL.top,
    width: rect.width * COL.width,
    maxHeight: rect.height * COL.height,
  } as React.CSSProperties;
}

export function LessonCard({ message, fading, onDismiss, dismissLabel, nidanas, icon, iconLarge = false, onDisableHelps, disableHelpsLabel }: Props) {
  // `placement` y `plain` se siguen aceptando (no rompen a quien los pasa)
  // pero ya no cambian nada: todos los carteles van a la columna izquierda.
  const column = useSceneColumn();
  const start = React.useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = React.useState({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = Math.min(0, e.clientY - start.current.y); // solo hacia arriba
    setDrag({ x: dx, y: dy });
  };

  const onPointerUp = () => {
    if (!start.current) return;
    start.current = null;
    // Toque corto o arrastre largo: en los dos casos se cierra. Un
    // arrastre a medias (ni toque ni gesto) vuelve a su sitio.
    const moved = Math.max(Math.abs(drag.x), Math.abs(drag.y));
    if (moved < 8 || Math.abs(drag.x) > SWIPE_PX || drag.y < -SWIPE_PX / 2) {
      onDismiss();
    }
    setDrag({ x: 0, y: 0 });
  };

  const dragging = drag.x !== 0 || drag.y !== 0;
  const away = Math.max(Math.abs(drag.x) / 160, Math.abs(drag.y) / 80);

  return (
    <div
      className={`bwbLessonCard bwbLessonSide${fading ? " bwbLessonCardFading" : ""}`}
      role="status"
      aria-live="polite"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
        setDrag({ x: 0, y: 0 });
      }}
      style={{
        ...column,
        ...(dragging
          ? {
              transform: `translate(${drag.x}px, ${drag.y}px)`,
              opacity: Math.max(0.15, 1 - away),
              transition: "none",
            }
          : null),
      }}
    >
      {icon ? (
        <img src={icon} alt="" aria-hidden="true" className={`bwbLessonCardIconImg${iconLarge ? " bwbLessonCardIconBig" : ""}`} draggable={false} />
      ) : (
        <span className="bwbLessonCardIcon" aria-hidden="true">☸</span>
      )}
      <span>
        {/* Si la lección trae título (primera línea), va destacado. */}
        {message.includes("\n") ? (
          <>
            <strong className="bwbLessonCardTitle">{message.split("\n")[0]}</strong>
            {message.split("\n").slice(1).join("\n")}
          </>
        ) : (
          message
        )}
        {nidanas && (
          <span className="bwbLessonNidanas" aria-hidden="true">
            {nidanas.map((n) => (
              <img
                key={n.id}
                src={n.src}
                alt=""
                draggable={false}
                className={n.active ? "bwbLessonNidanaOn" : undefined}
              />
            ))}
          </span>
        )}
      </span>
      {onDisableHelps && disableHelpsLabel && (
        <button
          type="button"
          className="bwbLessonDisableHelps"
          onClick={(e) => {
            e.stopPropagation();
            onDisableHelps();
            onDismiss();
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {disableHelpsLabel}
        </button>
      )}
      <button
        type="button"
        className="bwbLessonCardClose"
        aria-label={dismissLabel}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        ✕
      </button>
    </div>
  );
}
