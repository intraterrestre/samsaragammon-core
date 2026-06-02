import "./fandango.css";
import karmaChatFandango from "./karma-chat-fandango.png";

export function FandangoKarma() {
  return (
    <div
      className="fandangoRoot"
      onClick={() => {
        console.log("Fandango banner");
      }}
      onDoubleClick={() => {
        console.log("Open Fandango Chat");
      }}
    >
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