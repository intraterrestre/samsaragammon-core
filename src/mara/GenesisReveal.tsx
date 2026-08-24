// src/mara/GenesisReveal.tsx
// Genesis — usa import.meta.glob para que Vite procese los assets correctamente
//
// 2026-07-30: genesis_dados.mp4 ahora es un video fusionado que cubre lo que
// antes eran los 21 frames estáticos "NEBULA" (genesis_f0..f20 — cosmos
// hasta el tablero pintado). Esa fase ya no se cicla a mano con las tiradas
// de dado, vive dentro del video.
//
// El desarrollo de las casillas verdes ancestrales (genesis_cv04..cv24) NO
// está en el video — sigue siendo una fase aparte, ciclada por tiradas de
// dado igual que antes, solo que ahora arranca apenas termina el video
// (ya no hace falta "gastar" 6 lances en la nebulosa primero).
//
// Flujo: VIDEO reproduce -> onEnded -> CASILLAS (6 lances) -> COMPLETE.

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// 2026-08-22: se había agregado acá una regla proporcional "1000mm of
// human history" (996mm Paleolítico+Neolítico vs 4mm Edad de los
// Metales a hoy) superpuesta sobre el video de Genesis.
// 2026-08-23: Federico rehizo genesis_dados.mp4 insertando él mismo un
// video de "un metro" con esa misma idea, ya editado dentro del
// material — la regla-overlay en HTML/CSS queda redundante y se saca
// de acá (el video ya la muestra, mejorada). Ver git log para el
// overlay anterior si hace falta recuperarlo.

// 2026-08-03: el usuario retocó estas 24 fotos y las volvió a soltar en
// src/assets/intro/ (carpeta nueva) en vez de src/assets/genesis/ donde
// vivían antes — las viejas quedaron borradas de assets/genesis/. Apuntamos
// el glob a la carpeta nueva para no tener que mover sus archivos.
const casillasModules = import.meta.glob(
  "../assets/intro/genesis_cv*.webp",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

const videoModules = import.meta.glob(
  "../assets/genesis/genesis_dados.mp4",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;

// Casillas cada 4 (cv04, cv08, cv12, cv16, cv20, cv24)
const CASILLAS_FRAMES = [
  "genesis_cv04", "genesis_cv08", "genesis_cv12",
  "genesis_cv16", "genesis_cv20", "genesis_cv24"
]
  .map((name) => {
    const key = Object.keys(casillasModules).find((k) => k.includes(name));
    return key ? casillasModules[key] : "";
  })
  .filter(Boolean);

const VIDEO_SRC = Object.values(videoModules)[0] ?? "";

type GenesisPhase = "VIDEO" | "CASILLAS" | "COMPLETE";

type Props = {
  globalRollCount: number;
  realmStep: number;
  onComplete?: () => void;
  onPhaseChange?: (phase: GenesisPhase) => void;
  onSkip?: () => void;
};

export function GenesisReveal({
  globalRollCount,
  onComplete,
  onPhaseChange,
  onSkip,
}: Props) {
  const [phase, setPhase] = useState<GenesisPhase>(
    VIDEO_SRC ? "VIDEO" : CASILLAS_FRAMES.length > 0 ? "CASILLAS" : "COMPLETE"
  );

  // Lance en el que arrancó la fase CASILLAS, para contar relativo a ella
  // (ya no hay una fase NEBULA previa que "gaste" lances).
  const [casillasStartRoll, setCasillasStartRoll] = useState<number | null>(
    VIDEO_SRC ? null : globalRollCount
  );

  // El video arranca muted (requisito de autoplay en todos los browsers).
  // El botón de sonido permite al usuario activarlo con un tap explícito.
  const [isMuted, setIsMuted] = useState(true);

  // 2026-08-23: pedido de Federico — en el teléfono el flujo anterior era
  // "rotas -> arranca el video muted solo -> tenés que buscar el botón de
  // sonido aparte" (dos gestos, uno de ellos invisible: el autoplay). Ahora
  // el video NO arranca solo (se le quita `autoPlay`): apenas termina de
  // rotar, se ve una corneta grande de "toca para empezar" cubriendo la
  // pantalla, y ese ÚNICO tap dispara video + sonido a la vez (mismo gesto
  // de usuario, requisito de los navegadores para permitir audio). El botón
  // chico de mute que ya existía sigue disponible DESPUÉS de arrancar, por
  // si alguien quiere silenciarlo a mitad de la reproducción.
  const [hasStarted, setHasStarted] = useState(false);

  // 2026-08-05: en Mac el audio nunca se escuchaba aunque se tocara el
  // botón. Causa: solo se actualizaba el prop `muted` de React — React no
  // siempre sincroniza eso con la propiedad real `.muted` del elemento
  // <video> del DOM en todos los navegadores (es un gotcha conocido de
  // React con <video>/<audio>). Ahora se setea la propiedad directamente
  // vía ref en el mismo gesto de clic, que es lo único que garantiza que
  // el navegador lo respete.
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (!next) {
          // Algunos navegadores pausan/ignoran el cambio si no se pide
          // play() explícitamente dentro del mismo gesto del usuario.
          videoRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  };

  // 2026-08-23 (v4): Federico confirmó iPhone 12 (Safari). Encontrada la
  // causa real, distinta de las dos anteriores: hacíamos
  // `setHasStarted(true)` de INMEDIATO, sin esperar a que
  // `videoRef.current.play()` realmente tuviera éxito. En Safari/iOS el
  // video puede no tener todavía suficiente data buffereada en el primer
  // toque (no había `preload`) y `play()` puede rechazar la promesa en
  // ese primer intento aunque el gesto del usuario sea válido — pero como
  // igual ocultábamos el botón, el video quedaba pausado/negro Y sin
  // ningún botón grande para reintentar (solo quedaban SKIP y el mute
  // chico de la esquina). De ahí la sensación de "hay que golpear la
  // pantalla": el usuario termina tocando al azar hasta acertarle al
  // botón de mute (72x72, esquina) que sí usa un 'click' normal.
  // Fix: el botón de PLAY se oculta SOLO cuando play() confirma éxito;
  // si falla, se resetea startedRef y el botón sigue ahí para reintentar
  // con un toque normal. Se agrega preload="auto" al <video> para que
  // llegue con más buffer ya cargado. Se saca onPointerDown — 'click'
  // es el gesto que Safari reconoce de forma confiable para autoplay con
  // sonido; pointerdown no lo garantiza y podía disparar un intento con
  // gesto inválido que además consumía startedRef.
  const startedRef = React.useRef(false);
  const handleStartWithSound = () => {
    if (startedRef.current) return;
    startedRef.current = true;

    const el = document.documentElement;
    (async () => {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } catch {}
    })();

    const video = videoRef.current;
    if (!video) {
      setIsMuted(false);
      setHasStarted(true);
      return;
    }
    video.muted = false;
    const playResult = video.play();
    if (playResult && typeof playResult.then === "function") {
      playResult
        .then(() => {
          setIsMuted(false);
          setHasStarted(true);
        })
        .catch(() => {
          // No se pudo reproducir con sonido en este intento (típico en
          // Safari/iOS si el video todavía no tenía suficiente buffer).
          // Dejamos el botón visible para que el próximo toque reintente.
          startedRef.current = false;
        });
    } else {
      setIsMuted(false);
      setHasStarted(true);
    }
  };

  useEffect(() => {
    if (phase === "VIDEO") {
      onPhaseChange?.("VIDEO");
    } else if (phase === "CASILLAS") {
      onPhaseChange?.("CASILLAS");
      setCasillasStartRoll((prev) => prev ?? globalRollCount);
    } else {
      onPhaseChange?.("COMPLETE");
      onComplete?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const handleVideoEnd = () => {
    setTimeout(() => {
      setPhase("COMPLETE");
    }, 300);
  };

  const relativeRoll =
    casillasStartRoll != null ? globalRollCount - casillasStartRoll : 0;

  useEffect(() => {
    if (phase !== "CASILLAS") return;
    if (relativeRoll >= CASILLAS_FRAMES.length) {
      setPhase("COMPLETE");
    }
  }, [phase, relativeRoll]);

  const handleSkipIntro = () => {
    setPhase("COMPLETE");
    onSkip?.();
  };

  if (phase === "VIDEO" && VIDEO_SRC) {
    // 2026-08-24 — causa real de "la zona de activación está a la
    // izquierda de la corneta / hay que golpear la pantalla varias
    // veces": este overlay vivía DENTRO de .maraLayer, que a su vez
    // está dentro de .samsaraScene (1100x620, escalado con
    // `transform: scale(...)` para entrar en cada pantalla —
    // ver src/styles/layout.css). Con `position:absolute;inset:0` el
    // botón "TAP TO START" solo cubría esa caja de 1100x620 escalada,
    // NO la ventana real. .samsaraStage (el contenedor de afuera) tiene
    // fondo negro también, así que las franjas de letterbox (cuando la
    // ventana/pantalla no tiene la proporción 1100:620) se ven igual de
    // negras que este overlay — Federico las veía como parte de la
    // pantalla de "Tap to start", pero un click ahí no llegaba a caer
    // dentro del botón, solo funcionaba cerca del ícono central (que
    // por estar centrado en la caja escalada, coincide más o menos con
    // el centro de la ventana real). Fix: portal a document.body +
    // `position:fixed`, así este overlay entero (video + botones) queda
    // anclado a la ventana real, sin depender del escalado del
    // tablero — mismo patrón que ya se usó para MoveOptionsPanel, pero
    // acá SÍ conviene fixed+body (a diferencia de ese caso) porque no
    // hay arte del tablero con el que alinearse: es una pantalla negra
    // de intro, y ahora cubre la pantalla real de punta a punta.
    const overlay = (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "#000", display: "flex",
        alignItems: "center", justifyContent: "center",
        // .maraLayer ya no es el padre real en el DOM (ver portal más
        // abajo), pero se deja el override explícito por las dudas /
        // claridad de intención.
        pointerEvents: "auto",
      }}>
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          muted={isMuted}
          playsInline
          preload="auto"
          onEnded={handleVideoEnd}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <button
          type="button"
          onClick={handleSkipIntro}
          style={{
            position: "absolute",
            right: 20,
            top: 20,
            padding: "10px 18px",
            borderRadius: 999,
            border: "2px solid rgba(255,255,255,0.7)",
            background: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: "pointer",
            backdropFilter: "blur(2px)",
            zIndex: 3,
          }}
        >
          SKIP INTRO →
        </button>
        {hasStarted && (
          // 2026-08-24 — Federico (en Mac, con mouse) encontró que la zona
          // de click quedaba corrida hacia la IZQUIERDA del ícono visible
          // ("no sobre la corneta"). Se mueve todo el botón (ícono +
          // hitbox son el mismo elemento, así que viajan juntos) ~20px
          // hacia el centro/la rueda, para que quede más lejos del borde
          // — si sigue sin calzar, es cuestión de seguir ajustando este
          // `right`.
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Activar sonido" : "Silenciar"}
            title={isMuted ? "Activar sonido" : "Silenciar"}
            style={{
              position: "absolute",
              right: 40,
              bottom: 20,
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.7)",
              background: "rgba(0,0,0,0.55)",
              color: "#fff",
              fontSize: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              backdropFilter: "blur(2px)",
              boxShadow: isMuted
                ? "0 0 0 4px rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.6)"
                : "0 4px 16px rgba(0,0,0,0.6)",
              animation: isMuted ? "muteHintPulse 1.6s ease-in-out infinite" : "none",
              zIndex: 3,
            }}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
        )}

        {!hasStarted && (
          // 2026-08-23 (v2): Federico — la corneta sola no se entendía como
          // "toca para arrancar" ("debes ser demasiado intuitivo, no se
          // explica y es raro"). Se cambia el ícono central a un botón de
          // PLAY ▶ clásico (el símbolo que cualquier jugador reconoce de
          // inmediato) y se agranda/pone en mayúsculas bien grande el
          // texto "TAP TO START". La corneta 🔊 sigue abajo a la derecha
          // (aparece apenas arranca) para silenciar si se quiere — ese
          // botón chico nunca fue el que dispara el inicio.
          <button
            type="button"
            onClick={handleStartWithSound}
            aria-label="Tap to start"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 24,
              background: "rgba(0,0,0,0.92)",
              border: "none",
              cursor: "pointer",
              zIndex: 2,
              padding: 0,
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              style={{
                width: 140,
                height: 140,
                borderRadius: "50%",
                border: "3px solid rgba(255,255,255,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 10px rgba(255,255,255,0.14), 0 4px 28px rgba(0,0,0,0.7)",
                animation: "muteHintPulse 1.4s ease-in-out infinite",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              {/* Triángulo de PLAY dibujado en CSS puro — universalmente
                  reconocido, sin depender de que el emoji ▶️ se renderice
                  igual en todos los teléfonos. */}
              <span
                style={{
                  width: 0,
                  height: 0,
                  marginLeft: 10,
                  borderTop: "26px solid transparent",
                  borderBottom: "26px solid transparent",
                  borderLeft: "42px solid #fff",
                  filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
                }}
              />
            </span>
            <span
              style={{
                color: "#fff",
                fontFamily: "'Cinzel', Georgia, serif",
                fontWeight: 800,
                fontSize: 30,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                textAlign: "center",
                textShadow: "0 2px 10px rgba(0,0,0,0.85)",
              }}
            >
              Tap to start
            </span>
          </button>
        )}

      </div>
    );
    return typeof document !== "undefined"
      ? createPortal(overlay, document.body)
      : overlay;
  }

  if (phase === "CASILLAS" && CASILLAS_FRAMES.length > 0) {
    const idx = Math.min(relativeRoll, CASILLAS_FRAMES.length - 1);
    const img = CASILLAS_FRAMES[idx];
    if (!img) return null;
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 100, pointerEvents: "none"
      }}>
        <img
          key={idx} src={img} alt=""
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            transition: "opacity 0.5s ease",
          }}
        />
      </div>
    );
  }

  return null;
}

export default GenesisReveal;
