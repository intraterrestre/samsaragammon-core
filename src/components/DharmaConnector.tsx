// DharmaConnector.tsx
import React from 'react';
import './DharmaConnector.css';

interface DharmaConnectorProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

const DharmaConnector: React.FC<DharmaConnectorProps> = ({ fromX, fromY, toX, toY }) => {
  const c1x = fromX + (toX - fromX) * 0.5;
  const c1y = fromY;
  const c2x = fromX + (toX - fromX) * 0.5;
  const c2y = toY;

  const path = `M ${fromX} ${fromY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${toX} ${toY}`;

  return (
    <svg
      className="dharma-connector"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="dharma-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        filter="url(#dharma-glow)"
      />
    <path
  className="dharma-connector-path"
  d={path}
  fill="none"
  stroke="rgba(255,255,255,0.65)"
  strokeWidth="1.5"
  vectorEffect="non-scaling-stroke"
  filter="url(#dharma-glow)"
/>
</svg>
);
};

export default DharmaConnector;