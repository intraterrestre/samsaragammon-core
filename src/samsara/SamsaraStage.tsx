import MaraLayer from "../mara/MaraLayer";

type SamsaraStageProps = {
  dharmaMessage?: string;
};

export function SamsaraStage({
  dharmaMessage,
}: SamsaraStageProps) {
  return (
    <MaraLayer
      dharmaMessage={dharmaMessage}
    />
  );
}

export default SamsaraStage;