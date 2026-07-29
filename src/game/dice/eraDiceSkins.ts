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
//
// The original placeholder leaf/clover SVGs (face_1.svg...face_6.svg) are
// also kept in src/assets/dice/primitive/ but are no longer imported here —
// replaced by the real carved-stone disc photos below.

import type { EraId } from "../era";
import { CURRENT_ERA } from "../era";

import discOne from "../../assets/dice/primitive/disco_1_hoja.webp";
import discTwo from "../../assets/dice/primitive/disco_2_hojas.webp";
import discThree from "../../assets/dice/primitive/disco_3_colmillos.webp";
import discFour from "../../assets/dice/primitive/disco_4_manos.webp";
import discFive from "../../assets/dice/primitive/disco_5_lanzas.webp";
import discSix from "../../assets/dice/primitive/disco_6_huesos.webp";

export type DiceFaceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DiceSkin {
  id: string;
  label: string;
  /** One image per face value 1-6, shown both while rolling and at rest. */
  faces: Record<DiceFaceValue, string>;
}

// Era 1 dice — carved stone/bone discs: 1 leaf, 2 leaves, 3 fangs, 4 hands,
// 5 spears, 6 bones. Real reference photos, dropped in by hand.
export const PRIMITIVE_DICE_SKIN: DiceSkin = {
  id: "primitive-stone-discs",
  label: "Primitive Era — Stone Discs",
  faces: {
    1: discOne,
    2: discTwo,
    3: discThree,
    4: discFour,
    5: discFive,
    6: discSix,
  },
};

export const DICE_SKINS_BY_ERA: Record<EraId, DiceSkin> = {
  ignorance: PRIMITIVE_DICE_SKIN,
};

export function getActiveDiceSkin(era: EraId = CURRENT_ERA): DiceSkin {
  return DICE_SKINS_BY_ERA[era];
}
