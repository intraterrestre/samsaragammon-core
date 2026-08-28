import "./fandango.css";
import karmaChatFandango from "./karma-chat-fandango.webp";

// v72 (28 agosto 2026) — pedido de Federico: activar Fandango de
// verdad. onClick ya no es un console.log stub — abre la ventana real
// (FandangoWindow, montada en GameShell.tsx junto a LedgerModal). Se
// quitó el onDoubleClick: un solo click ahora hace lo que antes hacía
// el doble click ("Open Fandango Chat"), no hace falta el paso extra.
//
// v74 (28 agosto 2026) — pedido de Federico: "no abriría Fandango
// automáticamente [...] pero cuando aparezca un link propio o una
// Nidana rival que necesitas, el logo hace un pequeño pulso". Se
// agrega hasNotification — GameShell.tsx ya calcula si
// computeOwnLinks/computeRivalOpportunities tienen algo para el
// jugador actual (mismas funciones que usa FandangoWindow) y lo pasa
// acá. Solo cambia el ícono; la ventana sigue abriéndose nada más que
// con el click, nunca sola.
//
// v75 (28 agosto 2026) — pedido de Federico: el punto solo no llamaba
// suficiente la atención — "ponle un efecto de vibración o pulsación
// o de latido [...] junto con ese sonido" (spray.mp3, ver
// fandangoSprayAudio en GameShell.tsx). Se agrega la clase
// fandangoImagePulsing sobre la imagen misma (latido en bucle vía
// CSS, ver fandango.css) mientras hasNotification siga en true; el
// sonido en sí suena una sola vez, en el flanco, desde GameShell.
type Props = {
  onOpen: () => void;
  hasNotification: boolean;
};

export function FandangoKarma({ onOpen, hasNotification }: Props) {
  return (
    <div className="fandangoRoot" onClick={onOpen}>
      <img
        src={karmaChatFandango}
        alt="Karma Chat Fandango"
        className={
          hasNotification ? "fandangoImage fandangoImagePulsing" : "fandangoImage"
        }
      />

      {hasNotification && <span className="fandangoPulseDot" aria-hidden="true" />}

      <div className="fandangoTooltip">
        <strong>CHAT FANDANGO™</strong>

        <div className="fandangoText">
          Messages, suspicious offers,
          <br />
          and karmic arrangements.
        </div>
      </div>
    </div>
  );
}