import samsaraPaintingPanel from "../assets/samsara/samsara-painting-panel.png";

export function SamsaraStage() {
  return (
    <div className="samsaraAltar">
      <img
        src={samsaraPaintingPanel}
        alt="Samsara Stage"
        className="samsaraPainting"
      />
    </div>
  );
}