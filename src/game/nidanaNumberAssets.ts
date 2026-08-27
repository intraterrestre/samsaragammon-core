// src/game/nidanaNumberAssets.ts
// v71 (27 agosto 2026) — pedido de Federico: "desde pantallas chicas no
// se ven las diferencias" entre las 12 Nidanas — el arte real
// (NIDANA_FRONT_IMAGE, ver nidanaAssets.ts) se dibuja a 30x30px suelta
// en el tablero y a 18x18px cargada por un Avatar; a ese tamaño, 12
// ilustraciones detalladas son indistinguibles entre sí. Federico armó
// 12 monedas numeradas (carpeta "nidana numbers") como reemplazo visual
// PEQUEÑO — un número grande se lee de un vistazo aunque el ícono no.
// El arte real (NIDANA_FRONT_IMAGE) sigue existiendo y se usa en la
// vista ampliada al hacer click (ver Board.tsx, enlargedNidana) — estas
// monedas numeradas NO la reemplazan, la complementan.
//
// Mismo criterio que nidanaAssets.ts para el mapeo: por índice/id, no
// por el nombre del archivo. La posición 10 en disco también dice
// "identity" en vez de "becoming" acá (mismo origen que el set
// anterior) — se preserva el nombre de archivo tal cual, se mapea por
// índice a BECOMING igual que ya hace NIDANA_FRONT_IMAGE.
import nidanaNumber01 from "../assets/nidana numbers/01_ignorance.webp";
import nidanaNumber02 from "../assets/nidana numbers/02_formations.webp";
import nidanaNumber03 from "../assets/nidana numbers/03_consciousness.webp";
import nidanaNumber04 from "../assets/nidana numbers/04_name_form.webp";
import nidanaNumber05 from "../assets/nidana numbers/05_six_senses.webp";
import nidanaNumber06 from "../assets/nidana numbers/06_contact.webp";
import nidanaNumber07 from "../assets/nidana numbers/07_feeling.webp";
import nidanaNumber08 from "../assets/nidana numbers/08_craving.webp";
import nidanaNumber09 from "../assets/nidana numbers/09_clinging.webp";
import nidanaNumber10 from "../assets/nidana numbers/10_identity.webp";
import nidanaNumber11 from "../assets/nidana numbers/11_birth.webp";
import nidanaNumber12 from "../assets/nidana numbers/12_death.webp";

import type { NidanaId } from "./nidanas";

export const NIDANA_NUMBER_IMAGE: Record<NidanaId, string> = {
  IGNORANCE: nidanaNumber01,
  FORMATIONS: nidanaNumber02,
  CONSCIOUSNESS: nidanaNumber03,
  NAME_AND_FORM: nidanaNumber04,
  SIX_SENSES: nidanaNumber05,
  CONTACT: nidanaNumber06,
  FEELING: nidanaNumber07,
  CRAVING: nidanaNumber08,
  CLINGING: nidanaNumber09,
  BECOMING: nidanaNumber10,
  BIRTH: nidanaNumber11,
  DEATH: nidanaNumber12,
};

// Numero 1-12 de cada Nidana, mismo orden budista canonico que
// NIDANA_LIST (nidanas.ts) — por si algun texto/UI necesita mostrar
// "Nidana 7" ademas de la moneda.
export const NIDANA_NUMBER: Record<NidanaId, number> = {
  IGNORANCE: 1,
  FORMATIONS: 2,
  CONSCIOUSNESS: 3,
  NAME_AND_FORM: 4,
  SIX_SENSES: 5,
  CONTACT: 6,
  FEELING: 7,
  CRAVING: 8,
  CLINGING: 9,
  BECOMING: 10,
  BIRTH: 11,
  DEATH: 12,
};
