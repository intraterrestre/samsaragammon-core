// src/game/state/reducer.ts
import type {
  BasePieceKind,
  GameState,
  MoveOption,
  PendingTrade,
  PieceKind,
  PlayerId,
  PlayerRealmPiecesState,
  RealmPieceKind,
} from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { checkNirvana, isVictoryEnabled, checkNirvanaFormation, countNirvanaFormationProgress, getNirvanaReadiness } from "../victory/nirvana";
import { initialState } from "./state";
import { makeGameId } from "../Vestigium";

import { behaviorAfterMove } from "../behavior/behavior";
import { recordMove } from "../behavior/patternEngine";
import { realmFromPos, canonicalRealmFromPos } from "../../UI/realm";
import { updateDecisionSignature } from "../Karma/updateDecisionSignature";
import { computeKarmaTurn } from "../engine/computeKarmaTurn";
import { NIDANA_BY_PATTERN_EVENT } from "../behavior/nidanaMapping";
import { NIDANA_LIST } from "../nidanas";
import type { NidanaId } from "../nidanas";
import { isBasePieceUnlocked } from "../era";
import { evaluateOrchestrator, evaluateGenesisToBruno } from "../orchestrator/Orchestrator";
import { getMoveOptionsForPlayer } from "../rules/getMoveOptionsForPlayer";

const BASE_PIECE_KINDS: BasePieceKind[] = ["pig", "snake", "rooster"];
const isBasePieceKind = (kind: PieceKind): kind is BasePieceKind =>
  BASE_PIECE_KINDS.includes(kind as BasePieceKind);

function clampCurvature(value: number): number {
  return Math.max(0, Math.min(100, value));
}

type Action =
  | { type: "RESET" }
  | { type: "ROLL" }
  | { type: "SELECT_PIECE"; player: PlayerId; piece: PieceKind }
  | { type: "SHOW_LEDGER"; entry: string }
  | { type: "CLOSE_LEDGER" }
  | { type: "INTRO_DONE" }
  | { type: "SET_NIDANA"; nidana: NidanaId }
  | {
      type: "SET_NIDANA_EFFECT";
      effect: "CLARITY" | "DISTORTION" | "TENSION" | null;
    }
  | {
      type: "CONSCIOUS_MOVE";
      option: MoveOption;
      allOptions: MoveOption[];
    }
  | { type: "EMOJI"; emoji: string; player: PlayerId }
  | { type: "SET_MULTIPLAYER_STATE"; state: GameState }
  | { type: "SET_GENESIS_UI_COMPLETE" }
  | { type: "DEV_SKIP_TO_RUFUS" }
  | { type: "DEV_SKIP_TO_5_HUMANS" }
  // v74 (28 agosto 2026) — dev-tool de Federico/Chaty para probar
  // Fandango/Nidanas sin depender del azar (ver DevNidanaTool.tsx).
  // Escriben directo sobre avatarNidana, el MISMO estado real que lee
  // Fandango — nada de un estado ficticio paralelo. Gateadas en el
  // reducer con import.meta.env.DEV además de en la UI (ver más abajo,
  // defensa en profundidad: aunque alguien despache la acción a mano
  // en producción, no hace nada).
  | {
      type: "DEV_SET_AVATAR_NIDANA";
      player: PlayerId;
      realm: RealmPieceKind;
      nidana: NidanaId | null;
    }
  | {
      type: "DEV_SET_ALL_AVATAR_NIDANAS";
      avatarNidana: Record<PlayerId, Partial<Record<RealmPieceKind, NidanaId>>>;
    }
  // v76 (28 agosto 2026) — FORM LINK, pedido de Federico: primer gesto
  // real de Fandango (ver types.ts, GameState.formedLinks). NO es
  // dev-only — a diferencia de las acciones DEV_* de arriba, esta la
  // dispara cualquier jugador desde la ventana real. "low" es el número
  // bajo del par consecutivo (6 → el link 6-7). El reducer vuelve a
  // validar que el jugador de verdad porte ambas mitades ahora mismo
  // (defensa en profundidad: el botón en FandangoWindow.tsx ya solo
  // aparece para links realmente disponibles, pero no hay que confiar
  // solo en la UI).
  | { type: "FORM_LINK"; player: PlayerId; low: number }
  // v77 (28 agosto 2026) — Fandango: FORM DEAL, pedido de Federico tras
  // corregir el diseño (ver PendingTrade en types.ts para el porqué de
  // guardar NidanaId concretos): SEND_TRADE_OFFER la manda el jugador
  // con el turno sobre CUALQUIER Nidana rival que le sirva (no exige
  // necesidad mutua); ACCEPT/REFUSE solo los puede disparar quien
  // recibió la oferta, y solo en su propio turno (mismo criterio que
  // ya usa FandangoWindow para decidir de quién son "YOUR NIDANAS").
  | { type: "SEND_TRADE_OFFER"; player: PlayerId; offer: NidanaId; want: NidanaId }
  | { type: "ACCEPT_TRADE_OFFER" }
  | { type: "REFUSE_TRADE_OFFER" };

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");
const rollDie = () => 1 + Math.floor(Math.random() * 6);

// v77 (28 agosto 2026) — pedido de Federico tras verlo en partida real:
// "salen cada tres lances pero son únicas" — las dos fuentes de Nidanas
// físicas (cada 3 lances, y avatar_sent_to_mara/realm_stuck) elegían el
// tipo con Math.random() puro, sin fijarse si ese tipo ya estaba en
// juego — con las 12 posibles y varias decenas de tiradas por partida,
// las repeticiones eran cuestión de tiempo (Federico vio dos "7" a la
// vez). El disparador (cada 3 lances) NO cambia, solo la elección del
// tipo: ahora se calcula "en juego" en vivo a partir del estado real
// (boardNidanas sueltas + avatarNidana de ambos jugadores) en el
// momento exacto del spawn — sin un contador/pool aparte que pueda
// desincronizarse — y se sortea solo entre las que faltan. Si las 12
// ya están en juego, ese disparador simplemente no genera ninguna esa
// vez (nunca hay más de 12 en el mundo a la vez).
function nidanasInPlay(
  boardNidanas: GameState["boardNidanas"],
  avatarNidana: GameState["avatarNidana"],
): Set<NidanaId> {
  const inPlay = new Set<NidanaId>();
  for (const id of Object.values(boardNidanas)) {
    if (id) inPlay.add(id);
  }
  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const id of Object.values(avatarNidana[player])) {
      if (id) inPlay.add(id);
    }
  }
  return inPlay;
}

function pickUnusedNidana(
  boardNidanas: GameState["boardNidanas"],
  avatarNidana: GameState["avatarNidana"],
): NidanaId | null {
  const inPlay = nidanasInPlay(boardNidanas, avatarNidana);
  const available = NIDANA_LIST.filter((id) => !inPlay.has(id));
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

// Las 3 fichas base / venenos.
const BASE_PIECES: BasePieceKind[] = ["pig", "snake", "rooster"];

// Las 6 fichas de reino (una por Avatar/era) — REALM_PIECE_ORDER
// importado de types.ts (fuente única). v6: ya se mueven, se capturan
// y se envían a Mara igual que los Venenos (D-014, Avatar-vs-Avatar).

// v4 — RFC Cosmic Clock (APLAZADO). El Orquestador ya expone avatarStep
// (1=Bruno..6=Whitman, ver Orchestrator.ts) cuando dispara
// REVEAL_NEXT_AVATAR. Este mapa solo traduce ese número a un ActorId para
// que cosmicClock.era pueda actualizarse — no agrega ninguna condición ni
// lógica nueva de progresión.
const STEP_TO_ACTOR_ID: Record<number, import("../actors/actorProfiles").ActorId> = {
  1: "bruno",
  2: "margot",
  3: "oriol",
  4: "marino",
  5: "rufus",
  6: "whitman",
};

function playerHasActivePiece(state: GameState, player: PlayerId): boolean {
  return BASE_PIECES.some((kind) => !state.pieces[player][kind].inLimbo);
}

// v18 (10 agosto 2026) — bug real reportado por Federico: Bruno nacía en
// posiciones fijas (0 para P1, 12 para P2) sin comprobar si ya había
// algo ahí. Con muchos turnos pasando antes de que Bruno naciera, un
// Veneno rival podía terminar parado justo en esa casilla — el token
// blanco de Bruno apareció encima de un Veneno negro. Busca la primera
// casilla libre (sin ningún Veneno ni ficha de reino de NINGÚN jugador)
// empezando en preferredPos, igual que ya hace el retorno de Mara más
// abajo para no repetir ese mismo problema.
function findEmptySpawnPos(
  state: GameState,
  preferredPos: number
): number {
  const isOccupied = (pos: number): boolean => {
    for (const player of ["P1", "P2"] as PlayerId[]) {
      for (const kind of BASE_PIECES) {
        const p = state.pieces[player][kind];
        if (!p.inLimbo && p.pos === pos) return true;
      }
      for (const kind of REALM_PIECE_ORDER) {
        const p = state.realmPieces[player]?.[kind];
        if (p && p.unlocked && !p.inLimbo && p.pos === pos) return true;
      }
    }
    return false;
  };

  // v44 (13 agosto 2026) — bug real encontrado investigando el reporte de
  // Federico ("Margot blanca volvio de Mara y entro donde ya estaba Rufus
  // negro"): las fichas capturadas quedan con pos:-1 mientras estan en
  // Mara (ver "capturado" mas arriba, tanto Venenos como Avatares) y ESE
  // -1 es justo el preferredPos que se le pasa aca cuando el ciclo de 6
  // lances termina y hay que reubicarlas. El operador % de JS no envuelve
  // numeros negativos como uno esperaria: (-1) % 24 da -1, no 23. Con
  // offset=0 el primer candidato ya era -1, y como isOccupied() nunca
  // encuentra una ficha en el tablero con pos -1 (todas las que siguen
  // ahi tienen inLimbo:true y se filtran aparte), -1 se aceptaba de
  // entrada como "casilla libre" y la ficha volvia a una posicion fuera
  // del tablero real. Esa posicion invalida despues rompia todo lo que
  // depende de pos: se dibujaba en cualquier lado (coincidiendo visualmente
  // con otra ficha por casualidad, no por diseño) y realmFromPos(-1) cae
  // en su fallback "HUMAN" (Math.floor(-1/4) = -1, REALMS[-1] = undefined
  // -> "HUMAN"), contaminando en silencio el conteo de formacion de
  // Nirvana. Normalizando el modulo para que nunca de negativo.
  for (let offset = 0; offset < state.trackSize; offset++) {
    const candidate =
      (((preferredPos + offset) % state.trackSize) + state.trackSize) %
      state.trackSize;
    if (!isOccupied(candidate)) return candidate;
  }

  return ((preferredPos % state.trackSize) + state.trackSize) % state.trackSize; // tablero lleno (no debería pasar nunca) — mejor esto que crashear
}

function detectVenomTrio(
  pieces: GameState["pieces"]
): GameState["venomTrio"] {
  const visible: { player: PlayerId; kind: BasePieceKind; pos: number }[] = [];

  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const kind of BASE_PIECES) {
      const piece = pieces[player][kind];
      if (!piece.inLimbo) {
        visible.push({ player, kind, pos: piece.pos });
      }
    }
  }

  const byPos = new Map<number, { player: PlayerId; kind: PieceKind }[]>();

  for (const p of visible) {
    if (!byPos.has(p.pos)) byPos.set(p.pos, []);
    byPos.get(p.pos)!.push({ player: p.player, kind: p.kind });
  }

  for (const [pos, stack] of byPos.entries()) {
    if (stack.length < 3) continue;

    const hasPig = stack.some((s) => s.kind === "pig");
    const hasSnake = stack.some((s) => s.kind === "snake");
    const hasRooster = stack.some((s) => s.kind === "rooster");

    if (!(hasPig && hasSnake && hasRooster)) continue;

    const owners = Array.from(new Set(stack.map((s) => s.player)));

    return {
      pos,
      kind: owners.length === 1 ? "PURE" : "MIXED",
      owners,
      pieces: stack,
    };
  }

  return null;
}

// v68 (27 agosto 2026) — devuelve también collapsedCounts (cuántas
// fichas de cada jugador se mandaron a Mara por sobrecarga) para que
// el llamador pueda sumarlo a maraVisits sin recalcular el colapso.
function applyCollapseIfNeeded(
  pieces: GameState["pieces"]
): { pieces: GameState["pieces"]; collapsedCounts: Record<PlayerId, number> } {
  const nextPieces = {
    P1: {
      pig: { ...pieces.P1.pig },
      snake: { ...pieces.P1.snake },
      rooster: { ...pieces.P1.rooster },
    },
    P2: {
      pig: { ...pieces.P2.pig },
      snake: { ...pieces.P2.snake },
      rooster: { ...pieces.P2.rooster },
    },
  };

  // 2026-08-22: tipado como PieceKind (union con hungry_ghost/hell/...)
  // aunque solo BASE_PIECES (pig/snake/rooster) alimenta esta lista mas
  // abajo — mismos valores en runtime, tipo correcto (mismo ajuste que
  // Board.tsx/stacking.ts).
  const allAtSamePos: Record<number, { player: PlayerId; kind: BasePieceKind }[]> =
    {};

  for (const player of ["P1", "P2"] as PlayerId[]) {
    for (const kind of BASE_PIECES) {
      const p = nextPieces[player][kind];
      if (p.inLimbo) continue;

      if (!allAtSamePos[p.pos]) allAtSamePos[p.pos] = [];
      allAtSamePos[p.pos].push({ player, kind });
    }
  }

  const collapsedCounts: Record<PlayerId, number> = { P1: 0, P2: 0 };

  for (const pos in allAtSamePos) {
    const stack = allAtSamePos[pos];

    if (stack.length >= 5) {
      for (const { player, kind } of stack) {
        nextPieces[player][kind] = {
          ...nextPieces[player][kind],
          pos: -1,
          inLimbo: true,
          maraLevel: 1,
        };
        collapsedCounts[player] += 1;
      }
    }
  }

  return { pieces: nextPieces, collapsedCounts };
}

export function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "SET_MULTIPLAYER_STATE":
      return action.state;

    case "RESET":
      // v68 (27 agosto 2026) — gameStartedAt/gameId no pueden venir
      // del initialState estático (se evalúa una sola vez al cargar
      // el módulo) — se pisan acá con valores reales de esta partida.
      return { ...initialState, gameStartedAt: Date.now(), gameId: makeGameId() };

    // DEV ONLY (13 agosto 2026) — atajo pedido por Federico para no jugar
    // toda la progresion Bruno->Rufus cada vez que necesita probar
    // contenido de fin de partida (5/6, 6/6, Nirvana, Buda DJ). Replica el
    // ESTADO FINAL que el Orquestador/Pattern Engine ya producirian con las
    // condiciones cumplidas -- no toca su logica ni sus condiciones, solo
    // escribe directamente los campos de GameState que ellos leen.
    //
    // v54 (17 agosto 2026) — renombrado de DEV_SKIP_TO_WHITMAN a
    // DEV_SKIP_TO_RUFUS a pedido de Federico: el atajo llegaba directo a
    // Whitman (6to Avatar) y de paso "coronaba" la entrada del 6to Avatar
    // sin pasar por el video/fanfarria/campana/foto de la luna reales —
    // Federico probó el botón y vio la foto de la luna destapada ANTES de
    // tiempo (no es un evento que deba disparar un atajo de dev, tiene que
    // salir de la entrada real de Whitman). Ahora el atajo se detiene un
    // Avatar antes (Rufus, 5to) — desbloquea las primeras 5 fichas de
    // reino de AMBOS jugadores (todas menos "deva"/Whitman) y deja el
    // reloj cósmico en "rufus", así Federico puede jugar el último tramo
    // a mano y ver la entrada de Whitman (video, fanfarria, campana, foto
    // de la luna) disparada por el juego real, en el momento real.
    // Las posiciones se buscan libres una por una (mismo criterio que
    // findEmptySpawnPos ya usa en Genesis/Mara), evitando a proposito el
    // rango de Humans (12-15) para no regalar la formacion.
    case "DEV_SKIP_TO_RUFUS": {
      let working: GameState = {
        ...state,
        realmPieces: {
          P1: { ...state.realmPieces.P1 },
          P2: { ...state.realmPieces.P2 },
        },
      };

      const DEV_SKIP_PIECE_ORDER = REALM_PIECE_ORDER.filter(
        (kind) => kind !== "deva"
      );

      (["P1", "P2"] as PlayerId[]).forEach((player) => {
        const seed = player === "P1" ? 16 : 4;

        DEV_SKIP_PIECE_ORDER.forEach((kind, idx) => {
          const existing = working.realmPieces[player]?.[kind];
          if (existing?.unlocked) return;

          const pos = findEmptySpawnPos(working, (seed + idx) % working.trackSize);

          working = {
            ...working,
            realmPieces: {
              ...working.realmPieces,
              [player]: {
                ...working.realmPieces[player],
                [kind]: {
                  id: `${player}-${kind}`,
                  kind,
                  pos,
                  inLimbo: false,
                  maraLevel: null,
                  unlocked: true,
                },
              },
            },
          };
        });
      });

      const brunoActor = working.actors.bruno;

      return {
        ...working,
        brunoRevealed: true,
        actors: brunoActor
          ? {
              ...working.actors,
              bruno: {
                ...brunoActor,
                unlocked: true,
                inLimbo: false,
                maraLevel: null,
                pos: working.realmPieces.P1.hungry_ghost?.pos ?? brunoActor.pos,
              },
            }
          : working.actors,
        cosmicClock: {
          era: "rufus",
          progress: 0,
          transitionSequence: state.cosmicClock.transitionSequence + 1,
        },
        // v58 (17 agosto 2026) — el atajo dejaba stageStartedAtRoll y
        // capturesInStage/movesInStage con lo que tuvieran de antes (en la
        // práctica, del arranque de la partida), así que el guardrail
        // relativo de lances (MIN_ROLLS_IN_STAGE) y la tasa de captura de
        // rufus_to_whitman partían de una base incorrecta. Un salto de DEV
        // es, a todo efecto del Orquestador, el inicio de una etapa nueva —
        // se resetea igual que un ascenso real.
        realmProgress: {
          P1: {
            ...state.realmProgress.P1,
            currentRealmStep: 5,
            stageStartedAtRoll: state.globalRollCount,
            capturesInStage: 0,
            movesInStage: 0,
          },
          P2: {
            ...state.realmProgress.P2,
            currentRealmStep: 5,
            stageStartedAtRoll: state.globalRollCount,
            capturesInStage: 0,
            movesInStage: 0,
          },
        },
      };
    }

    // DEV ONLY (27 agosto 2026) — pedido de Federico: atajo para llegar a
    // "5 de 6 en Humans" (el estado que dispara "ONE MORE TO GET OUT" +
    // Buda DJ + mural revelado, ver GameShell.tsx p1At5/p2At5) sin jugar
    // toda la partida. Mismo criterio que DEV_SKIP_TO_RUFUS arriba:
    // replica el ESTADO FINAL que el juego real produciría, sin tocar
    // ninguna condición ni lógica de victoria — solo escribe los campos
    // que esas condiciones ya leen.
    //
    // A propósito deja al jugador en 5/6, no en 6/6: el sexto Avatar
    // (deva/Whitman) queda desbloqueado y en el tablero pero AFUERA de
    // Humans (posiciones 21,22,23,0 — ver nirvana.ts), para que Federico
    // juegue a mano el movimiento final que completa la formación y
    // dispare la victoria real (mural nirvana, champion.mp4, WHAT NOW?)
    // desde una jugada genuina — mismo espíritu que el atajo de Rufus.
    //
    // Aplica solo al jugador activo (state.turn); el otro jugador no se
    // toca. cosmicClock.era pasa a "whitman" porque whitmanEntered (ver
    // GameShell.tsx, v56) es lo que gatea el aviso "ONE MORE" — sin eso,
    // 5/6 en Humans no dispara nada.
    case "DEV_SKIP_TO_5_HUMANS": {
      const player = state.turn;
      const humansPositions = [21, 22, 23, 0];
      const piecesInHumans = REALM_PIECE_ORDER.filter(
        (kind) => kind !== "deva"
      );

      let working: GameState = {
        ...state,
        realmPieces: {
          ...state.realmPieces,
          [player]: { ...state.realmPieces[player] },
        },
      };

      piecesInHumans.forEach((kind, idx) => {
        working = {
          ...working,
          realmPieces: {
            ...working.realmPieces,
            [player]: {
              ...working.realmPieces[player],
              [kind]: {
                id: `${player}-${kind}`,
                kind,
                pos: humansPositions[idx % humansPositions.length],
                inLimbo: false,
                maraLevel: null,
                unlocked: true,
              },
            },
          },
        };
      });

      // El sexto (deva/Whitman): desbloqueado y en el tablero, pero
      // buscado a propósito lejos de Humans (seed en Asura/Deva, el lado
      // opuesto del track de 24) — misma búsqueda de casilla libre que ya
      // usa findEmptySpawnPos en Genesis/Mara/DEV_SKIP_TO_RUFUS.
      const devaSeed = player === "P1" ? 10 : 6;
      const devaPos = findEmptySpawnPos(working, devaSeed);
      working = {
        ...working,
        realmPieces: {
          ...working.realmPieces,
          [player]: {
            ...working.realmPieces[player],
            deva: {
              id: `${player}-deva`,
              kind: "deva",
              pos: devaPos,
              inLimbo: false,
              maraLevel: null,
              unlocked: true,
            },
          },
        },
      };

      return {
        ...working,
        cosmicClock: {
          era: "whitman",
          progress: 0,
          transitionSequence: state.cosmicClock.transitionSequence + 1,
        },
        realmProgress: {
          ...working.realmProgress,
          [player]: {
            ...working.realmProgress[player],
            currentRealmStep: 6,
            stageStartedAtRoll: state.globalRollCount,
            capturesInStage: 0,
            movesInStage: 0,
          },
        },
      };
    }

    // v74 (28 agosto 2026) — asigna/sustituye/quita la Nidana de UN
    // Avatar (nidana === null quita). No toca boardNidanas, pieces,
    // turn, ni ninguna otra regla — solo el mapa que Fandango lee.
    // "máximo una Nidana por Avatar" ya es estructural: es un slot
    // único por realm, sobreescribirlo YA es "sustituir".
    case "DEV_SET_AVATAR_NIDANA": {
      if (!import.meta.env.DEV) return state;
      const { player, realm, nidana } = action;
      const nextForPlayer = { ...state.avatarNidana[player] };
      if (nidana === null) {
        delete nextForPlayer[realm];
      } else {
        nextForPlayer[realm] = nidana;
      }
      return {
        ...state,
        avatarNidana: {
          ...state.avatarNidana,
          [player]: nextForPlayer,
        },
      };
    }

    // v74 (28 agosto 2026) — reemplaza avatarNidana completo de un
    // saque: usado por los presets (A/B/C) y por "Clear All" (pasando
    // { P1: {}, P2: {} }) del dev-tool.
    case "DEV_SET_ALL_AVATAR_NIDANAS": {
      if (!import.meta.env.DEV) return state;
      return {
        ...state,
        avatarNidana: action.avatarNidana,
      };
    }

    case "FORM_LINK": {
      const { player, low } = action;
      // Solo el jugador con el turno forma sus propios links — mismo
      // criterio que ya usa FandangoWindow para decidir qué lado es
      // "YOUR NIDANAS" (ver GameShell.tsx, state.turn).
      if (player !== state.turn) return state;
      if (low < 1 || low > 11) return state;
      if (state.formedLinks[player].includes(low)) return state;

      // Vuelve a comprobar acá, no solo confía en que el botón de la UI
      // ya filtró — mismo par bajo/alto que computeOwnLinks (
      // nidanaLinks.ts), recalculado con NIDANA_LIST (índice 0 = número
      // 1) para no importar nada de src/fandango desde game/state.
      const carriedNumbers = new Set(
        Object.values(state.avatarNidana[player])
          .filter((id): id is NidanaId => !!id)
          .map((id) => NIDANA_LIST.indexOf(id) + 1),
      );
      if (!carriedNumbers.has(low) || !carriedNumbers.has(low + 1)) {
        return state;
      }

      return {
        ...state,
        formedLinks: {
          ...state.formedLinks,
          [player]: [...state.formedLinks[player], low],
        },
      };
    }

    case "SEND_TRADE_OFFER": {
      const { player, offer, want } = action;
      if (player !== state.turn) return state;
      if (offer === want) return state;
      // Una sola oferta pendiente a la vez — mientras no se resuelva
      // (ACCEPT/REFUSE), no se puede mandar otra.
      if (state.pendingTrade) return state;

      const rival = otherPlayer(player);
      const myCarried = new Set(
        Object.values(state.avatarNidana[player]).filter(
          (id): id is NidanaId => !!id,
        ),
      );
      const rivalCarried = new Set(
        Object.values(state.avatarNidana[rival]).filter(
          (id): id is NidanaId => !!id,
        ),
      );
      // "offer" tiene que ser algo que YO porte de verdad ahora mismo;
      // "want" tiene que ser algo que el rival porte de verdad ahora
      // mismo — mismo criterio de "defensa en profundidad" que
      // FORM_LINK, no confía solo en que la UI ya filtró.
      if (!myCarried.has(offer) || !rivalCarried.has(want)) return state;

      const trade: PendingTrade = { fromPlayer: player, offer, want };
      return { ...state, pendingTrade: trade };
    }

    case "ACCEPT_TRADE_OFFER": {
      const trade = state.pendingTrade;
      if (!trade) return state;
      const toPlayer = otherPlayer(trade.fromPlayer);
      // Solo quien RECIBIÓ la oferta puede aceptarla, y solo estando en
      // su propio turno — mismo momento en el que FandangoWindow ya le
      // muestra "YOUR NIDANAS" a él (ver GameShell.tsx, state.turn).
      if (state.turn !== toPlayer) return state;

      // Revalida que las dos Nidanas se sigan portando exactamente
      // como cuando se mandó la oferta — pudo pasar tiempo (y turnos)
      // entre SEND_TRADE_OFFER y este ACCEPT.
      const fromAvatarNidana = state.avatarNidana[trade.fromPlayer];
      const toAvatarNidana = state.avatarNidana[toPlayer];
      const fromRealm = (Object.keys(fromAvatarNidana) as RealmPieceKind[]).find(
        (r) => fromAvatarNidana[r] === trade.offer,
      );
      const toRealm = (Object.keys(toAvatarNidana) as RealmPieceKind[]).find(
        (r) => toAvatarNidana[r] === trade.want,
      );
      if (!fromRealm || !toRealm) {
        // Ya no es válida (alguna de las dos se movió o se perdió
        // desde que se mandó) — se cae sola, sin romper nada.
        return { ...state, pendingTrade: null };
      }

      // El intercambio real: cada Avatar se queda en su lugar, solo
      // cambia qué Nidana porta cada uno — 1x1, ninguna se crea ni se
      // destruye.
      return {
        ...state,
        avatarNidana: {
          ...state.avatarNidana,
          [trade.fromPlayer]: { ...fromAvatarNidana, [fromRealm]: trade.want },
          [toPlayer]: { ...toAvatarNidana, [toRealm]: trade.offer },
        },
        pendingTrade: null,
      };
    }

    case "REFUSE_TRADE_OFFER": {
      const trade = state.pendingTrade;
      if (!trade) return state;
      const toPlayer = otherPlayer(trade.fromPlayer);
      if (state.turn !== toPlayer) return state;
      return { ...state, pendingTrade: null };
    }

    case "ROLL": {
      if (state.phase === "rolled") return state;

      // v36 (12 agosto 2026) — decisión de diseño cerrada: se elimina
      // la Nidana aleatoria en cada tirada. Ahora currentNidana solo
      // cambia como consecuencia real de una jugada (ver CONSCIOUS_MOVE
      // más abajo, donde se calcula a partir de un evento genuino del
      // Pattern Engine) — al tirar los dados, simplemente se conserva
      // lo que ya había.

      const nextRollCount = state.globalRollCount + 1;

      const releasedPieces = {
        P1: {
          pig: { ...state.pieces.P1.pig },
          snake: { ...state.pieces.P1.snake },
          rooster: { ...state.pieces.P1.rooster },
        },
        P2: {
          pig: { ...state.pieces.P2.pig },
          snake: { ...state.pieces.P2.snake },
          rooster: { ...state.pieces.P2.rooster },
        },
      };

    // liberar fichas por maraLevel (Venenos + Avatares)
let anyMaraReturnThisRoll = false;

// v49 — Rooster/Snake/Pig v0: qué Avatar (RealmPieceKind) de cada jugador
// acaba de regresar de Mara en ESTE lance, para encender su marca PIG
// (ver types.ts: justReturnedFromMara). Solo Avatares — los Venenos no
// participan de la selección de Avatar en Fase 2 (ver getMoveOptionsForPlayer).
const justReturnedThisRoll: Record<PlayerId, Partial<Record<RealmPieceKind, boolean>>> = {
  P1: {},
  P2: {},
};

const releasedPiecesRealm: Record<PlayerId, PlayerRealmPiecesState> = {
  P1: { ...state.realmPieces.P1 },
  P2: { ...state.realmPieces.P2 },
};

for (const player of ["P1", "P2"] as PlayerId[]) {
  // v23 — 'opp' ya no hace falta aquí: findEmptySpawnPos revisa todas
  // las piezas de los dos jugadores directamente, no hay que armar la
  // comparación contra el rival a mano.

  for (const kind of BASE_PIECES) {
    const piece = releasedPieces[player][kind];

    if (piece.inLimbo && piece.maraLevel !== null) {
      const nextLevel = piece.maraLevel + 1;

      if (nextLevel > 6) {
        // v23 (10 agosto 2026) — bug real reportado: un Avatar volviendo
        // de Mara podía aterrizar donde ya había un Veneno (o viceversa,
        // ver el otro bucle más abajo) porque cada uno solo comprobaba
        // colisión contra piezas de su MISMO tipo, nunca contra el otro.
        // findEmptySpawnPos ya revisa Venenos + Avatares de los dos
        // jugadores — mismo helper que ya arregló esto para el
        // nacimiento de Bruno.
        const spawnPos = findEmptySpawnPos(
          { pieces: releasedPieces, realmPieces: releasedPiecesRealm, trackSize: state.trackSize } as GameState,
          piece.pos
        );

        if (spawnPos !== null) {
          piece.pos = spawnPos;
          piece.inLimbo = false;
          piece.maraLevel = null;
          anyMaraReturnThisRoll = true;
        }
      } else {
        piece.maraLevel = nextLevel;
      }
    }
  }

  // Mismo ciclo de Mara (6 lances) para Avatares capturados (D-014).
  // Un Avatar en Mara nunca antes salía de ahí — este bucle no existía.
  for (const kind of REALM_PIECE_ORDER) {
    const piece = releasedPiecesRealm[player][kind];
    if (!piece || !piece.inLimbo || piece.maraLevel === null) continue;

    const nextLevel = piece.maraLevel + 1;

    if (nextLevel > 6) {
      // v23 — mismo arreglo que el bucle de Venenos de arriba: antes
      // solo comprobaba colisión contra OTROS Avatares del rival, nunca
      // contra Venenos. findEmptySpawnPos ya revisa todo.
      const spawnPos = findEmptySpawnPos(
        { pieces: releasedPieces, realmPieces: releasedPiecesRealm, trackSize: state.trackSize } as GameState,
        piece.pos
      );

      if (spawnPos !== null) {
        releasedPiecesRealm[player][kind] = {
          ...piece,
          pos: spawnPos,
          inLimbo: false,
          maraLevel: null,
        };
        anyMaraReturnThisRoll = true;
        justReturnedThisRoll[player][kind] = true;
      }
    } else {
      releasedPiecesRealm[player][kind] = { ...piece, maraLevel: nextLevel };
    }
  }
}

      // Paso 1.1 (26 agosto 2026) — a pedido de Federico, tras jugar una
      // partida completa: el disparador realm_stuck (6 jugadas seguidas
      // sin cambiar de mural-zone) resulto "practicamente imposible" en
      // juego real, asi que las Nidanas fisicas casi nunca nacian por esa
      // via ("el azar lo define todo" pero ni siquiera eso pasaba
      // seguido). Se agrega un disparador nuevo e independiente de
      // cualquier jugada concreta: cada 3 lances de dados (mismo
      // globalRollCount que ya usa el regreso de Mara), nace una Nidana
      // fisica mas, en una casilla al azar del tablero — rebota a la mas
      // cercana libre con el mismo findEmptySpawnPos de siempre si esa
      // casilla ya tiene una ficha. No reemplaza avatar_sent_to_mara ni
      // realm_stuck (Federico no los objeto, solo dijo que el segundo es
      // demasiado raro) — se suma para que, en sus palabras, "vayan
      // lloviendo mas rapido".
      // v77 — ver nota junto a pickUnusedNidana: mismo disparador (cada 3
      // lances), pero el tipo ahora sale solo de las que faltan por
      // aparecer, nunca repite una que ya esté en juego.
      const nidanaToSpawnOnRoll =
        nextRollCount % 3 === 0
          ? pickUnusedNidana(state.boardNidanas, state.avatarNidana)
          : null;

      const nextBoardNidanasOnRoll: GameState["boardNidanas"] =
        nidanaToSpawnOnRoll
          ? {
              ...state.boardNidanas,
              [findEmptySpawnPos(
                {
                  pieces: releasedPieces,
                  realmPieces: releasedPiecesRealm,
                  trackSize: state.trackSize,
                } as GameState,
                Math.floor(Math.random() * state.trackSize)
              )]: nidanaToSpawnOnRoll,
            }
          : state.boardNidanas;

      // v5 — Acto 0: eventos de novedad (ver types.ts / Orchestrator.ts).
      // Cada flag se enciende una sola vez, la primera vez que ocurre.
      const nextGenesisNovelty = {
        ...state.genesisNovelty,
        hasRolled: true,
        hasMaraReturn: state.genesisNovelty.hasMaraReturn || anyMaraReturnThisRoll,
      };

      const nextState: GameState = {
        ...state,
        globalRollCount: nextRollCount,
        pieces: releasedPieces,
        realmPieces: releasedPiecesRealm,
        phase: "rolled",
        rollOptions: [rollDie(), rollDie()],
        genesisNovelty: nextGenesisNovelty,
        boardNidanas: nextBoardNidanasOnRoll,
        // v49 — se acumula (nunca se limpia acá): una marca PIG dura hasta
        // que ese Avatar se mueva de verdad, no solo hasta el próximo lance.
        justReturnedFromMara: {
          P1: { ...state.justReturnedFromMara.P1, ...justReturnedThisRoll.P1 },
          P2: { ...state.justReturnedFromMara.P2, ...justReturnedThisRoll.P2 },
        },
      };

      const nextVenomTrio = detectVenomTrio(nextState.pieces);
      const nextBrunoRevealed =
        state.brunoRevealed || evaluateGenesisToBruno(nextState);

      // v10 — reparación de identidad de etapa (10 agosto 2026). Antes:
      // brunoRevealed solo marcaba una bandera narrativa y desbloqueaba el
      // actor legacy sin renderizado; la ficha/video/mural de Bruno de
      // verdad nacían mucho después, cuando el Orquestador cumplía sus
      // propios umbrales (bruno_to_margot) — y para entonces cosmicClock.era
      // ya decía "margot" (ver hallazgo del off-by-one). Ahora: el momento
      // en que brunoRevealed pasa de false a true ES el único evento
      // Genesis→Bruno y crea el paquete completo de una vez, para los dos
      // jugadores a la vez (un acontecimiento, dos manifestaciones — P-001).
      const brunoJustRevealed = !state.brunoRevealed && nextBrunoRevealed;

      // 2026-08-22: actors es Partial<Record<ActorId, ActorPieceState>>
      // (bruno PODRÍA no existir, por tipo), pero initialState.actors.bruno
      // siempre lo crea completo desde el arranque (ver state.ts) — nunca
      // se borra, solo cambia `unlocked`. El "!" documenta esa garantía
      // real sin inventar un valor default falso; TS ya no puede
      // comprobarlo solo por el tipo Partial.
      const nextActorsOnRoll = brunoJustRevealed
        ? {
            ...state.actors,
            bruno: { ...state.actors.bruno!, unlocked: true },
          }
        : state.actors;

      const brunoP1SpawnPos = brunoJustRevealed ? findEmptySpawnPos(nextState, 0) : 0;
      const nextStateWithBrunoP1 = brunoJustRevealed
        ? {
            ...nextState,
            realmPieces: {
              ...nextState.realmPieces,
              P1: {
                ...nextState.realmPieces.P1,
                hungry_ghost: {
                  id: "P1-hungry_ghost",
                  kind: "hungry_ghost" as RealmPieceKind,
                  pos: brunoP1SpawnPos,
                  inLimbo: false,
                  maraLevel: null,
                  unlocked: true,
                },
              },
            },
          }
        : nextState;

      const nextPiecesRealmWithBruno = brunoJustRevealed
        ? {
            P1: nextStateWithBrunoP1.realmPieces.P1,
            P2: {
              ...nextState.realmPieces.P2,
              hungry_ghost: {
                id: "P2-hungry_ghost",
                kind: "hungry_ghost" as RealmPieceKind,
                // busca desde nextStateWithBrunoP1 para no caer sobre la
                // casilla que le acabamos de dar a Bruno-P1.
                pos: findEmptySpawnPos(nextStateWithBrunoP1, 12),
                inLimbo: false,
                maraLevel: null,
                unlocked: true,
              },
            },
          }
        : nextState.realmPieces;

      const nextCosmicClockOnRoll = brunoJustRevealed
        ? {
            era: "bruno" as const,
            progress: 0,
            transitionSequence: state.cosmicClock.transitionSequence + 1,
          }
        : state.cosmicClock;

      const nextRealmAscensionOnRoll = brunoJustRevealed
        ? {
            player: state.turn,
            realmStep: 1,
            realmKey: "hungry_ghost" as RealmPieceKind,
            at: Date.now(),
          }
        : state.realmAscension;

      const nextRealmProgressOnRoll = brunoJustRevealed
        ? {
            P1: { ...state.realmProgress.P1, stageStartedAtRoll: nextRollCount },
            P2: { ...state.realmProgress.P2, stageStartedAtRoll: nextRollCount },
          }
        : state.realmProgress;

      if (!playerHasActivePiece(nextState, state.turn)) {
        return {
          ...nextState,
          venomTrio: nextVenomTrio,
          turn: otherPlayer(state.turn),
          phase: "idle",
          rollOptions: null,
          brunoRevealed: nextBrunoRevealed,
          actors: nextActorsOnRoll,
          realmPieces: nextPiecesRealmWithBruno,
          cosmicClock: nextCosmicClockOnRoll,
          realmAscension: nextRealmAscensionOnRoll,
          realmProgress: nextRealmProgressOnRoll,
        };
      }

      return {
        ...nextState,
        venomTrio: nextVenomTrio,
        brunoRevealed: nextBrunoRevealed,
        actors: nextActorsOnRoll,
        realmPieces: nextPiecesRealmWithBruno,
        cosmicClock: nextCosmicClockOnRoll,
        realmAscension: nextRealmAscensionOnRoll,
        realmProgress: nextRealmProgressOnRoll,
      };
    }

    case "SELECT_PIECE": {
      if (action.player !== state.turn) return state;

      // Era gate: Snake/Rooster (and any future locked base piece) can't be
      // selected while their era hasn't unlocked them yet. Realm pieces are
      // unaffected — they carry their own `unlocked` flag.
      if (
        isBasePieceKind(action.piece) &&
        !isBasePieceUnlocked(action.piece)
      ) {
        return state;
      }

      // v27 (11 agosto 2026) — decisión de diseño cerrada: en Fase 2
      // (desde Oriol), la selección es AVATAR + VENENO en dos clics que
      // se ACUMULAN, no un valor único que se sobreescribe. Clicar un
      // Avatar inicia/reinicia la selección (limpia el Veneno elegido
      // antes, si había uno). Clicar un Veneno SOLO cuenta como el
      // segundo paso si ya hay un Avatar propio válido seleccionado —
      // si no, no hace nada (regla D del diseño cerrado con Chat).
      const phase2 = state.realmProgress[action.player].currentRealmStep >= 3;

      if (phase2 && isBasePieceKind(action.piece)) {
        const currentAvatarSel = state.selectedPiece[action.player];
        const hasValidAvatarSelected =
          !isBasePieceKind(currentAvatarSel as PieceKind) &&
          REALM_PIECE_ORDER.includes(currentAvatarSel as RealmPieceKind) &&
          Boolean(
            state.realmPieces[action.player]?.[
              currentAvatarSel as RealmPieceKind
            ]?.unlocked
          );

        if (!hasValidAvatarSelected) return state;

        return {
          ...state,
          selectedVenom: {
            ...state.selectedVenom,
            [action.player]: action.piece,
          },
        };
      }

      return {
        ...state,
        selectedPiece: {
          ...state.selectedPiece,
          [action.player]: action.piece,
        },
        // Elegir (o volver a elegir) un Avatar siempre reinicia el
        // Veneno elegido antes — cada Avatar empieza su propia
        // selección de motivo de cero. Esto no afecta Fase 1 (los
        // Venenos allí no usan selectedVenom para nada).
        selectedVenom: {
          ...state.selectedVenom,
          [action.player]: null,
        },
      };
    }

    case "SHOW_LEDGER":
      return {
        ...state,
        ledgerOpen: true,
        ledgerEntry: action.entry,
      };

    case "CLOSE_LEDGER":
      return {
        ...state,
        ledgerOpen: false,
        ledgerEntry: null,
      };

    case "SET_GENESIS_UI_COMPLETE":
      return { ...state, genesisUIComplete: true };

    case "SET_NIDANA":
      return {
        ...state,
        currentNidana: action.nidana,
      };
    case "SET_NIDANA_EFFECT":
    return {
    ...state,
    activeNidanaEffect: action.effect,
  };

    case "INTRO_DONE":
      return {
        ...state,
        introSeen: true,
      };

    case "EMOJI": {
      const newEvent = {
        player: action.player,
        emoji: action.emoji,
        at: Date.now(),
      };

      return {
        ...state,
        emojiEvents: [...state.emojiEvents, newEvent].slice(-20),
      };
    }

    case "CONSCIOUS_MOVE": {
      if (state.phase !== "rolled" || !state.rollOptions) return state;

      const me = state.turn;
      const opp = otherPlayer(me);
      const { option, allOptions } = action;

      if (!option) return state;

      // v33 (12 agosto 2026) — bug real reportado: Whitman blanco capturó
      // a Marino negro aunque hubiera 2 Avatares negros (Marino+Oriol)
      // juntos en esa casilla, que debían bloquear la jugada — Federico
      // confirmó que la línea se veía normal (no bloqueada) al momento
      // de clicarla. No se pudo reproducir el mecanismo exacto con
      // pruebas directas (el bloqueo SÍ funciona con un estado limpio
      // construido a mano), pero se encontró la debilidad real de fondo:
      // el reducer nunca comprobaba que `option` fuera de verdad una de
      // las opciones legales del momento — ejecutaba cualquier cosa que
      // le llegara, confiando ciegamente en el origen (útil solo si la
      // UI nunca pudiera mandar algo desactualizado, que es justo lo que
      // parece haber pasado aquí). Validación defensiva: recalcula las
      // opciones legales AHORA MISMO y rechaza silenciosamente cualquier
      // `option` que no sea una de ellas — cierra esta clase entera de
      // bug, no solo esta jugada puntual, sin importar qué causó
      // exactamente que la UI ofreciera algo desactualizado.
      const legalOptionsNow = getMoveOptionsForPlayer(state, me);
      const isOptionStillLegal = legalOptionsNow.some(
        (o) =>
          o.pieceKind === option.pieceKind &&
          o.venomId === option.venomId &&
          o.toPos === option.toPos &&
          o.choice === option.choice
      );
      if (!isOptionStillLegal) {
        console.warn(
          "[CONSCIOUS_MOVE] opción rechazada — ya no es legal en el estado actual",
          option
        );
        return state;
      }

      const activePiece = option.pieceKind;
      const fromPos = option.fromPos;
      const toPos = option.toPos;

// TEMPORAL: la nidana NO cambia la casilla final.
// Así la raya visual coincide con donde cae la ficha.

const finalToPos = toPos;

      const [a, b] = state.rollOptions;

      const nextCurvature = {
        ...(state.curvature ?? { P1: 0, P2: 0 }),
      };
      const nextPiecesRealm = {
  P1: { ...state.realmPieces.P1 },
  P2: { ...state.realmPieces.P2 },
};
const nextActors = {
  ...state.actors,
};

// Paso 1 (26 agosto 2026) — Nidanas fisicas: aparicion y recoleccion.
// Copias mutables declaradas aca (junto con las otras copias "next*"
// de este turno) porque se leen/escriben en dos puntos distintos de
// este mismo case: la recoleccion ocurre donde el Avatar aterriza (mas
// abajo, "movimiento final"), la aparicion ocurre despues de calcular
// los eventos del Pattern Engine de esta jugada (tambien mas abajo).
let nextBoardNidanas: GameState["boardNidanas"] = { ...state.boardNidanas };
let nextAvatarNidana: GameState["avatarNidana"] = {
  P1: { ...state.avatarNidana.P1 },
  P2: { ...state.avatarNidana.P2 },
};

// v49 — Rooster/Snake/Pig v0: copia mutable para apagar la marca PIG del
// Avatar que efectivamente se mueva este turno (ver más abajo).
const nextJustReturnedFromMara: GameState["justReturnedFromMara"] = {
  P1: { ...state.justReturnedFromMara.P1 },
  P2: { ...state.justReturnedFromMara.P2 },
};
      // ===== progreso de reino por globalRollCount =====
      // Sistema híbrido: mínimo de lances globales + condiciones objetivas
      // Reemplaza el sistema de vueltas (loopsNeeded) que era impredecible
      const prevRealmProgress = state.realmProgress[me];

      // Mantenemos loopProgress para compatibilidad visual (barras de progreso)
      // pero ya no dispara la transición
      let nextLoopProgress =
        prevRealmProgress.currentLoopProgress + option.value;
      let nextCompletedLoops = prevRealmProgress.completedLoopsInRealm;
      if (nextLoopProgress >= state.trackSize) {
        nextCompletedLoops += 1;
        nextLoopProgress = nextLoopProgress % state.trackSize;
      }

      // v58 (17 agosto 2026) — par exclusivo del Orquestador (ver types.ts,
      // RealmProgress.capturesInStage). Arrancan en lo que traía la etapa
      // actual; se resetean a 0 más abajo si esta jugada asciende de
      // Avatar, y se incrementan al armar nextRealmProgress (más abajo,
      // una vez que didCapture ya se calculó).
      let nextCapturesInStage = prevRealmProgress.capturesInStage ?? 0;
      let nextMovesInStage = prevRealmProgress.movesInStage ?? 0;

      let nextRealmStep = prevRealmProgress.currentRealmStep;
      let nextRealmTransitions = prevRealmProgress.realmTransitions;
      let didAscendRealm = false;
      let unlockedRealmKey: RealmPieceKind | null = null;

      // ===== ORQUESTADOR DE PROGRESIÓN (D-009, D-020) =====
      // Evalúa condiciones objetivas para la transición entre Avatares
      const orchestratorResult = evaluateOrchestrator(state, me);
      const conditionsMet = orchestratorResult.event === "REVEAL_NEXT_AVATAR";

      // v4 — RFC Cosmic Clock (APLAZADO): solo actualiza el estado mínimo
      // (era + contador de transición) cuando el Orquestador ya decidió por
      // su cuenta revelar el siguiente Avatar. No añade ninguna condición
      // propia — es puro reflejo de una decisión que el sistema actual ya
      // toma. progress se deja en 0 (ver types.ts).
      let nextCosmicClock = state.cosmicClock;
      if (conditionsMet && orchestratorResult.event === "REVEAL_NEXT_AVATAR") {
        const newEra = STEP_TO_ACTOR_ID[orchestratorResult.avatarStep];
        if (newEra && newEra !== state.cosmicClock.era) {
          nextCosmicClock = {
            era: newEra,
            progress: 0,
            transitionSequence: state.cosmicClock.transitionSequence + 1,
          };
        }
      }

    if (
  prevRealmProgress.currentRealmStep < 7 &&
  conditionsMet
) {
  const nextRealmStepValue = Math.min(
    prevRealmProgress.currentRealmStep + 1,
    7
  );

  nextRealmStep = nextRealmStepValue;
  didAscendRealm = true;
  nextRealmTransitions += 1;
  nextCompletedLoops = 0;
  nextLoopProgress = 0;
  nextCapturesInStage = 0;
  nextMovesInStage = 0;

 // ===== DESBLOQUEAR FICHA DE REINO =====
 // v10 — reparación de identidad de etapa (10 agosto 2026). Antes:
 // `nextRealmStepValue - 2`. Con avatarStep = currentStep + 1 (mismo
 // valor que nextRealmStepValue) usado para cosmicClock.era más arriba,
 // esa fórmula quedaba UN Avatar por detrás de lo que decía el reloj
 // cósmico — cuando el Orquestador revelaba "margot" en cosmicClock.era,
 // esta línea creaba en realidad la ficha de "hungry_ghost" (Bruno).
 // Con Bruno ahora creado directamente en Genesis (ver case "ROLL"),
 // esta cadena empieza en Margot: `bruno_to_margot` debe crear a Margot
 // (hell), no a Bruno. -1 alinea el índice con avatarStep.
unlockedRealmKey =
  REALM_PIECE_ORDER[nextRealmStepValue - 1] ?? null;

const nextRealmKey = unlockedRealmKey;

if (nextRealmKey) {
  const existingRealmPiece = state.realmPieces[me]?.[nextRealmKey];

  if (!existingRealmPiece?.unlocked) {
    nextPiecesRealm[me][nextRealmKey] = {
      id: `${me}-${nextRealmKey}`,
      kind: nextRealmKey,
      pos: finalToPos,
      inLimbo: false,
      maraLevel: null,
      unlocked: true,
    };
}
}
}



      // ===== clonar piezas =====
      const nextPieces = {
        P1: {
          pig: { ...state.pieces.P1.pig },
          snake: { ...state.pieces.P1.snake },
          rooster: { ...state.pieces.P1.rooster },
        },
        P2: {
          pig: { ...state.pieces.P2.pig },
          snake: { ...state.pieces.P2.snake },
          rooster: { ...state.pieces.P2.rooster },
        },
      };

      const nextCaptures = {
        P1: state.captures.P1,
        P2: state.captures.P2,
      };

      // v68 (27 agosto 2026) — contadores de FinalVestigium. Se
      // incrementan en los mismos puntos donde ya se decide mandar una
      // ficha a Mara / activar una Nidana real, no se recalculan aparte.
      const nextMaraVisits = {
        P1: state.maraVisits.P1,
        P2: state.maraVisits.P2,
      };
      const nextNidanasActivated = {
        P1: state.nidanasActivated.P1,
        P2: state.nidanasActivated.P2,
      };
// ===== captura sobre posición final real (Venenos + Avatares, D-014) =====
// v6 — Avatar-vs-Avatar: la misma regla 0/1/2+ que ya regía solo para
// Venenos ahora se evalúa sobre el conjunto combinado de piezas del
// rival (Venenos + Avatares de reino) presentes en la casilla. Un
// jugador con 2+ piezas propias (de cualquier tipo combinado) en una
// casilla queda protegido frente al rival — apilamiento estilo
// Backgammon, sección 6.3 de la RFC.
let didCapture = false;
let capturedPieceKind: PieceKind | null = null;
// v37 (12 agosto 2026) — corrección de diseño: naraka_entry (zona
// posicional del tablero) NO debe mapear a DEATH — Federico/Chat
// señalaron que eso rompía la relación causa→mensaje (caminar a esas
// casillas no es lo mismo que ser capturado). Este flag distingue si
// lo capturado esta jugada fue específicamente un Avatar (no un
// Veneno), para el evento real avatar_sent_to_mara -> DEATH.
let capturedWasAvatar = false;
// v36 (13 agosto 2026) — a pedido de Federico: cuando se captura un
// Avatar, la casilla donde estaba se guarda aca para poder reubicar,
// mas abajo (despues del movimiento final), el Veneno propio del
// oponente que haya quedado ahi (ver bloque despues de "movimiento
// final").
let capturedAvatarVacatedPos: number | null = null;
// Paso 2 (26 agosto 2026) — escudo Nidana, a pedido de Federico tras
// jugar una partida completa ("cual fue el beneficio de tener un
// escudo nidana? no entendi" — antes cargar una no cambiaba nada al
// ser capturado). Diseño confirmado con el explicitamente: si el
// Avatar capturado llevaba una Nidana, sobrevive (no va a Mara,
// rebota a la casilla libre mas cercana) y el atacante se la roba. Si
// el atacante no puede portarla (es un Veneno) o ya porta la suya,
// la robada "queda suelta en el tablero" (decision explicita de
// Federico) en vez de perderse. shieldedNidana/shieldedAvatarKind se
// completan en el bloque de captura de abajo; la reubicacion real y
// el robo se resuelven MAS ABAJO, despues de "movimiento final",
// junto al bloque que ya reubica Venenos tras una captura — recien
// ahi nextPieces/nextPiecesRealm reflejan donde termino el atacante.
let shieldedNidana: NidanaId | null = null;
let shieldedAvatarKind: RealmPieceKind | null = null;

type EnemyRef =
  | { system: "base"; kind: BasePieceKind }
  | { system: "realm"; kind: RealmPieceKind };

const getEnemyRefsAtPos = (pos: number): EnemyRef[] => {
  const refs: EnemyRef[] = [];

  for (const kind of BASE_PIECES) {
    const enemy = nextPieces[opp][kind];
    if (!enemy.inLimbo && enemy.pos === pos) {
      refs.push({ system: "base", kind });
    }
  }

  for (const kind of REALM_PIECE_ORDER) {
    const enemy = nextPiecesRealm[opp][kind];
    if (enemy && enemy.unlocked && !enemy.inLimbo && enemy.pos === pos) {
      refs.push({ system: "realm", kind });
    }
  }

  return refs;
};

// v28 (11 agosto 2026) — decisión de diseño cerrada con Federico: "un
// Avatar más su Veneno cuentan solo los Avatares por pares — la regla
// de backgammon (2+ = bloqueado) pasa a los Avatares solamente". Un
// Veneno acompañando a su propio Avatar en la misma casilla NO debe
// sumar para el bloqueo de 2+; solo 2+ Avatares del mismo jugador
// bloquean. Esto es SOLO para el umbral de bloqueo — la captura de una
// pieza sola (Veneno o Avatar) sigue funcionando igual, sin cambios
// (getEnemyRefsAtPos arriba, sin filtrar).
const oppPhase2ForBlocking =
  state.realmProgress[opp].currentRealmStep >= 3;

const getEnemyRefsAtPosForBlocking = (pos: number): EnemyRef[] =>
  oppPhase2ForBlocking
    ? getEnemyRefsAtPos(pos).filter((r) => r.system === "realm")
    : getEnemyRefsAtPos(pos);

const enemiesAtFinalPos = getEnemyRefsAtPosForBlocking(finalToPos);

// 2+ enemigos (Venenos + Avatares combinados) en destino final =
// casilla bloqueada. El movimiento queda prohibido aunque la UI se
// equivoque.
if (enemiesAtFinalPos.length >= 2) {
  return state;
}

const possibleCapturePositions = Array.from(new Set([toPos, finalToPos]));

const enemyRefsAtTarget = possibleCapturePositions.flatMap((pos) =>
  getEnemyRefsAtPos(pos).map((ref) => ({ ...ref, pos }))
);

// DEBUG TEMPORAL (13 agosto 2026) — Federico reportó: Margot negra
// viajó hasta el cochino blanco y no comió. Este log se saca apenas
// se identifique la causa.
//
// v41 (13 agosto 2026) — se agrega oppPositionsFlat: un resumen plano
// "kind: pos" de TODAS las piezas del rival, para no tener que ir
// expandiendo objetos anidados en el inspector a mano — de un vistazo
// se ve si alguna pieza realmente esta en toPos o no.
const oppPositionsFlat: Record<string, number | "inLimbo"> = {};
for (const k of ["pig", "snake", "rooster"] as const) {
  const p = nextPieces[opp][k];
  oppPositionsFlat[k] = p.inLimbo ? "inLimbo" : p.pos;
}
for (const k of REALM_PIECE_ORDER) {
  const p = nextPiecesRealm[opp][k];
  if (!p) continue;
  oppPositionsFlat[k] = !p.unlocked ? "inLimbo" : p.inLimbo ? "inLimbo" : p.pos;
}

console.log("[CAPTURE DEBUG]", {
  me,
  opp,
  activePiece,
  fromPos,
  toPos,
  finalToPos,
  oppPositionsFlat,
  enemiesAtFinalPos,
  possibleCapturePositions,
  enemyRefsAtTarget,
  oppBasePieces: {
    pig: nextPieces[opp].pig,
    snake: nextPieces[opp].snake,
    rooster: nextPieces[opp].rooster,
  },
  oppRealmPieces: nextPiecesRealm[opp],
});

// se captura si hay 1 enemiga sola en la casilla
if (enemyRefsAtTarget.length >= 1) {
  const enemyRef = enemyRefsAtTarget[enemyRefsAtTarget.length - 1];

  didCapture = true;
  capturedPieceKind = enemyRef.kind;
  capturedWasAvatar = enemyRef.system === "realm";
  if (capturedWasAvatar) {
    capturedAvatarVacatedPos = enemyRef.pos;
  }
  nextCaptures[me] += 1;

  if (enemyRef.system === "base") {
    nextPieces[opp][enemyRef.kind] = {
      ...nextPieces[opp][enemyRef.kind],
      pos: -1,
      inLimbo: true,
      maraLevel: 1,
    };
    nextMaraVisits[opp] += 1;
  } else {
    const carriedByVictim = nextAvatarNidana[opp][enemyRef.kind];

    if (carriedByVictim) {
      // Escudo: el Avatar NO se toca todavia (sigue en su pos actual)
      // — se reubica mas abajo, despues de "movimiento final". Solo
      // se le quita la Nidana aca; a quien le llega se resuelve
      // tambien mas abajo (depende de si el atacante puede portarla).
      shieldedNidana = carriedByVictim;
      shieldedAvatarKind = enemyRef.kind;
      nextAvatarNidana = {
        ...nextAvatarNidana,
        [opp]: { ...nextAvatarNidana[opp] },
      };
      delete nextAvatarNidana[opp][enemyRef.kind];
    } else {
      const capturedRealmPiece = nextPiecesRealm[opp][enemyRef.kind]!;
      nextPiecesRealm[opp][enemyRef.kind] = {
        ...capturedRealmPiece,
        pos: -1,
        inLimbo: true,
        maraLevel: 1,
      };
      nextMaraVisits[opp] += 1;
    }
  }

  nextCurvature[me] = clampCurvature((nextCurvature[me] ?? 0) + 6);
  nextCurvature[opp] = clampCurvature((nextCurvature[opp] ?? 0) - 8);
}

// ===== movimiento final =====

const isBasePiece =
  BASE_PIECES.includes(activePiece as BasePieceKind);

if (isBasePiece) {
  const activeBasePiece = activePiece as BasePieceKind;

  nextPieces[me][activeBasePiece].pos = finalToPos;
  nextPieces[me][activeBasePiece].inLimbo = false;
  nextPieces[me][activeBasePiece].maraLevel = null;

  // ===== BRUNO SE MUEVE USANDO LOS BICHOS =====
  const bruno = nextActors.bruno;

  if (bruno?.unlocked && bruno.owner === me) {
    nextActors.bruno = {
      ...bruno,
      pos: finalToPos,
      inLimbo: false,
      maraLevel: null,
    };
  }
} else {
  const activeRealmPiece =
    activePiece as RealmPieceKind;

  const realmPiece =
    nextPiecesRealm[me]?.[activeRealmPiece];

  if (!realmPiece) {
    return state;
  }

  nextPiecesRealm[me][activeRealmPiece] = {
    ...realmPiece,
    pos: finalToPos,
    inLimbo: false,
    maraLevel: null,
    unlocked: true,
  };

  // Paso 1 — recoleccion: el Avatar recoge la Nidana de esta casilla
  // solo si aterriza EXACTO en ella (finalToPos, no "pasar por" —
  // mismo criterio que la captura, que tambien solo mira la posicion
  // final) y solo si todavia no porta ninguna (regla 3: una por
  // Avatar). Si ya porta una, la Nidana de la casilla se queda ahi sin
  // recogerse — a proposito, no es un bug.
  const nidanaOnLandingCell = nextBoardNidanas[finalToPos];
  if (nidanaOnLandingCell && !nextAvatarNidana[me][activeRealmPiece]) {
    nextAvatarNidana = {
      ...nextAvatarNidana,
      [me]: {
        ...nextAvatarNidana[me],
        [activeRealmPiece]: nidanaOnLandingCell,
      },
    };
    delete nextBoardNidanas[finalToPos];
  }

  // v49 — Rooster/Snake/Pig v0: este Avatar se movió de verdad, así que
  // su "susto" de PIG (si tenía) se apaga aquí, sin importar si el
  // movimiento fue una elección libre o una obligada por la propia regla.
  if (nextJustReturnedFromMara[me]?.[activeRealmPiece]) {
    nextJustReturnedFromMara[me] = {
      ...nextJustReturnedFromMara[me],
      [activeRealmPiece]: false,
    };
  }

  // v3 — Actualización Crítica (D-001/D-014): el Veneno que originó este
  // destino viaja junto con el Avatar. Los otros dos Venenos y los demás
  // Avatares permanecen donde estaban.
  if (option.venomId) {
    const venomPiece = nextPieces[me][option.venomId];

    if (venomPiece && !venomPiece.inLimbo) {
      nextPieces[me][option.venomId] = {
        ...venomPiece,
        pos: finalToPos,
      };
    }
  }
}
// v36 (13 agosto 2026) — a pedido de Federico: antes, cuando se
// capturaba un Avatar, su Veneno acompanante "quedaba intacto en la
// casilla" (D-028) — es decir, ahi nomas, y si despues cualquier otra
// ficha terminaba compartiendo esa casilla, el render solo muestra la
// de encima: confusion real y repetida sobre que hay en el tablero
// (reportado varias veces). Decision de diseno: en vez de arreglar el
// render para apilar visualmente, se evita el apilamiento — el Veneno
// se reubica solo a la casilla vacia mas cercana (mismo criterio de
// busqueda que findEmptySpawnPos: hacia adelante desde su posicion,
// dando la vuelta al tablero si hace falta).
if (capturedAvatarVacatedPos !== null) {
  const vacatedPos = capturedAvatarVacatedPos;
  for (const kind of BASE_PIECES) {
    const venom = nextPieces[opp][kind];
    if (!venom.inLimbo && venom.pos === vacatedPos) {
      const relocatedPos = findEmptySpawnPos(
        {
          pieces: nextPieces,
          realmPieces: nextPiecesRealm,
          trackSize: state.trackSize,
        } as GameState,
        vacatedPos
      );
      if (relocatedPos !== vacatedPos) {
        nextPieces[opp][kind] = {
          ...nextPieces[opp][kind],
          pos: relocatedPos,
        };
      }
    }
  }

  // Paso 2 — escudo Nidana: se reubica el Avatar sobreviviente ACA (no
  // en el bloque de captura de arriba) porque recien aca
  // nextPieces/nextPiecesRealm ya reflejan donde termino el atacante
  // (finalToPos) — mismo motivo que la reubicacion de Venenos de
  // arriba, para no hacerlo rebotar encima del propio atacante.
  if (shieldedNidana !== null && shieldedAvatarKind !== null) {
    const survivorKind = shieldedAvatarKind;
    const survivor = nextPiecesRealm[opp][survivorKind]!;
    const survivorPos = findEmptySpawnPos(
      {
        pieces: nextPieces,
        realmPieces: nextPiecesRealm,
        trackSize: state.trackSize,
      } as GameState,
      vacatedPos
    );
    nextPiecesRealm[opp][survivorKind] = {
      ...survivor,
      pos: survivorPos,
      inLimbo: false,
      maraLevel: null,
    };

    // Robo: si el atacante es un Avatar (puede portar Nidanas) y
    // todavia no carga ninguna, se queda con la robada. Si es un
    // Veneno (no puede portar, ver types.ts) o ya porta la suya,
    // decision explicita de Federico: la robada queda suelta en el
    // tablero en vez de perderse — mismo criterio que ya usa el Paso 1
    // para "ya porta una, la nueva se queda sin recoger".
    const attackerIsRealmPiece = !BASE_PIECES.includes(
      activePiece as BasePieceKind
    );
    const attackerAlreadyCarries =
      attackerIsRealmPiece &&
      Boolean(nextAvatarNidana[me][activePiece as RealmPieceKind]);

    if (attackerIsRealmPiece && !attackerAlreadyCarries) {
      nextAvatarNidana = {
        ...nextAvatarNidana,
        [me]: {
          ...nextAvatarNidana[me],
          [activePiece as RealmPieceKind]: shieldedNidana,
        },
      };
    } else {
      nextBoardNidanas = {
        ...nextBoardNidanas,
        [finalToPos]: shieldedNidana,
      };
    }
  }
}
// v47 (13 agosto 2026) — cierre de deuda tecnica a pedido de Federico:
      // Karma debe recibir el ID canonico de reino (RealmPieceKind), no el
      // vocabulario espacial de UI/realm.ts (NARAKA/HUMAN/etc) que
      // computeKarmaTurn nunca reconocia (por eso getRealmModifier
      // siempre caia en su default). Los otros dos usos de
      // realmFromPos() en este archivo (fromRealm/toRealm, mas abajo,
      // que alimentan al Pattern Engine via recordMove) NO se tocan —
      // el Pattern Engine sigue recibiendo exactamente los mismos
      // valores que siempre recibio.
      const currentRealm = canonicalRealmFromPos(finalToPos);
      let nextRealmProgress = {
        ...state.realmProgress,
        [me]: {
          ...state.realmProgress[me],
          currentRealmStep: nextRealmStep,
          completedLoopsInRealm: nextCompletedLoops,
          currentLoopProgress: nextLoopProgress,
          realmTransitions: nextRealmTransitions,
          // v10 — reparación de identidad de etapa: se resetea SOLO cuando
          // esta jugada de verdad ascendió de Avatar (didAscendRealm),
          // para que el guardrail relativo del Orquestador (sección 1.5,
          // rollsInCurrentStage) cuente desde que el Avatar actual
          // apareció, no desde el inicio de la partida.
          stageStartedAtRoll: didAscendRealm
            ? state.globalRollCount
            : state.realmProgress[me].stageStartedAtRoll,
          // v58 (17 agosto 2026) — ver types.ts (RealmProgress) y
          // Orquestador (evaluateOrchestrator, sección 2/3): tasa de
          // captura y "visitas a Mara" EN ESTA ETAPA, no acumuladas de
          // toda la partida. nextCapturesInStage/nextMovesInStage ya
          // vienen en 0 si esta jugada ascendió de Avatar (ver más
          // arriba); didCapture recién se conoce acá, así que el +1 se
          // aplica en este punto.
          capturesInStage: nextCapturesInStage + (didCapture ? 1 : 0),
          movesInStage: nextMovesInStage + 1,
        },
      };

      if (didCapture) {
        const oppPrev = state.realmProgress[opp];

        nextRealmProgress = {
          ...nextRealmProgress,
          [opp]: {
            ...oppPrev,
            completedLoopsInRealm: Math.max(
              0,
              oppPrev.completedLoopsInRealm - 1
            ),
            currentLoopProgress: 0,
          },
        };
      }
// ===== presión sobre el rival cuando avanzas =====
if (!didCapture) {
  const oppProgress = nextRealmProgress[opp];

  nextRealmProgress = {
    ...nextRealmProgress,
    [opp]: {
      ...oppProgress,
      currentLoopProgress: Math.max(
        0,
        oppProgress.currentLoopProgress - Math.ceil(option.value * 0.25)
      ),
    },
  };
}
      const nextDecisionSignature = {
        ...state.decisionSignature,
        [me]: updateDecisionSignature(state.decisionSignature[me], {
          pieceKind: activePiece,
          choice: option.choice,
          meaning: option.meaning,
          didCapture,
          allOptions,
        }),
      };

      const karma = computeKarmaTurn({
        lastMove: state.lastMove,
        currentMove: option,
        didCapture,
        realm: currentRealm,
        decisionSignature: nextDecisionSignature[me],
        capturedPieceKind,
      });

      const nextBehavior = behaviorAfterMove({
        behavior: state.behavior,
        player: me,
        from: fromPos,
        to: finalToPos,
        didCapture,
        trackSize: state.trackSize,
      });

      // v6 — Victory Architecture (RFC v1.1 sección 6, módulo separado
      // en src/game/victory/nirvana.ts). Reemplaza el placeholder
      // "llegar al final de la pista" por la condición real: Whitman
      // alcanzado + 6 Avatares propios en Humans + Karma (stub READY).
      // Se comprueba al final del turno del jugador activo, como pedía
      // la RFC — el propio move que se está resolviendo ya dejó el
      // estado de piezas actualizado más abajo (nextPiecesRealm), así
      // que la formación se evalúa sobre ese estado ya movido, no
      // sobre el previo.
      const stateAfterThisMove: GameState = {
        ...state,
        pieces: nextPieces,
        realmPieces: nextPiecesRealm,
        realmProgress: {
          ...state.realmProgress,
          [me]: { ...state.realmProgress[me], currentRealmStep: nextRealmStep },
        },
      };
      const didWin = checkNirvana(stateAfterThisMove, me);

      // DEBUG TEMPORAL (13 agosto 2026) — Federico reportó: 6 Avatares
      // negros ya en Humans (2 pilas) y la pantalla de victoria nunca
      // saltó. Este log se saca apenas se identifique la causa.
      console.log("[NIRVANA DEBUG]", {
        me,
        didWin,
        currentRealmStep: stateAfterThisMove.realmProgress[me].currentRealmStep,
        isVictoryEnabled: isVictoryEnabled(stateAfterThisMove, me),
        checkNirvanaFormation: checkNirvanaFormation(stateAfterThisMove, me),
        formationProgress: countNirvanaFormationProgress(stateAfterThisMove, me),
        nirvanaReadiness: getNirvanaReadiness(stateAfterThisMove, me),
        myRealmPieces: stateAfterThisMove.realmPieces[me],
      });

      const samePieceAlternatives = allOptions.filter(
        (o) => o.pieceKind === activePiece
      );

      const hadAlternative = samePieceAlternatives.length > 1;
      const chosenWasCapture = option.meaning === "IMPACT";

      const captureWasAvoidable =
        allOptions.some((o) => o.meaning === "IMPACT") && !chosenWasCapture;

      const patternNext = recordMove(state.pattern, {
        player: me,
        turnIndex: state.turnIndex,
        cycleIndex: state.cycleIndex,
        choice: option.choice,
        hadAlternative,
        chosenWasCapture,
        captureWasAvoidable,
        fromPos,
        toPos,
        // 2026-08-22: patternEngine.ts ahora importa el tipo correcto
        // (MuralZoneId de src/UI/realm.ts) en vez del Realm canonico de
        // game/types.ts, asi que este valor ya type-checkea de verdad
        // sin necesitar "as any" — mismo valor en runtime que siempre.
        fromRealm: realmFromPos(fromPos),
        toRealm: realmFromPos(finalToPos),
        // Paso 2 — con escudo, el Avatar capturado NO fue a Mara de
        // verdad (sobrevivio, ver bloque de reubicacion mas arriba) —
        // avatar_sent_to_mara seria un evento falso si se disparara
        // igual, y ademas encadenaria otro nacimiento de Nidana fisica
        // (ver mas abajo, nidanaSpawnTrigger) por algo que no paso.
        capturedAvatarThisMove: didCapture && capturedWasAvatar && shieldedNidana === null,
      });

      // v36 (12 agosto 2026) — decisión de diseño cerrada con
      // Federico/Chat: una Nidana solo puede mostrarse si lastEvents
      // contiene un evento generado EN ESTA JUGADA (no uno viejo que
      // sigue en la lista de los últimos 12) y ese tipo de evento tiene
      // correspondencia en NIDANA_BY_PATTERN_EVENT (mapa parcial —
      // IGNORANCE, NAME_AND_FORM, SIX_SENSES, CONTACT y BIRTH quedan
      // deliberadamente sin trigger por ahora). Si varios eventos
      // nuevos mapean en la misma jugada, se usa el primero (más
      // reciente) de la lista. Enfriamiento simple: no dos Nidanas
      // pegadas aunque dos eventos ocurran en turnos consecutivos.
      const MIN_TURNS_BETWEEN_NIDANAS = 4;

      const newEventsThisTurn = patternNext.lastEvents.filter(
        (ev) => ev.atTurn === state.turnIndex && ev.atCycle === state.cycleIndex
      );

      const mappedNidana = newEventsThisTurn
        .map((ev) => NIDANA_BY_PATTERN_EVENT[ev.type])
        .find((id): id is NonNullable<typeof id> => Boolean(id));

      const cooldownElapsed =
        state.turnIndex - state.lastNidanaAtTurn >= MIN_TURNS_BETWEEN_NIDANAS;

      const shouldShowNewNidana = Boolean(mappedNidana) && cooldownElapsed;

      if (shouldShowNewNidana) {
        nextNidanasActivated[me] += 1;
      }

      const nextCurrentNidana = shouldShowNewNidana
        ? mappedNidana!
        : state.currentNidana;

      const nextLastNidanaAtTurn = shouldShowNewNidana
        ? state.turnIndex
        : state.lastNidanaAtTurn;

      // Paso 1 — aparicion fisica: cuando esta jugada genero
      // exactamente uno de los dos eventos reales marcados como
      // disparador (avatar_sent_to_mara o realm_stuck — ver
      // newEventsThisTurn arriba, mismo filtro "ocurrio en esta
      // jugada exacta" que ya usa el popup narrativo), nace una
      // Nidana fisica en la casilla donde ocurrio el evento. Tipo
      // elegido al azar entre las 12 por ahora (regla 1 del paso 1 —
      // el diseño de CUAL Nidana nace segun el evento es un paso
      // futuro, no este). Si esa casilla ya tiene una ficha (Veneno o
      // Avatar, incluida la propia pieza que se acaba de mover ahi),
      // rebota a la mas cercana libre — reutiliza findEmptySpawnPos,
      // el mismo helper que ya usa el regreso de fichas desde Mara,
      // en vez de inventar una busqueda nueva.
      //
      // Nota/limite conocido, no resuelto por criterio propio:
      // findEmptySpawnPos no sabe de nextBoardNidanas — solo evita
      // pisar Venenos/Avatares. En el caso limite de que la casilla
      // libre encontrada ya tuviera otra Nidana sin recoger todavia,
      // esta la reemplaza. No cubierto por el diseño del paso 1;
      // reportado en el resumen final en vez de decidido aca.
      const nidanaSpawnTrigger = newEventsThisTurn.find(
        (ev) => ev.type === "avatar_sent_to_mara" || ev.type === "realm_stuck"
      );

      if (nidanaSpawnTrigger) {
        // v77 — mismo fix que el spawn de cada 3 lances: usa
        // nextBoardNidanas/nextAvatarNidana (el estado YA actualizado por
        // esta jugada, no el de antes de moverse) para no repetir un tipo
        // que ya está en juego.
        const randomNidana = pickUnusedNidana(nextBoardNidanas, nextAvatarNidana);
        if (randomNidana) {
          const nidanaSpawnPos = findEmptySpawnPos(
            {
              pieces: nextPieces,
              realmPieces: nextPiecesRealm,
              trackSize: state.trackSize,
            } as GameState,
            finalToPos
          );
          nextBoardNidanas = {
            ...nextBoardNidanas,
            [nidanaSpawnPos]: randomNidana,
          };
        }
      }

      const nextTurn = didWin ? me : opp;
      const nextTurnIndex = state.turnIndex + 1;
      const nextCycleIndex =
        state.turn === "P2" ? state.cycleIndex + 1 : state.cycleIndex;

      const nextLedgerOpen = state.ledgerOpen;
      const nextLedgerEntry = state.ledgerEntry;

      // ===== COLLAPSE (5+) =====
      let nextPiecesAfterCollapse = nextPieces;

// comprobar si hay stacks >= 5
const countByPos: Record<number, number> = {};

for (const player of ["P1", "P2"] as PlayerId[]) {
  for (const kind of BASE_PIECES) {
    const p = nextPieces[player][kind];
    if (p.inLimbo) continue;

    countByPos[p.pos] = (countByPos[p.pos] || 0) + 1;
  }
}

const shouldCollapse = Object.values(countByPos).some((c) => c >= 5);

if (shouldCollapse) {
  const collapseResult = applyCollapseIfNeeded(nextPieces);
  nextPiecesAfterCollapse = collapseResult.pieces;
  nextMaraVisits.P1 += collapseResult.collapsedCounts.P1;
  nextMaraVisits.P2 += collapseResult.collapsedCounts.P2;
}
      const nextVenomTrio = detectVenomTrio(nextPiecesAfterCollapse);

      // v5 — Acto 0: eventos de novedad (ver ROLL más arriba para hasRolled
      // / hasMaraReturn). Aquí se encienden los otros dos.
      const nextGenesisNovelty = {
        ...state.genesisNovelty,
        hasMoved: true,
        hasCaptured: state.genesisNovelty.hasCaptured || didCapture,
      };

      const nextBrunoRevealed =
        state.brunoRevealed ||
        evaluateGenesisToBruno({
          ...state,
          decisionSignature: nextDecisionSignature,
          genesisNovelty: nextGenesisNovelty,
        });

      // v15 (10 agosto 2026) — mismo paquete completo de nacimiento de
      // Bruno que ya existe en case "ROLL", replicado aquí. Caso límite
      // real: si hasMaraReturn ya estaba en true de antes (de un ciclo
      // de Mara anterior sin relación con Genesis) y las otras tres
      // condiciones se completan durante un CONSCIOUS_MOVE en vez de un
      // ROLL, la transición ocurre AQUÍ — y antes de este arreglo, este
      // camino solo tocaba el actor legacy sin renderizado, sin crear
      // la ficha real, el video, ni el reloj cósmico.
      const brunoJustRevealedInMove = !state.brunoRevealed && nextBrunoRevealed;

      if (brunoJustRevealedInMove) {
        // 2026-08-22: mismo caso que en "ROLL" más arriba en este
        // archivo — bruno siempre existe desde initialState, el tipo
        // Partial solo permite que TS no lo garantice.
        nextActors.bruno = { ...nextActors.bruno!, unlocked: true };

        const searchBaseForBruno: GameState = {
          ...state,
          pieces: nextPieces,
          realmPieces: nextPiecesRealm,
        };

        const p1SpawnPos = nextPiecesRealm.P1.hungry_ghost
          ? nextPiecesRealm.P1.hungry_ghost.pos
          : findEmptySpawnPos(searchBaseForBruno, 0);

        nextPiecesRealm.P1 = {
          ...nextPiecesRealm.P1,
          hungry_ghost: nextPiecesRealm.P1.hungry_ghost ?? {
            id: "P1-hungry_ghost",
            kind: "hungry_ghost" as RealmPieceKind,
            pos: p1SpawnPos,
            inLimbo: false,
            maraLevel: null,
            unlocked: true,
          },
        };

        const searchBaseForBrunoP2: GameState = {
          ...searchBaseForBruno,
          realmPieces: { ...searchBaseForBruno.realmPieces, P1: nextPiecesRealm.P1 },
        };

        nextPiecesRealm.P2 = {
          ...nextPiecesRealm.P2,
          hungry_ghost: nextPiecesRealm.P2.hungry_ghost ?? {
            id: "P2-hungry_ghost",
            kind: "hungry_ghost" as RealmPieceKind,
            pos: findEmptySpawnPos(searchBaseForBrunoP2, 12),
            inLimbo: false,
            maraLevel: null,
            unlocked: true,
          },
        };
      }

      const nextCosmicClockForBrunoInMove = brunoJustRevealedInMove
        ? { era: "bruno" as const, progress: 0, transitionSequence: state.cosmicClock.transitionSequence + 1 }
        : nextCosmicClock;

      const nextRealmAscensionForBrunoInMove = brunoJustRevealedInMove
        ? { player: me, realmStep: 1, realmKey: "hungry_ghost" as RealmPieceKind, at: Date.now() }
        : undefined; // undefined = dejar que el cálculo normal de más abajo decida

      if (brunoJustRevealedInMove) {
        nextRealmProgress = {
          ...nextRealmProgress,
          P1: { ...nextRealmProgress.P1, stageStartedAtRoll: state.globalRollCount },
          P2: { ...nextRealmProgress.P2, stageStartedAtRoll: state.globalRollCount },
        };
      }

      return {
        ...state,
        pieces: nextPiecesAfterCollapse,
        realmPieces: nextPiecesRealm,
        captures: nextCaptures,
        maraVisits: nextMaraVisits,
        nidanasActivated: nextNidanasActivated,
        actors: nextActors,
        curvature: nextCurvature,
        realmProgress: nextRealmProgress,
        cosmicClock: nextCosmicClockForBrunoInMove,
        genesisNovelty: nextGenesisNovelty,
        brunoRevealed: nextBrunoRevealed,
        justReturnedFromMara: nextJustReturnedFromMara,
        // v27 — regla E del diseño cerrado: al resolver un movimiento,
        // se limpia la selección para el siguiente turno (Avatar vuelve
        // al valor por defecto, Veneno elegido se borra). Sin efecto
        // real en Fase 1 (ahí nada depende de que persista entre
        // movimientos).
        selectedPiece: {
          ...state.selectedPiece,
          [me]: "pig",
        },
        selectedVenom: {
          ...state.selectedVenom,
          [me]: null,
        },
// v15 (10 agosto 2026) — bug real reproducido: antes esto forzaba
// realmAscension a null en CADA movimiento que no fuera él mismo una
// ascensión — es decir, borraba el evento un turno después de que
// naciera. En un navegador real eso puede alcanzar a dispararse (si
// App.tsx procesa el efecto antes del siguiente movimiento), pero no
// es confiable, y en la reproducción directa contra el reducer el
// evento se perdía en cuanto el jugador hacía su siguiente jugada
// normal. No hay ninguna razón para resetearlo — el dedup del video
// ya lo maneja un ref en App.tsx (playedRealmIntrosRef), así que aquí
// solo hace falta conservar el último evento, no borrarlo.
realmAscension: nextRealmAscensionForBrunoInMove ?? (didAscendRealm && unlockedRealmKey
  ? {
      player: me,
      realmStep: nextRealmStep,
      realmKey: unlockedRealmKey,
      at: Date.now(),
    }
  : state.realmAscension),
        behavior: nextBehavior,
        pattern: patternNext,
        currentNidana: nextCurrentNidana,
        lastNidanaAtTurn: nextLastNidanaAtTurn,
        boardNidanas: nextBoardNidanas,
        avatarNidana: nextAvatarNidana,
        decisionSignature: nextDecisionSignature,
        lastKarma: karma,
        karmaTotal: {
          ...state.karmaTotal,
          [me]: state.karmaTotal[me] + karma.total,
        },
        turnIndex: nextTurnIndex,
        cycleIndex: nextCycleIndex,
        turn: nextTurn,
        winner: didWin ? me : state.winner,
        venomTrio: nextVenomTrio,
        lastMove: {
          at: Date.now(),
          player: me,
          pieceKind: activePiece,

          // v2: Avatar activo y Veneno usado (para KarmaEngine v2)
          avatarId: state.actors.bruno?.owner === me && state.actors.bruno?.unlocked
            ? "bruno"
            : undefined,
          // v3 — Actualización Crítica (D-007): el Veneno usado es el propio
          // (Fase 1, moviéndose por sí mismo) o el que originó el destino
          // del Avatar (option.venomId, ver getMoveOptionsForPlayer v3).
          venomUsed: isBasePiece
            ? (activePiece as import("../actors/actorProfiles").VenomId)
            : (option.venomId as import("../actors/actorProfiles").VenomId | undefined),

          // v3: posición del Veneno antes y después — fromPos/finalToPos ya
          // representan la posición del Veneno en ambos casos (ver arriba).
          venomPositionBefore:
            isBasePiece || option.venomId ? fromPos : undefined,
          venomPositionAfter:
            isBasePiece || option.venomId ? finalToPos : undefined,

          // v2: datos para detección de capturas declinadas (D-018)
          captureWasAvailable: allOptions.some(o => o.meaning === "IMPACT"),
          legalCapturesCount: allOptions.filter(o => o.meaning === "IMPACT").length,
          turnLost: false,

          a,
          b,
          chosenValue: option.value,
          choice: option.choice,
          meaning: option.meaning,
          fromPos,
          toPos: finalToPos,
          didCapture,
          capturedPieceKind,
          // 2026-08-22: lastMove.fromRealm/toRealm declaran el Realm
          // CANONICO (game/types.ts), no el vocabulario interno del mural
          // (MuralZoneId). Antes esto guardaba realmFromPos() (NARAKA/
          // PRETA/...) tapado con "as any" — nada rama sobre ese valor
          // hoy (KarmaEngine.ingest lo trata como string opaco, y
          // pushExportEvent solo lo exporta), asi que no cambiaba el
          // comportamiento del juego, pero sí dejaba el log/export con
          // el nombre interno en vez del nombre real del reino. Se usa
          // el puente correcto para que ambos coincidan con la verdad.
          fromRealm: canonicalRealmFromPos(fromPos),
          toRealm: canonicalRealmFromPos(finalToPos),
          turnIndex: nextTurnIndex,
          cycleIndex: nextCycleIndex,
          level: state.level,
          availableOptions: allOptions,
          availableOptionsCount: allOptions.length,
        },
        activeNidanaEffect: null,
        ledgerOpen: nextLedgerOpen,
        ledgerEntry: nextLedgerEntry,
        phase: "idle",
        rollOptions: null,
      };
    }

    default:

      return state;
  }
}