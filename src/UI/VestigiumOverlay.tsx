// src/UI/VestigiumOverlay.tsx
import React, { useEffect } from "react";

type Props = {
  show: boolean;
  onDone: () => void;
  ms?: number; // duración del efecto
};

export function VestigiumOverlay({ show, onDone, ms = 2000 }: Props) {
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => onDone(), ms);
    return () => window.clearTimeout(t);
  }, [show, ms, onDone]);

  if (!show) return null;

  // OJO: aquí NO hay texto. El texto lo pones tú en el <h1>.
  return (
    <div
      className="vestigiumOverlay"
      role="presentation"
      onClick={onDone}
      aria-hidden="true"
    />
  );
}