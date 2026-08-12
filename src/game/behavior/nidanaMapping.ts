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
// Candidato anotado para más adelante, NO implementado: un evento real
// "mara_return" (ficha SALE de Mara, no existe todavía — ver nota en
// patternEngine.ts) mapearía a BIRTH, formando el par narrativo
// entra Mara → DEATH / sale de Mara → BIRTH.
import type { PatternEventType } from "./patternEngine";
import type { NidanaId } from "../nidanas";

export const NIDANA_BY_PATTERN_EVENT: Partial<
  Record<PatternEventType, NidanaId>
> = {
  naraka_entry: "DEATH",
  capture_bias: "CRAVING",
  avoidance_bias: "FEELING",
  realm_stuck: "CLINGING",
  stability_streak: "FORMATIONS",
  realm_hopping: "CONSCIOUSNESS",
  volatility_spike: "BECOMING",
};
