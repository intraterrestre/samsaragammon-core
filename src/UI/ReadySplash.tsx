// src/UI/ReadySplash.tsx
// 15 nov 2026 — Federico: "primero juegas". Reemplaza el video de Genesis
// como entrada: una sola imagen ("READY TO PLAY ? / GO FOR IT") y UN toque
// en cualquier parte para empezar. Ese mismo toque (gesto de usuario real)
// pide pantalla completa + horizontal en el móvil, que antes hacía el
// "Tap to start" del video.
//
// Solo se muestra una vez por carga de página: "New game" remonta GameShell
// (key={genesisResetSeq}) y no queremos repetir el cartel en cada revancha.

import { useState } from "react";
import { createPortal } from "react-dom";
import readyImg from "../assets/genesis/ready_to_play.webp";
import { markReadySplashDone, readySplashDone } from "./readySplashState";

type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
type LockableOrientation = ScreenOrientation & { lock?: (o: string) => Promise<void> };

type Props = { onDone?: () => void };

export function ReadySplash({ onDone }: Props) {
  const [visible, setVisible] = useState(() => !readySplashDone());

  if (!visible) return null;

  const start = () => {
    markReadySplashDone();
    setVisible(false);
    onDone?.();
    const el = document.documentElement as FullscreenEl;
    (async () => {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
        const orientation = screen.orientation as LockableOrientation | undefined;
        if (orientation?.lock) await orientation.lock("landscape").catch(() => undefined);
      } catch {
        // Safari/iPhone no deja pantalla completa ni bloquear giro: se sigue igual.
      }
    })();
  };

  const overlay = (
    <button
      type="button"
      onClick={start}
      aria-label="Ready to play? Go for it"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000002, // por encima de todo (lecciones, dado…)
        width: "100%",
        height: "100%",
        padding: 0,
        border: "none",
        background: "#000",
        cursor: "pointer",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <img
        src={readyImg}
        alt="Ready to play? Go for it"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </button>
  );

  return typeof document !== "undefined"
    ? createPortal(overlay, document.body)
    : overlay;
}

export default ReadySplash;
