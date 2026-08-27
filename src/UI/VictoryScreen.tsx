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
// vez de inventar uno nuevo.
// v68b (27 agosto 2026) — llegó el "cartel" real: cuando el video
// termina ya no se muestra un botón placeholder, se muestra el menú
// "WHAT NOW?" (ver WhatNowScreen.tsx) con Uthingo señalando las
// opciones. `winner` sigue en Props porque GameShell lo usa como
// gatillo de montaje ({state.winner && <VictoryScreen winner={...} />})
// — el resultado a MOSTRAR ya viene resuelto adentro de
// `finalVestigium` (buildFinalVestigium ya sabe cuál jugador ganó).
import { useRef, useState } from "react";
import championVideo from "../assets/video/champion.mp4";
import type { PlayerId } from "../game/types";
import type { FinalVestigium } from "../game/Vestigium";
import { WhatNowScreen } from "./WhatNowScreen";

type Props = {
  winner: PlayerId;
  finalVestigium: FinalVestigium;
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

      {videoEnded && (
        <WhatNowScreen
          finalVestigium={props.finalVestigium}
          onPlayAgain={props.onPlayAgain}
        />
      )}
    </div>
  );
}

export default VictoryScreen;
