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
};

const SWIPE_PX = 60;

export function LessonCard({ message, fading, onDismiss, dismissLabel }: Props) {
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
      className={`bwbLessonCard${fading ? " bwbLessonCardFading" : ""}`}
      role="status"
      aria-live="polite"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
        setDrag({ x: 0, y: 0 });
      }}
      style={
        dragging
          ? {
              transform: `translate(calc(-50% + ${drag.x}px), ${drag.y}px)`,
              opacity: Math.max(0.15, 1 - away),
              transition: "none",
            }
          : undefined
      }
    >
      <span className="bwbLessonCardIcon" aria-hidden="true">☸</span>
      <span>{message}</span>
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
