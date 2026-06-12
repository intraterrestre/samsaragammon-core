import { useEffect, useRef, useState } from "react";
import "./mara.css";
import samsaraPaintingPanel from "../assets/samsara/samsara-painting-panel.png";
import DharmaBubble from "../components/DharmaBubble";
import DharmaConnector from "../components/DharmaConnector";

interface MaraLayerProps {
  dharmaMessage?: string;
}

export function MaraLayer({ dharmaMessage = "" }: MaraLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const [connectorEnd, setConnectorEnd] = useState({
    x: 36,
    y: 63,
  });

  useEffect(() => {
    function updateConnector() {
      const layer = layerRef.current;
      const bubble = bubbleRef.current;

      if (!layer || !bubble) return;

      const layerRect = layer.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();

      const bubbleBottomCenterX =
        bubbleRect.left + bubbleRect.width / 2 - layerRect.left;

      const bubbleBottomCenterY =
        bubbleRect.bottom - layerRect.top;

      setConnectorEnd({
        x: (bubbleBottomCenterX / layerRect.width) * 100,
        y: (bubbleBottomCenterY / layerRect.height) * 100,
      });
    }

    updateConnector();

    window.addEventListener("resize", updateConnector);

    return () => {
      window.removeEventListener("resize", updateConnector);
    };
  }, [dharmaMessage]);

  return (
    <div ref={layerRef} className="maraLayer">
      <img
        src={samsaraPaintingPanel}
        alt="Samsara Painting"
        className="maraPainting"
      />

      <DharmaConnector
        fromX={45}
        fromY={76}
        toX={connectorEnd.x}
        toY={connectorEnd.y}
      />

      <DharmaBubble
        ref={bubbleRef}
        message={dharmaMessage}
      />
    </div>
  );
}

export default MaraLayer;