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
          <h1 style={styles.title}>{t("welcome.title")}</h1>
          <p style={styles.line}>{t("welcome.l1")}</p>
          <p style={styles.line}>
            <strong>{t("welcome.l2")}</strong>
          </p>
          <p style={{ ...styles.line, opacity: 0.85 }}>{t("welcome.l3")}</p>

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
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column" as const,
    zIndex: 9999,
    overflowY: "auto" as const,
  },
  video: {
    width: "55%",
    height: "auto",
    maxHeight: "70%",
    objectFit: "contain" as const,
    cursor: "pointer",
  },
  card: {
    maxWidth: 520,
    padding: "24px 22px",
    textAlign: "center" as const,
    color: "#efe6d2",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  title: {
    fontSize: "clamp(22px, 6vw, 34px)",
    lineHeight: 1.15,
    margin: "0 0 18px",
    color: "#f5d76e",
    letterSpacing: "0.02em",
  },
  line: {
    fontSize: "clamp(15px, 4.2vw, 18px)",
    lineHeight: 1.4,
    margin: "0 0 12px",
  },
  button: {
    marginTop: 14,
    height: 56,
    padding: "0 28px",
    borderRadius: 999,
    border: "1px solid rgba(245,215,110,0.7)",
    background: "rgba(245,215,110,0.16)",
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
