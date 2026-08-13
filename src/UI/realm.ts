// src/UI/realm.ts
import type { CanonicalRealmId } from "../game/types";

/**
 * v48 (13 agosto 2026) — segunda vuelta de la normalizacion de reinos,
 * a pedido de Federico. La primera vuelta (v47) arreglo el import roto
 * pero dejo que este archivo declarara su PROPIO tipo llamado "Realm"
 * — objecion correcta de Federico: eso vuelve a crear una segunda
 * fuente de verdad con nombre ambiguo, aunque coincidiera en valores.
 *
 * Ahora: el vocabulario de este archivo (NARAKA/PRETA/ANIMAL/HUMAN/
 * ASURA/DEVA) se llama explicitamente MuralZoneId — dejando claro que
 * es el codename INTERNO de las 6 franjas de color pintadas en el
 * mural (usado solo para las clases CSS realmCell-XXXX, REALM_LABEL y
 * REALM_LINES), no un tipo de reino alternativo. El tipo canonico de
 * verdad es CanonicalRealmId, importado (no redeclarado) desde
 * game/types.ts — mismo alias que ya usan Karma y el efecto de
 * movimiento. canonicalRealmFromPos() sigue siendo el UNICO puente
 * entre ambos vocabularios.
 */
export type MuralZoneId = "NARAKA" | "PRETA" | "ANIMAL" | "HUMAN" | "ASURA" | "DEVA";

/**
 * v46 (13 agosto 2026) — reordenado a pedido de Federico: los numeros
 * de casilla (0-23) nunca correspondian con los colores realmente
 * pintados en el mural (reportado como "un desastre", bloqueaba
 * llegar a Nirvana porque el juego contaba "Humans" en un lugar
 * distinto al que el jugador ve pintado como tal). Federico confirmo
 * mirando el tablero real cual color esta en cada bloque de 4 casillas
 * y cual reino/Avatar es cada color:
 *   Bruno/Hungry Ghosts = negro, Margot/Hell = morado,
 *   Oriol/Animals = amarillo, Marino/Humans = azul,
 *   Rufus/Titans(Asura) = rojo, Whitman/SemiGods(Deva) = blanco.
 * Canonical order (6 realms x 4 cells), AHORA por color real pintado:
 * 0–3 PRETA (negro), 4–7 ASURA (rojo), 8–11 DEVA (blanco),
 * 12–15 NARAKA (morado), 16–19 ANIMAL (amarillo), 20–23 HUMAN (azul)
 */
export const MURAL_ZONES: MuralZoneId[] = ["PRETA", "ASURA", "DEVA", "NARAKA", "ANIMAL", "HUMAN"];

// Alias retro-compatible (varios comentarios/commits previos usan este
// nombre); mismo array, mismo orden.
export const REALMS = MURAL_ZONES;

export function muralZoneFromPos(pos: number): MuralZoneId {
  const idx = Math.max(0, Math.min(5, Math.floor(pos / 4)));
  return MURAL_ZONES[idx] ?? "HUMAN";
}

// Alias retro-compatible.
export function realmFromPos(pos: number): MuralZoneId {
  return muralZoneFromPos(pos);
}

export const REALM_LABEL: Record<MuralZoneId, string> = {
  NARAKA: "Naraka (Hell)",
  PRETA: "Preta (Hungry Ghost)",
  ANIMAL: "Animal (Beasts)",
  HUMAN: "Human (Mortals)",
  ASURA: "Asura (Titans)",
  DEVA: "Deva (Semi-gods)",
};

const REALM_LINES: Record<MuralZoneId, string[]> = {
  NARAKA: ["Instinct rules.", "Survival speaks first.", "Darkness sharpens awareness."],
  PRETA: ["Desire without end.", "Hunger remembers.", "Longing shapes the path."],
  ANIMAL: ["Power seeks control.", "Instinct learns structure.", "Force without reflection."],
  HUMAN: ["Choice begins here.", "Balance is a weapon.", "The heart hesitates."],
  ASURA: ["Conflict fuels growth.", "Pride tests strength.", "Victory is not peace."],
  DEVA: ["Pleasure veils impermanence.", "Light without freedom.", "Bliss is not liberation."],
};

export function pickLine(r: MuralZoneId) {
  const arr = REALM_LINES[r] ?? REALM_LINES.HUMAN;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * v47/v48 (13 agosto 2026) — unica funcion de traduccion MuralZoneId
 * (vocabulario visual de este archivo) -> CanonicalRealmId (game/types.ts).
 * Pedido explicito de Federico: "que haya una sola funcion de
 * traduccion, no comparaciones ad hoc por todo el repo". Cualquier
 * modulo que necesite el ID canonico de reino a partir de una posicion
 * del track (Karma, efecto de movimiento, tests) debe usar
 * canonicalRealmFromPos en vez de declarar su propio mapeo local.
 */
export const REALM_TO_CANONICAL: Record<MuralZoneId, CanonicalRealmId> = {
  NARAKA: "hell",
  PRETA: "hungry_ghost",
  ANIMAL: "animals",
  HUMAN: "humans",
  ASURA: "asura",
  DEVA: "deva",
};

export function canonicalRealmFromPos(pos: number): CanonicalRealmId {
  return REALM_TO_CANONICAL[muralZoneFromPos(pos)];
}

/**
 * v48 (13 agosto 2026) — a pedido de Federico: "Titans"/"SemiGods" son
 * los nombres que quiere ver en pantalla para Rufus/asura y
 * Whitman/deva, pero renombrar "asura"/"deva" como IDs canonicos
 * significaria cambiar las claves reales de state.realmPieces[jugador]
 * en todo el reducer — eso ya no es normalizar vocabulario, es tocar
 * la forma del GameState que usa el Orquestador (zona protegida). Este
 * mapa de PRESENTACION deja "Titans"/"SemiGods" fijos y probados
 * (ver realmInvariants.test.ts) sin ese riesgo: el ID interno sigue
 * siendo asura/deva, el nombre que ve el jugador es el que pidio.
 */
export const CANONICAL_REALM_LABEL: Record<CanonicalRealmId, string> = {
  hungry_ghost: "Hungry Ghosts",
  hell: "Hell",
  animals: "Animals",
  humans: "Humans",
  asura: "Titans",
  deva: "SemiGods",
};
