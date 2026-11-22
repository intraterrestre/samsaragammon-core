// src/UI/Intro.tsx — pantalla de entrada.
//
// 20 nov 2026 — ANTIZOMBIES (aprobado por Federico): la primera pantalla
// ya no es "The wheel is still / Turn the Wheel" en inglés fijo. Es una
// bienvenida breve, en el idioma del juego (el elegido antes o el del
// teléfono), con el selector de idioma arriba para cambiarlo antes de
// leer. La comparación con Backgammon más larga es opcional (un toque).
//
// El botón ¡DESPIERTA LA RUEDA! es además el toque que Safari necesita
// para dejar sonar el audio: con él arranca el video corto de la rueda
// (4 s, se puede saltar tocando) y después el juego.
import BrandWordmark from "./BrandWordmark";
import React from "react";
import introShort from "../assets/video/intro_short.mp4";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { markReadySplashDone } from "./readySplashState";

export default function Intro({ onEnd }: { onEnd: () => void }) {
  const { t } = useI18n();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);

  const finish = () => {
    // La bienvenida ya hizo de "READY TO PLAY": no repetir otra pantalla.
    markReadySplashDone();
    onEnd();
  };

  const start = async () => {
    setStarted(true);
    const v = videoRef.current;
    if (!v) return finish();
    try {
      v.muted = false;
      v.volume = 1;
      await v.play();
    } catch {
      finish(); // sin video (o bloqueado): directo al juego
    }
  };

  return (
    <div style={styles.container}>
      <video
        ref={videoRef}
        src={introShort}
        playsInline
        onEnded={finish}
        onClick={finish}
        style={{ ...styles.video, display: started ? "block" : "none" }}
      />

      {!started && (
        <div style={styles.card}>
          <div style={{ marginBottom: 18 }}>
            <LanguageSwitch />
          </div>
          {/* 21 nov 2026 — Federico: "A PAINTING YOU CAN PLAY". El texto vive
              en welcome.body: una línea por párrafo; **...** = destacada,
              ~ al principio = nota más suave. */}
          <div style={styles.kicker}>
            <BrandWordmark size={17} />
          </div>
          <h1 style={styles.title}>{t("welcome.title")}</h1>
          {t("welcome.body")
            .split("\n")
            .filter(Boolean)
            .map((line, i) => {
              const strong = /^\*\*(.*)\*\*$/.exec(line);
              const soft = line.startsWith("~");
              return (
                <p
                  key={i}
                  style={{
                    ...styles.line,
                    ...(strong ? styles.strongLine : null),
                    ...(soft ? { opacity: 0.8, marginTop: 16 } : null),
                  }}
                >
                  {strong ? strong[1] : soft ? line.slice(1) : line}
                </p>
              );
            })}

          <button type="button" onClick={start} style={styles.button}>
            {t("welcome.go")}
          </button>

          <button type="button" onClick={() => setMoreOpen((v) => !v)} style={styles.more}>
            {t("welcome.moreAsk")}
          </button>
          {moreOpen && <p style={styles.moreText}>{t("welcome.moreText")}</p>}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "fixed" as const,
    inset: 0,
    background: "black",
    display: "flex",
    // 21 nov 2026 — el texto de bienvenida es más largo: en un iPhone
    // horizontal no cabe. Con justifyContent:center la parte de arriba
    // quedaba cortada y sin poder subir; margin:auto en los hijos centra
    // cuando hay sitio y deja desplazar cuando no.
    justifyContent: "flex-start",
    alignItems: "center",
    flexDirection: "column" as const,
    zIndex: 9999,
    overflowY: "auto" as const,
    WebkitOverflowScrolling: "touch" as const,
  },
  video: {
    margin: "auto 0",
    width: "55%",
    height: "auto",
    maxHeight: "70%",
    objectFit: "contain" as const,
    cursor: "pointer",
  },
  card: {
    margin: "auto 0",
    maxWidth: 520,
    padding: "24px 22px",
    textAlign: "center" as const,
    color: "#efe6d2",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  kicker: {
    display: "flex",
    justifyContent: "center",
    margin: "0 0 10px",
  },
  strongLine: {
    color: "#f5d76e",
    fontWeight: 700,
    letterSpacing: "0.03em",
  },
  title: {
    fontSize: "clamp(20px, min(6vw, 7vh), 34px)",
    lineHeight: 1.15,
    margin: "0 0 16px",
    color: "#f5d76e",
    letterSpacing: "0.02em",
  },
  line: {
    fontSize: "clamp(13px, min(3.8vw, 4.2vh), 17px)",
    lineHeight: 1.35,
    margin: "0 0 8px",
  },
  button: {
    // 21 nov 2026 — en un iPhone horizontal el texto no cabe entero: el
    // botón se queda pegado abajo mientras se lee, siempre a mano.
    position: "sticky" as const,
    bottom: "max(12px, env(safe-area-inset-bottom))",
    zIndex: 1,
    boxShadow: "0 0 0 10px rgba(0,0,0,0.9), 0 -16px 26px rgba(0,0,0,0.95), 0 16px 26px rgba(0,0,0,0.95)",
    marginTop: 14,
    height: 56,
    padding: "0 28px",
    borderRadius: 999,
    border: "1px solid rgba(245,215,110,0.7)",
    background: "#2a2412",
    color: "#ffe9a8",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "0.08em",
    cursor: "pointer",
  },
  more: {
    display: "block",
    margin: "18px auto 0",
    background: "none",
    border: "none",
    color: "rgba(239,230,210,0.7)",
    fontSize: 13,
    textDecoration: "underline",
    cursor: "pointer",
  },
  moreText: {
    fontSize: 14,
    lineHeight: 1.45,
    margin: "10px 0 0",
    opacity: 0.85,
  },
};
