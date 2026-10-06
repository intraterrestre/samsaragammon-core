// src/UI/BuddhaSpeech.tsx
//
// 6 oct 2026 — el Buddha Azul "habla": óvalo translúcido (el mismo de
// los carteles de Buddha) colgado de un cordón curvo que llega hasta su
// cabeza en el tablero. Va fuera del tablero escalado (portal a body),
// así que se lee en pantallas chicas. Espera un toque: no tiene
// temporizador.

import React from "react";
import { createPortal } from "react-dom";

type Props = {
  title?: string;
  text: string;
  hint: string;
  onTap: () => void;
};

type Geo = {
  bx: number; // cabeza de Buddha (pantalla)
  by: number;
  ok: boolean;
};

export function BuddhaSpeech({ title, text, hint, onTap }: Props) {
  const ovalRef = React.useRef<HTMLDivElement | null>(null);
  const [geo, setGeo] = React.useState<Geo>({ bx: 0, by: 0, ok: false });
  const [oval, setOval] = React.useState<DOMRect | null>(null);

  React.useLayoutEffect(() => {
    const measure = () => {
      const img = document.querySelector(".budaKarmaImg") as HTMLElement | null;
      const r = img?.getBoundingClientRect();
      if (r && r.width > 0) {
        setGeo({ bx: r.left + r.width / 2, by: r.top + r.height * 0.12, ok: true });
      } else {
        setGeo({ bx: 0, by: 0, ok: false });
      }
      if (ovalRef.current) setOval(ovalRef.current.getBoundingClientRect());
    };
    measure();
    const id = window.setTimeout(measure, 60);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
    };
  }, [title, text]);

  const vw = typeof window !== "undefined" ? window.innerWidth : 800;
  const vh = typeof window !== "undefined" ? window.innerHeight : 600;
  const width = Math.min(560, vw - 32);
  // El óvalo se coloca encima de la cabeza de Buddha (o centrado abajo si
  // Buddha no está visible), sin salirse de la pantalla.
  const left = geo.ok
    ? Math.max(16, Math.min(vw - width - 16, geo.bx - width * 0.1))
    : (vw - width) / 2;
  // Bien por encima de la cabeza, para que el cordón se vea.
  const bottom = geo.ok ? Math.max(12, vh - geo.by + Math.min(90, vh * 0.12)) : 16;

  const lines = text.split("\n");
  const last = lines[lines.length - 1];
  const question = lines.length > 1 && (last.includes("¿") || /\?\s*$/.test(last)) ? last : null;
  const body = question ? lines.slice(0, -1) : lines;

  return createPortal(
    <>
      {/* Capa que pausa el tablero; tocar en cualquier sitio avanza. */}
      <div className="buddhaSpeechVeil" onClick={onTap} />
      {geo.ok && oval && (
        <svg className="buddhaSpeechCord" width={vw} height={vh} aria-hidden="true">
          <path
            d={`M ${oval.left + oval.width * 0.32} ${oval.bottom - 10} C ${oval.left + oval.width * 0.3} ${oval.bottom + 40} ${geo.bx + 60} ${geo.by - 30} ${geo.bx} ${geo.by}`}
          />
          <circle cx={geo.bx} cy={geo.by} r={6} />
        </svg>
      )}
      <div
        ref={ovalRef}
        className="buddhaSpeech"
        role="status"
        aria-live="polite"
        onClick={onTap}
        style={{ left, bottom, width }}
      >
        {title && <div className="buddhaSpeechTitle">{title}</div>}
        {body.map((l, i) => (
          <div key={i} className={i === 0 ? "buddhaSpeechLead" : undefined}>
            {l}
          </div>
        ))}
        {question && <div className="buddhaSpeechQuestion">{question}</div>}
        <div className="buddhaSpeechHint">{hint}</div>
      </div>
    </>,
    document.body
  );
}
