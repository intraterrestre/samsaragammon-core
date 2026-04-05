import type { CSSProperties } from "react";

export function getPawnMorphStyle(curvature: number): CSSProperties {
  const safe = Math.max(0, Math.min(100, curvature));

  const base: CSSProperties = {
    transition:
      "border-radius 220ms ease, clip-path 220ms ease, transform 220ms ease",
  };

  if (safe < 20) {
    return {
      ...base,
      borderRadius: "0%",
      clipPath: "none",
      transform: "scale(1)",
    };
  }

  if (safe < 40) {
    return {
      ...base,
      borderRadius: "18%",
      clipPath: "none",
      transform: "scale(1)",
    };
  }

  if (safe < 60) {
    return {
      ...base,
      borderRadius: "0%",
      clipPath:
        "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)",
      transform: "scale(1)",
    };
  }

  if (safe < 80) {
    return {
      ...base,
      borderRadius: "44% 56% 52% 48% / 48% 44% 56% 52%",
      clipPath: "none",
      transform: "scale(1)",
    };
  }

  return {
    ...base,
    borderRadius: "50%",
    clipPath: "none",
    transform: "scale(1)",
  };
}