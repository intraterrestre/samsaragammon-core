// src/game/behavior/nidanaMapping.ts
// v36 (12 agosto 2026) — decisión de diseño cerrada con Federico/Chat:
// las Nidanas dejan de salir al azar en cada tirada. Solo se muestran
// cuando el Pattern Engine detecta un evento real (lastEvents) que
// tenga una correspondencia justificada con una de las 12 Nidanas
// canónicas — no todas necesitan trigger todavía. "Pocas Nidanas, pero
// memorables", no un checklist forzado de 12 triggers.
//
// IGNORANCE, NAME_AND_FORM, SIX_SENSES, CONTACT y BIRTH quedan
// deliberadamente SIN mapear — no hay una señal mecánica limpia para
// ellas hoy. No se les asigna un evento solo para llenar la tabla.
//
// v37 (12 agosto 2026) — corrección: naraka_entry se QUITÓ de este
// mapa. Es un evento posicional (casillas 0-3, ver src/UI/realm.ts) —
// caminar hasta ahí no es lo mismo que ser capturado, y mapearlo a
// DEATH rompía la relación causa→mensaje que las Nidanas necesitan
// para sentirse justificadas. naraka_entry sigue existiendo en el
// Pattern Engine (útil para telemetría/lectura de comportamiento),
// simplemente ya no dispara ninguna Nidana.
//
// DEATH ahora depende de avatar_sent_to_mara — el evento real de
// captura de un Avatar (no un Veneno), que sí representa lo que la
// Nidana necesita significar.
//
// Candidato anotado para más adelante, NO implementado: un evento real
// "avatar_returned_from_mara" (Avatar SALE de Mara, no existe todavía
// — recordMove() solo se llama desde CONSCIOUS_MOVE, y el regreso real
// de Mara ocurre en el bucle de ROLL, que nunca llama a recordMove)
// mapearía a BIRTH, formando el par narrativo:
// captura → Mara → DEATH / regreso de Mara → BIRTH.
import type { PatternEventType } from "./patternEngine";
import type { NidanaId } from "../nidanas";

export const NIDANA_BY_PATTERN_EVENT: Partial<
  Record<PatternEventType, NidanaId>
> = {
  avatar_sent_to_mara: "DEATH",
  capture_bias: "CRAVING",
  avoidance_bias: "FEELING",
  realm_stuck: "CLINGING",
  stability_streak: "FORMATIONS",
  realm_hopping: "CONSCIOUSNESS",
  volatility_spike: "BECOMING",
};
