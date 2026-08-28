// src/fandango/nidanaLinks.ts
// v72 (28 agosto 2026) — primera pasada REAL de Fandango, pedido de
// Federico (relayando una propuesta de Chaty tras "muchas horas de
// discusión, investigación"): antes de construir trades, activar un
// Vestigium nuevo o encender Big Head School, primero una ventana de
// SOLO LECTURA: YOUR NIDANAS / RIVAL NIDANAS / AVAILABLE LINKS.
//
// Un "link" acá es un par de Nidanas con números consecutivos (ver
// NIDANA_NUMBER, nidanaNumberAssets.ts) que un jugador porta AHORA
// MISMO en sus Avatares. Regla explícita que asentaron Federico/Chaty:
// solo lo que un Avatar porta es negociable — "Si está en un Avatar,
// es tuya. Si está en el tablero, todavía es del Samsara." Por eso
// estas funciones reciben avatarNidana (por jugador), nunca
// boardNidanas (sueltas, esperando ser recogidas).
//
// Esta primera versión SOLO detecta y muestra — no forma el link, no
// registra nada, no cambia ninguna regla del juego.
//
// Asunción de diseño (a confirmar con Federico/Chaty, no estaba
// explícita en el escrito que pasó Federico): la cadena de los 12
// Nidanas se trata LINEAL acá — 1-2, 2-3 ... 10-11, 11-12 — NO
// circular (12 no enlaza con 1 aunque cosmológicamente sea una
// Rueda). Si debe cerrar en círculo, es un cambio de una línea acá
// (agregar el par 12-1 en computeOwnLinks/computeRivalOpportunities).
import type { NidanaId } from "../game/nidanas";
import { NIDANA_NUMBER } from "../game/nidanaNumberAssets";
import type { RealmPieceKind } from "../game/types";

export type CarriedNidana = { realm: RealmPieceKind; nidana: NidanaId };

// Todo lo que un jugador porta ahora mismo, por Avatar. Ignora
// boardNidanas a propósito (ver nota arriba).
export function listCarriedNidanas(
  avatarNidana: Partial<Record<RealmPieceKind, NidanaId>>,
): CarriedNidana[] {
  const realms = Object.keys(avatarNidana) as RealmPieceKind[];
  const carried: CarriedNidana[] = [];
  for (const realm of realms) {
    const nidana = avatarNidana[realm];
    if (nidana) carried.push({ realm, nidana });
  }
  return carried;
}

export type OwnLink = {
  a: NidanaId;
  b: NidanaId;
  numA: number;
  numB: number;
};

// Pares consecutivos que un mismo jugador ya porta entre sus propios
// Avatares — un link que podría formar sin necesitar nada del rival.
export function computeOwnLinks(myIds: NidanaId[]): OwnLink[] {
  const byNumber = new Map<number, NidanaId>();
  for (const id of myIds) byNumber.set(NIDANA_NUMBER[id], id);

  const links: OwnLink[] = [];
  for (let n = 1; n <= 11; n++) {
    const a = byNumber.get(n);
    const b = byNumber.get(n + 1);
    if (a && b) links.push({ a, b, numA: n, numB: n + 1 });
  }
  return links;
}

// v76 (28 agosto 2026) — pedido de Federico: FORM LINK. El estado del
// juego (ver GameState.formedLinks, reducer.ts) guarda los links ya
// formados como número "bajo" nada más (6 significa el link 6-7) para
// no acoplar game/state al NidanaId concreto — acá, del lado de
// Fandango, se necesita el NidanaId de vuelta nada más que para poder
// dibujar la MiniCoin de "YOUR LINKS". NIDANA_NUMBER (arriba) ya es la
// biyección id→número fija (no depende de la partida); esto es
// simplemente su inversa, calculada una sola vez.
const NIDANA_ID_BY_NUMBER: NidanaId[] = (() => {
  const arr: NidanaId[] = [];
  for (const id of Object.keys(NIDANA_NUMBER) as NidanaId[]) {
    arr[NIDANA_NUMBER[id] - 1] = id;
  }
  return arr;
})();

export function nidanaIdForNumber(n: number): NidanaId {
  return NIDANA_ID_BY_NUMBER[n - 1];
}

export type RivalOpportunity = {
  have: NidanaId;
  haveNum: number;
  need: NidanaId;
  needNum: number;
};

// Para cada Nidana que YO porto, ¿el rival porta la que completaría
// una secuencia (N-1 o N+1) y que yo todavía no tengo? Es la lista
// "RIVAL HAS WHAT YOU NEED" — puramente informativa en esta fase, no
// dispara ninguna oferta.
export function computeRivalOpportunities(
  myIds: NidanaId[],
  rivalIds: NidanaId[],
): RivalOpportunity[] {
  const mine = new Set(myIds);
  const rivalByNumber = new Map<number, NidanaId>();
  for (const id of rivalIds) rivalByNumber.set(NIDANA_NUMBER[id], id);

  const seenNeed = new Set<NidanaId>();
  const opportunities: RivalOpportunity[] = [];
  for (const haveId of myIds) {
    const haveNum = NIDANA_NUMBER[haveId];
    for (const delta of [-1, 1] as const) {
      const needNum = haveNum + delta;
      const needId = rivalByNumber.get(needNum);
      if (needId && !mine.has(needId) && !seenNeed.has(needId)) {
        seenNeed.add(needId);
        opportunities.push({ have: haveId, haveNum, need: needId, needNum });
      }
    }
  }
  return opportunities;
}
