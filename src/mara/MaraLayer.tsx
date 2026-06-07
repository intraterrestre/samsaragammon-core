import "./mara.css";
import samsaraPaintingPanel from "../../assets/samsara/samsara-painting-panel.png";

export function MaraLayer() {
  return (
    <div className="maraLayer">
      <img
        src={samsaraPaintingPanel}
        alt="Mara"
        className="maraPainting"
      />
    </div>
  );
}