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

// 2026-08-22: "1000mm of human history" — el reverso de la moneda del
// Reino Humano (primer avatar, Bruno) ya trae grabado "In the last 4mm
// of human history" (ver src/assets/coin_human_back.webp). Federico
// pidió una regla de un metro bajo el cuadro de Genesis que muestre esa
// misma desproporción brutal (996mm Paleolítico+Neolítico vs 4mm Edad
// de los Metales a hoy) — usamos ese mismo asset existente en vez de
// crear un token nuevo, para no duplicar el mensaje con arte distinto.
import coinHumanBack from "../assets/coin_human_back.webp";

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
    return (
      <div style={{
        position: "absolute", inset: 0, zIndex: 9999,
        background: "#000", display: "flex",
        alignItems: "center", justifyContent: "center",
        // 2026-08-05: .maraLayer (contenedor padre) tiene
        // pointer-events: none en CSS, y esa propiedad se hereda — sin
        // este override el botón de mute nunca recibía clics ni hover
        // (icono "muerto" aunque se viera bien). Reactivamos eventos
        // de puntero explícitamente para este overlay.
        pointerEvents: "auto",
      }}>
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          muted={isMuted}
          playsInline
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
          }}
        >
          SKIP INTRO →
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={isMuted ? "Activar sonido" : "Silenciar"}
          title={isMuted ? "Activar sonido" : "Silenciar"}
          style={{
            position: "absolute",
            right: 20,
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
          }}
        >
          {isMuted ? "🔇" : "🔊"}
        </button>

        {/* "1000mm of human history" — regla proporcional 996mm/4mm.
            Vive solo aquí, dentro del video de Genesis, junto al botón
            SKIP INTRO ya existente: se ve una vez por partida y quien ya
            conoce la idea la salta con el resto del intro. */}
        <style>{`
          @keyframes genesisRulerGlow {
            0%, 100% { box-shadow: 0 0 6px 1px rgba(255, 43, 43, 0.55); }
            50% { box-shadow: 0 0 14px 4px rgba(255, 43, 43, 0.9); }
          }
        `}</style>
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 112,
          padding: "14px 28px 0",
          fontFamily: "'Cinzel', Georgia, serif",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <img
                src={coinHumanBack}
                alt=""
                style={{ width: 32, height: 32, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))" }}
              />
              <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                One Meter of Time
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9.5, letterSpacing: "0.16em", textTransform: "uppercase" }}>
              1000mm of human history
            </span>
          </div>

          <div style={{ position: "relative" }}>
            {/* Zoom callout: ancla al borde derecho de la barra, donde
                vive el segmento rojo — nunca a un offset arbitrario. */}
            <div style={{
              position: "absolute", right: 0, bottom: "calc(100% + 12px)", width: 214,
              background: "rgba(12,10,14,0.95)", border: "1px solid rgba(255,43,43,0.5)",
              borderRadius: 3, padding: "9px 11px", boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
            }}>
              <div style={{ color: "#ff2b2b", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>
                4mm, magnified
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12.5, fontStyle: "italic", fontFamily: "Georgia, serif", lineHeight: 1.35 }}>
                Metal Age to now — empires, borders, screens, this exact turn.
              </div>
              <div style={{
                position: "absolute", right: 12, bottom: -8, width: 14, height: 14,
                background: "rgba(12,10,14,0.95)",
                borderRight: "1px solid rgba(255,43,43,0.5)", borderBottom: "1px solid rgba(255,43,43,0.5)",
                transform: "rotate(45deg)",
              }} />
            </div>

            {/* La barra: proporción real 996:4 vía flex-grow, no ancho fijo. */}
            <div style={{ display: "flex", width: "100%", height: 30, borderRadius: 2, overflow: "hidden", border: "1px solid rgba(255,255,255,0.16)" }}>
              <div style={{ flex: "996 0 0", position: "relative", background: "linear-gradient(180deg,#302f33,#201f23)", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", inset: 0,
                  backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0, rgba(255,255,255,0.09) 1px, transparent 1px, transparent 22px)",
                }} />
                <span style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.7)", fontSize: 12, fontStyle: "italic",
                  fontFamily: "Georgia, serif", whiteSpace: "nowrap",
                }}>
                  Palaeolithic + Neolithic — same brain, same instinct
                </span>
              </div>
              <div style={{ flex: "4 0 0", minWidth: 5, background: "#ff2b2b", animation: "genesisRulerGlow 2.2s ease-in-out infinite" }} />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              0mm — walking upright
            </span>
            <span style={{ color: "#ff2b2b", fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              996 → 1000mm — metal age to today
            </span>
          </div>
        </div>
      </div>
    );
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
