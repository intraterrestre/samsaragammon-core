// src/UI/VictoryScreen.tsx
// v34 (12 agosto 2026) — hueco real confirmado: state.winner ya se
// calculaba correctamente (checkNirvana, reducer.ts) pero ningún lugar
// de la interfaz lo leía — el jugador podía cumplir la condición real
// de victoria sin que el juego se lo dijera nunca. Esta pantalla es
// puramente de interfaz: no toca la regla de victoria, el reducer, ni
// checkNirvana — solo reacciona a un valor que ya existía.
// v68 (27 agosto 2026) — pedido de Federico: quitado el cartel negro
// ("Nirvana reached" / "X has completed the cycle") — en su lugar se
// reproduce el video de cierre que produjo (champion.mp4, contrapunto
// de genesis_dados.mp4: "ya pusimos el genesis... este es el
// apocalipsis"). Reutiliza el mismo patrón visual y de mute/unmute que
// ya usan los videos de entrada de Avatar (.realmIntroOverlay/
// .realmIntroVideo, ver overlays.css y activeRealmIntro en App.tsx) en
// vez de inventar uno nuevo. `winner` queda en Props sin usarse
// todavía — Federico va a pasar el siguiente cartel (con las ofertas
// para los jugadores) para mostrar cuando el video termina; por ahora
// ese momento es solo un botón mínimo de "Play again", placeholder
// hasta que llegue ese cartel.
import { useRef, useState } from "react";
import championVideo from "../assets/video/champion.mp4";
import type { PlayerId } from "../game/types";

type Props = {
  winner: PlayerId;
  onPlayAgain: () => void;
};

export function VictoryScreen(props: Props) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="realmIntroOverlay" style={{ pointerEvents: "auto" }}>
      <video
        ref={videoRef}
        className="realmIntroVideo"
        src={championVideo}
        autoPlay
        playsInline
        muted={muted}
        onEnded={() => setVideoEnded(true)}
      />

      {!videoEnded && (
        <button
          type="button"
          onClick={() => {
            setMuted((prev) => {
              const next = !prev;
              if (videoRef.current) {
                videoRef.current.muted = next;
                if (!next) videoRef.current.play().catch(() => {});
              }
              return next;
            });
          }}
          aria-label={muted ? "Activar sonido" : "Silenciar"}
          title={muted ? "Activar sonido" : "Silenciar"}
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
            zIndex: 1000000,
            pointerEvents: "auto",
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {/* v68 — placeholder: acá va el cartel con las ofertas para los
          jugadores que Federico todavía tiene que pasar. Mientras
          tanto, solo un botón mínimo para volver a jugar — sin caja
          negra ni texto de "Nirvana reached". */}
      {videoEnded && (
        <button
          type="button"
          onClick={props.onPlayAgain}
          style={{
            position: "absolute",
            padding: "12px 28px",
            borderRadius: 12,
            border: "2px solid rgba(255,220,140,0.7)",
            background: "rgba(255,220,140,0.12)",
            color: "white",
            fontSize: 16,
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 0 16px rgba(255,220,140,0.35)",
            zIndex: 1000000,
          }}
        >
          Play again
        </button>
      )}
    </div>
  );
}

export default VictoryScreen;
