// src/game/dice/eraDiceSkins.ts
// Era 1 — Primitive: piedras reales con puntos tallados
// P1 (White) → stone_white_1..6.webp
// P2 (Black) → stone_black_1..6.webp

import type { EraId } from "../era";
import { CURRENT_ERA } from "../era";

// Piedras blancas — P1
import stoneWhite1 from "../../assets/dice/stone_white_1.webp";
import stoneWhite2 from "../../assets/dice/stone_white_2.webp";
import stoneWhite3 from "../../assets/dice/stone_white_3.webp";
import stoneWhite4 from "../../assets/dice/stone_white_4.webp";
import stoneWhite5 from "../../assets/dice/stone_white_5..webp";
import stoneWhite6 from "../../assets/dice/stone_white_6.webp";

// Piedras negras — P2
import stoneBlack1 from "../../assets/dice/stone_black_1.webp";
import stoneBlack2 from "../../assets/dice/stone_black_2 .webp";
import stoneBlack3 from "../../assets/dice/stone_black_3.webp";
import stoneBlack4 from "../../assets/dice/stone_black_4.webp";
import stoneBlack5 from "../../assets/dice/stone_black_5.webp";
import stoneBlack6 from "../../assets/dice/stone_black_6.webp";

export type DiceFaceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DiceSkin {
  id: string;
  label: string;
  faces: Record<DiceFaceValue, string>;
}

export const PRIMITIVE_WHITE_SKIN: DiceSkin = {
  id: "primitive-stone-white",
  label: "Primitive Era — Stone White (P1)",
  faces: {
    1: stoneWhite1,
    2: stoneWhite2,
    3: stoneWhite3,
    4: stoneWhite4,
    5: stoneWhite5,
    6: stoneWhite6,
  },
};

export const PRIMITIVE_BLACK_SKIN: DiceSkin = {
  id: "primitive-stone-black",
  label: "Primitive Era — Stone Black (P2)",
  faces: {
    1: stoneBlack1,
    2: stoneBlack2,
    3: stoneBlack3,
    4: stoneBlack4,
    5: stoneBlack5,
    6: stoneBlack6,
  },
};

export const DICE_SKINS_BY_ERA: Record<EraId, DiceSkin> = {
  ignorance:    PRIMITIVE_WHITE_SKIN,
  formations:   PRIMITIVE_WHITE_SKIN,
  consciousness: PRIMITIVE_WHITE_SKIN,
};

// v2: skin distinta según jugador
export function getActiveDiceSkin(
  era: EraId = CURRENT_ERA,
  player: "P1" | "P2" = "P1"
): DiceSkin {
  if (player === "P2") return PRIMITIVE_BLACK_SKIN;
  return DICE_SKINS_BY_ERA[era] ?? PRIMITIVE_WHITE_SKIN;
}
