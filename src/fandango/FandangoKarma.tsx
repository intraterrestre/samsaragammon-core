import "./fandango.css";
import karmaChatFandango from "./karma-chat-fandango.webp";

// v72 (28 agosto 2026) — pedido de Federico: activar Fandango de
// verdad. onClick ya no es un console.log stub — abre la ventana real
// (FandangoWindow, montada en GameShell.tsx junto a LedgerModal). Se
// quitó el onDoubleClick: un solo click ahora hace lo que antes hacía
// el doble click ("Open Fandango Chat"), no hace falta el paso extra.
type Props = {
  onOpen: () => void;
};

export function FandangoKarma({ onOpen }: Props) {
  return (
    <div className="fandangoRoot" onClick={onOpen}>
      <img
        src={karmaChatFandango}
        alt="Karma Chat Fandango"
        className="fandangoImage"
      />

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