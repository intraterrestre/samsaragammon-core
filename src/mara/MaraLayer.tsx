import { useEffect, useRef, useState } from "react";
import "./mara.css";
import samsaraPaintingPanel from "../assets/samsara/samsara-painting-panel.webp";
import DharmaBubble from "../components/DharmaBubble";
import DharmaConnector from "../components/DharmaConnector";
import { GenesisReveal } from "./GenesisReveal";
import type { RealmPieceKind } from "../game/types";

interface MaraLayerProps {
  dharmaMessage?: string;
  realmStep?: number;
  lastRealmKey?: RealmPieceKind | null;
  globalRollCount?: number;
  genesisComplete?: boolean;
  onGenesisComplete?: () => void;
}

export function MaraLayer({
  dharmaMessage = "",
  realmStep = 1,
  lastRealmKey = null,
  globalRollCount = 0,
  genesisComplete = false,
  onGenesisComplete,
}: MaraLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const [connectorEnd, setConnectorEnd] = useState({ x: 36, y: 63 });

  useEffect(() => {
    function updateConnector() {
      const layer = layerRef.current;
      const bubble = bubbleRef.current;
      if (!layer || !bubble) return;
      const layerRect = layer.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();
      setConnectorEnd({
        x: ((bubbleRect.left + bubbleRect.width / 2 - layerRect.left) / layerRect.width) * 100,
        y: ((bubbleRect.bottom - layerRect.top) / layerRect.height) * 100,
      });
    }
    updateConnector();
    window.addEventListener("resize", updateConnector);
    return () => window.removeEventListener("resize", updateConnector);
  }, [dharmaMessage]);

  return (
    <div ref={layerRef} className="maraLayer">
      <img
        src={samsaraPaintingPanel}
        alt="Samsara Painting"
        className="maraPainting"
      />

      {/* v2: Genesis — import.meta.glob resuelve assets en build y runtime */}
      {!genesisComplete && (
        <GenesisReveal
          globalRollCount={globalRollCount}
          realmStep={realmStep}
          onComplete={onGenesisComplete}
        />
      )}

      <DharmaConnector
        fromX={46}
        fromY={79}
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
