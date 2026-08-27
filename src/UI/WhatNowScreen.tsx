// src/UI/WhatNowScreen.tsx
//
// v68 (27 agosto 2026) — pedido de Federico: pantalla real "WHAT NOW?"
// que reemplaza el botón placeholder de "Play again" (ver
// VictoryScreen.tsx) cuando termina champion.mp4. Instrucción explícita
// de Federico: la imagen de Uthingo es SOLO arte de personaje — nada de
// mapear zonas clicables sobre la imagen ("no debe tratar la imagen del
// personaje como un mapa de imagen con zonas clicables"). El menú
// (título, subtítulos, botones, enlaces) se construye acá como
// HTML/CSS/React real, separado de la imagen, para poder cambiar texto,
// enlaces o sonidos más adelante sin rehacer el arte.
//
// Mapeo pedido por Federico:
//   REINCARNATE     -> onPlayAgain (mismo reset que ya usaba el botón viejo)
//   SEE YOUR TRACE   -> abre el FinalVestigium (buildFinalVestigium, ver
//                       game/Vestigium.ts) en una vista propia adentro
//                       de esta misma pantalla. Visualmente el más
//                       prominente: el dedo de Uthingo lo señala.
//   ENTER CURVISM    -> www.federicogarcia.art (URL real, pasada por
//                       Federico) — se abre en pestaña nueva
//                       (rel="noopener noreferrer") por ser un sitio
//                       externo, sin abandonar la partida actual.
//   INVITE A PLAYER   -> navigator.share() con fallback a
//                       navigator.clipboard.writeText() (copiar
//                       enlace). No había ningún mecanismo de invitación
//                       por enlace en el repo, solo join-by-code manual
//                       (Lobby.tsx) — no se inventa infraestructura de
//                       backend nueva, se usan las APIs nativas del
//                       navegador.
import { useState } from "react";
import uthingoImage from "../assets/intro/uthingo_what_now.webp";
import type { FinalVestigium } from "../game/Vestigium";
import "./WhatNowScreen.css";

type Props = {
  finalVestigium: FinalVestigium;
  onPlayAgain: () => void;
};

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function WhatNowScreen({ finalVestigium, onPlayAgain }: Props) {
  const [view, setView] = useState<"menu" | "trace">("menu");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "copied">("idle");

  const handleInvite = async () => {
    const shareData = {
      title: "Samsaragammon",
      text: "Want out of the Samsara wheel? Join me.",
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // El usuario canceló el share nativo, o no está disponible en
      // este navegador — cae al fallback de copiar el enlace.
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      setInviteStatus("copied");
      setTimeout(() => setInviteStatus("idle"), 2000);
    } catch {
      // clipboard también puede fallar (permisos, contexto no seguro).
      // No hay más fallback razonable — se deja como está, sin romper
      // la pantalla.
    }
  };

  return (
    <div className="whatNowOverlay">
      <div className="whatNowCharacter">
        <img
          src={uthingoImage}
          alt="Uthingo"
          className="whatNowCharacterImg"
        />
      </div>

      <div className="whatNowContent">
        {view === "menu" ? (
          <>
            <div className="whatNowHeader">WHAT NOW?</div>

            <div className="whatNowOptions">
              <button
                type="button"
                className="whatNowOption"
                onClick={onPlayAgain}
              >
                <span className="whatNowOptionTitle">REINCARNATE</span>
                <span className="whatNowOptionSubtitle">
                  Enter the wheel again.
                </span>
              </button>

              <button
                type="button"
                className="whatNowOption whatNowOptionPrimary"
                onClick={() => setView("trace")}
              >
                <span className="whatNowOptionTitle">SEE YOUR TRACE</span>
                <span className="whatNowOptionSubtitle">
                  See what happened in this Samsara.
                </span>
              </button>

              <a
                href="https://www.federicogarcia.art"
                target="_blank"
                rel="noopener noreferrer"
                className="whatNowOption"
              >
                <span className="whatNowOptionTitle">ENTER CURVISM</span>
                <span className="whatNowOptionSubtitle">
                  Discover why the circle matters.
                </span>
              </a>
            </div>

            <div className="whatNowFooter">
              <div className="whatNowFooterLine">
                YOU GOT OUT. WHO'S NEXT?
              </div>
              <button
                type="button"
                className="whatNowInviteButton"
                onClick={handleInvite}
              >
                {inviteStatus === "copied" ? "LINK COPIED" : "INVITE A PLAYER"}
              </button>
            </div>
          </>
        ) : (
          <div className="whatNowTrace">
            <div className="whatNowHeader">YOUR TRACE</div>

            <div className="whatNowTraceGrid">
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Result</span>
                <span className="whatNowTraceValue">
                  {finalVestigium.result === "nirvano"
                    ? "Nirvana reached"
                    : "Not reached"}
                </span>
              </div>
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Rolls</span>
                <span className="whatNowTraceValue">
                  {finalVestigium.rolls}
                </span>
              </div>
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Captures</span>
                <span className="whatNowTraceValue">
                  {finalVestigium.captures}
                </span>
              </div>
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Nidanas activated</span>
                <span className="whatNowTraceValue">
                  {finalVestigium.nidanasActivated}
                </span>
              </div>
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Visits to Mara</span>
                <span className="whatNowTraceValue">
                  {finalVestigium.maraVisits}
                </span>
              </div>
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Avatars in Humans</span>
                <span className="whatNowTraceValue">
                  {finalVestigium.avatarsInHumans}/6
                </span>
              </div>
              <div className="whatNowTraceRow">
                <span className="whatNowTraceLabel">Duration</span>
                <span className="whatNowTraceValue">
                  {formatDuration(finalVestigium.durationMs)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="whatNowBackButton"
              onClick={() => setView("menu")}
            >
              BACK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatNowScreen;
