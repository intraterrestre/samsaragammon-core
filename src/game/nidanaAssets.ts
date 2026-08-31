// src/game/nidanaAssets.ts
// Paso 1 (26 agosto 2026) — mapa de arte real de las 12 Nidanas (solo
// cara frontal por ahora — el dorso no hace falta todavia para
// aparicion/recoleccion, se agrega si un paso futuro lo pide).
//
// Nota real encontrada en disco, no inventada: el archivo de la
// posicion 10 se llama "nidana_10_identity_front.webp" en vez de
// "becoming" (el NidanaId real en nidanas.ts/types.ts es BECOMING,
// consistente con el orden budista canonico de los 12 Nidanas) — el
// indice numerico SI esta bien alineado, solo la palabra despues del
// numero no coincide con el id. Se preserva el nombre de archivo tal
// cual esta, mapeado por indice/id, no se renombra nada en disco.
// "nidana_01_ignorance_front" ademas tiene un espacio real antes de
// ".webp" en el nombre de archivo en disco (" .webp") — tambien se
// preserva tal cual, no es un error de tipeo de esta importacion.
import nidanaFrontIgnorance from "../assets/nidanas/nidana_01_ignorance_front .webp";
import nidanaFrontFormations from "../assets/nidanas/nidana_02_formations_front.webp";
import nidanaFrontConsciousness from "../assets/nidanas/nidana_03_consciousness_front.webp";
import nidanaFrontNameForm from "../assets/nidanas/nidana_04_name_form_front.webp";
import nidanaFrontSixSenses from "../assets/nidanas/nidana_05_six_senses_front.webp";
import nidanaFrontContact from "../assets/nidanas/nidana_06_contact_front.webp";
import nidanaFrontFeeling from "../assets/nidanas/nidana_07_feeling_front.webp";
import nidanaFrontCraving from "../assets/nidanas/nidana_08_craving_front.webp";
import nidanaFrontClinging from "../assets/nidanas/nidana_09_clinging_front.webp";
import nidanaFrontBecoming from "../assets/nidanas/nidana_10_identity_front.webp";
import nidanaFrontBirth from "../assets/nidanas/nidana_11_birth_front.webp";
import nidanaFrontDeath from "../assets/nidanas/nidana_12_death_front.webp";

import type { NidanaId } from "./nidanas";

export const NIDANA_FRONT_IMAGE: Record<NidanaId, string> = {
  IGNORANCE: nidanaFrontIgnorance,
  FORMATIONS: nidanaFrontFormations,
  CONSCIOUSNESS: nidanaFrontConsciousness,
  NAME_AND_FORM: nidanaFrontNameForm,
  SIX_SENSES: nidanaFrontSixSenses,
  CONTACT: nidanaFrontContact,
  FEELING: nidanaFrontFeeling,
  CRAVING: nidanaFrontCraving,
  CLINGING: nidanaFrontClinging,
  BECOMING: nidanaFrontBecoming,
  BIRTH: nidanaFrontBirth,
  DEATH: nidanaFrontDeath,
};

// v78 (31 agosto 2026) — reverso de cada Nidana, pedido de Federico:
// el popup que abre el arte real en grande (enlargedNidana, ver
// Board.tsx) va a mostrar frente Y reverso juntos dentro de un óvalo,
// no solo el frente como hasta ahora. Mismos archivos en disco que ya
// existian para el frente (misma carpeta, mismo indice/id, sufijo
// "_back" en vez de "_front") — no hacia falta generar arte nuevo.
import nidanaBackIgnorance from "../assets/nidanas/nidana_01_ignorance_back.webp";
import nidanaBackFormations from "../assets/nidanas/nidana_02_formations_back.webp";
import nidanaBackConsciousness from "../assets/nidanas/nidana_03_consciousness_back.webp";
import nidanaBackNameForm from "../assets/nidanas/nidana_04_name_form_back.webp";
import nidanaBackSixSenses from "../assets/nidanas/nidana_05_six_senses_back.webp";
import nidanaBackContact from "../assets/nidanas/nidana_06_contact_back.webp";
import nidanaBackFeeling from "../assets/nidanas/nidana_07_feeling_back.webp";
import nidanaBackCraving from "../assets/nidanas/nidana_08_craving_back.webp";
import nidanaBackClinging from "../assets/nidanas/nidana_09_clinging_back.webp";
import nidanaBackBecoming from "../assets/nidanas/nidana_10_identity_back.webp";
import nidanaBackBirth from "../assets/nidanas/nidana_11_birth_back.webp";
import nidanaBackDeath from "../assets/nidanas/nidana_12_death_back.webp";

export const NIDANA_BACK_IMAGE: Record<NidanaId, string> = {
  IGNORANCE: nidanaBackIgnorance,
  FORMATIONS: nidanaBackFormations,
  CONSCIOUSNESS: nidanaBackConsciousness,
  NAME_AND_FORM: nidanaBackNameForm,
  SIX_SENSES: nidanaBackSixSenses,
  CONTACT: nidanaBackContact,
  FEELING: nidanaBackFeeling,
  CRAVING: nidanaBackCraving,
  CLINGING: nidanaBackClinging,
  BECOMING: nidanaBackBecoming,
  BIRTH: nidanaBackBirth,
  DEATH: nidanaBackDeath,
};
