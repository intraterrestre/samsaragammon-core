import React from "react";
import introShort from "../assets/video/intro_short.mp4";

export default function Intro({ onEnd }: { onEnd: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = React.useState(false);

  const startIntro = async () => {
    if (!videoRef.current) return;

    try {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      await videoRef.current.play();
      setStarted(true);
    } catch (err) {
      console.warn("INTRO PLAY FAILED:", err);
    }
  };

  return (
    <div style={styles.container}>
      <video
        ref={videoRef}
        src={introShort}
        playsInline
        onEnded={onEnd}
        style={styles.video}
      />

      {!started && (
        <>
          <div style={styles.subtitle}>
            The wheel is still.
          </div>

          <button onClick={startIntro} style={styles.button}>
            Turn the Wheel
          </button>
        </>
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
    gap: 18,
    zIndex: 9999,
  },

  video: {
    width: "55%",
    height: "auto",
    maxHeight: "70%",
    objectFit: "contain" as const,
  },

  subtitle: {
    fontSize: 13,
    opacity: 0.7,
    letterSpacing: "0.08em",
    color: "rgba(255,255,255,0.7)",
  },

  button: {
    height: 52,
    padding: "0 22px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.95)",
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.12em",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  },
};