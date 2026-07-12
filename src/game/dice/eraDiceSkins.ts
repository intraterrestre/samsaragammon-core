// src/game/dice/eraDiceSkins.ts
//
// GENESIS INTRO — DICE FAMILY SYSTEM (sprint scaffold)
//
// Each major era of the game will eventually have its own dice family,
// reinforcing the "the interface tells the story of human evolution" idea.
// This module is the single place that maps an era to the six face images
// used by the dice UI (DicePopup / Die). Swapping eras later is just adding
// a new entry here — no changes needed in the dice rendering components.
//
// The previous dice art (the white/black spinning "portal" images) is NOT
// deleted — see src/assets/dice/dice_white_portal.* and
// src/assets/dice/dice_black_portal.* — it's simply not the active skin
// right now. It stays available for a future era to reuse.

import type { EraId } from "../era";
import { CURRENT_ERA } from "../era";

import leafOne from "../../assets/dice/primitive/face_1.svg";
import leafTwo from "../../assets/dice/primitive/face_2.svg";
import cloverThree from "../../assets/dice/primitive/face_3.svg";
import cloverFour from "../../assets/dice/primitive/face_4.svg";
import leafFive from "../../assets/dice/primitive/face_5.svg";
import leafSix from "../../assets/dice/primitive/face_6.svg";

export type DiceFaceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DiceSkin {
  id: string;
  label: string;
  /** One image per face value 1-6, shown both while rolling and at rest. */
  faces: Record<DiceFaceValue, string>;
}

// Provisional Era 1 dice — inspired by 2.5 million years of nature: leaves
// and clovers standing in for pips. Placeholder art, not final design.
export const PRIMITIVE_DICE_SKIN: DiceSkin = {
  id: "primitive-leaves",
  label: "Primitive Era — Leaves & Clovers",
  faces: {
    1: leafOne,
    2: leafTwo,
    3: cloverThree,
    4: cloverFour,
    5: leafFive,
    6: leafSix,
  },
};

export const DICE_SKINS_BY_ERA: Record<EraId, DiceSkin> = {
  ignorance: PRIMITIVE_DICE_SKIN,
};

export function getActiveDiceSkin(era: EraId = CURRENT_ERA): DiceSkin {
  return DICE_SKINS_BY_ERA[era];
}
