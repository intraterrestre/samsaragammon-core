// src/game/dice/stoneDiceStyle.ts
//
// Shared CSS values for the Primitive Era "carved stone" dice look, used by
// both the result dice (DicePopup) and the roll-trigger button icon (Board).
// There's no real photo texture available yet — this is a CSS approximation
// (mottled radial-gradient sphere) styled after the two reference stones:
// tan/ochre for White, charcoal-grey for Black. Swap these for actual photo
// textures later without touching the components that use them.

export const STONE_GRADIENT = {
  white: "radial-gradient(circle at 32% 26%, #d9b579 0%, #b98f52 32%, #8a683c 62%, #5f452a 100%)",
  black: "radial-gradient(circle at 32% 26%, #6e6a64 0%, #4c4944 32%, #322f2b 62%, #1c1a18 100%)",
} as const;

export const STONE_RING = {
  white: "rgba(70,45,20,0.45)",
  black: "rgba(0,0,0,0.55)",
} as const;

export const STONE_SHADOW =
  "0 6px 14px rgba(0,0,0,0.55), inset 0 -6px 10px rgba(0,0,0,0.35), inset 0 4px 6px rgba(255,255,255,0.12)";
