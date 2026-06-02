import React from "react";

const LEFT_EYE = {
  x: 110,
  y: -15,
  rotate: -8,
};

const RIGHT_EYE = {
  x: 143,
  y: -15,
  rotate: -8,
};
function EyeCell() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        borderRadius: 4,
        border: "1px solid rgba(255,255,255,.25)",
        background: "rgba(0,0,0,.25)",
      }}
    />
  );
}
type EyeRailProps = {
  x: number;
  y: number;
  rotate?: number;
};

function EyeRail({
  x,
  y,
  rotate = 0,
}: EyeRailProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transform: `rotate(${rotate}deg)`,
        transformOrigin: "top center",
      }}
    >
  <EyeCell />
<EyeCell />
<EyeCell />
<EyeCell />
<EyeCell />
<EyeCell />
    </div>
  );
}

export function MaraPanel() {
  return (
    <>
      <EyeRail
        x={LEFT_EYE.x}
        y={LEFT_EYE.y}
        rotate={LEFT_EYE.rotate}
      />

      <EyeRail
        x={RIGHT_EYE.x}
        y={RIGHT_EYE.y}
        rotate={RIGHT_EYE.rotate}
      />
    </>
  );
}