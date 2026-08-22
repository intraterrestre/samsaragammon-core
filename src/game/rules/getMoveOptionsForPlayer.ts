// src/game/rules/getMoveOptionsForPlayer.ts
// v2: destinos calculados desde posición del VENENO (no del Avatar)
//     soporte de dirección opuesta entre jugadores

import type {
  BasePieceKind,
  GameState,
  MoveMeaning,
  MoveOption,
  PieceKind,
  PlayerId,
  RealmPieceKind,
} from "../types";
import { REALM_PIECE_ORDER } from "../types";
import { previewMove } from "./preview";
import { applyRealmEffect } from "../realm/realmEffects";
import { getUnlockedBasePieces } from "../era";
import {
  getPositionalImpulse,
  mustMoveDueToPig,
  wouldEndStacked,
} from "./venomImpulse";

const BASE_PIECES: BasePieceKind[] = ["pig", "snake", "rooster"];

const ACTIVE_BASE_PIECES: BasePieceKind[] = getUnlockedBasePieces(BASE_PIECES);

// REALM_PIECE_ORDER importado de types.ts (fuente única — ver reducer.ts).
const REALM_PIECES: RealmPieceKind[] = REALM_PIECE_ORDER;

const isBasePiece = (kind: PieceKind): kind is BasePieceKind =>
  BASE_PIECES.includes(kind as BasePieceKind);

const otherPlayer = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

// v2: P1 va horario, P2 va antihorario
function getPlayerDirection(
  player: PlayerId
): "clockwise" | "counterclockwise" {
  return player === "P1" ? "clockwise" : "counterclockwise";
}

function resolveFinalPreviewPos(params: {
  fromPos: number;
  value: number;
  trackSize: number;
  level: number;
  player: PlayerId;
}): number {
  const direction = getPlayerDirection(params.player);

  // v2: usar previewMove con dirección
  const basePos = previewMove(
    params.fromPos,
    params.value,
    params.trackSize,
    direction
  );

  const realmEffect = applyRealmEffect({
    level: params.level,
    trackSize: params.trackSize,
    toPos: basePos,
    didCapture: false,
    mover: params.player,
  });

  return typeof realmEffect.finalPos === "number"
    ? realmEffect.finalPos
    : basePos;
}

function countEnemyPiecesAtPos(
  state: GameState,
  player: PlayerId,
  targetPos: number
): number {
  const opp = otherPlayer(player);

  // v27 (11 agosto 2026) — revertido el v25: los Venenos NO desaparecen
  // en Fase 2, siguen siendo piezas físicas reales con posición en el
  // tablero (decisión cerrada con Federico/Chat: "conservan una
  // posición física real"). Solo pierden la capacidad de iniciar un
  // movimiento por su cuenta — eso se controla en getMoveOptionsForPlayer,
  // no aquí.
  const enemyVenoms = ACTIVE_BASE_PIECES.filter((kind) => {
    const piece = state.pieces[opp][kind];
    return !piece.inLimbo && piece.pos === targetPos;
  }).length;

  // v6 — Avatar-vs-Avatar (D-014): antes esta función solo contaba
  // Venenos, así que la UI nunca marcaba ni bloqueaba correctamente un
  // Avatar rival en la casilla de destino. Debe contar lo mismo que
  // cuenta el reducer al resolver el movimiento real.
  const enemyRealmPieces = REALM_PIECE_ORDER.filter((kind) => {
    const piece = state.realmPieces[opp]?.[kind];
    return piece && piece.unlocked && !piece.inLimbo && piece.pos === targetPos;
  }).length;

  return enemyVenoms + enemyRealmPieces;
}

// v28 (11 agosto 2026) — decisión de diseño cerrada: "un Avatar más su
// Veneno cuentan solo los Avatares por pares — la regla de backgammon
// (2+ = bloqueado) pasa a los Avatares solamente". Cuenta SOLO para el
// umbral de bloqueo (2+) — countEnemyPiecesAtPos arriba sigue contando
// todo (Venenos + Avatares) para la detección de IMPACT (1 sola pieza
// enemiga, capturable), que no cambia.
function countEnemyAvatarsForBlocking(
  state: GameState,
  player: PlayerId,
  targetPos: number
): number {
  const opp = otherPlayer(player);
  const oppPhase2 = state.realmProgress[opp].currentRealmStep >= 3;

  if (!oppPhase2) return countEnemyPiecesAtPos(state, player, targetPos);

  return REALM_PIECE_ORDER.filter((kind) => {
    const piece = state.realmPieces[opp]?.[kind];
    return piece && piece.unlocked && !piece.inLimbo && piece.pos === targetPos;
  }).length;
}

function inferMeaning(
  target: number,
  enemyCountAtTarget: number,
  enemyPositions: number[],
  isSame: boolean
): MoveMeaning {
  if (isSame) return "SAME";
  if (enemyCountAtTarget === 1) return "IMPACT";
  if (enemyPositions.some((p) => Math.abs(p - target) <= 1)) return "RISK";
  return "";
}

function pushMoveIfLegal(params: {
  state: GameState;
  options: MoveOption[];
  player: PlayerId;
  pieceKind: PieceKind;
  choice: MoveOption["choice"];
  value: number;
  fromPos: number;  // posición del Veneno (origen del movimiento)
  toPos: number;
  enemyPositions: number[];
  isSame?: boolean;
  venomId?: BasePieceKind; // v3: Veneno cuya posición originó este destino
}) {
  const blockingCount = countEnemyAvatarsForBlocking(
    params.state,
    params.player,
    params.toPos
  );

  // 2+ enemigos = casilla bloqueada (solo Avatares desde Fase 2, ver
  // countEnemyAvatarsForBlocking)
  if (blockingCount >= 2) return;

  const enemyCount = countEnemyPiecesAtPos(
    params.state,
    params.player,
    params.toPos
  );

  const meaning = inferMeaning(
    params.toPos,
    enemyCount,
    params.enemyPositions,
    params.isSame ?? false
  );

  // v49 — Rooster/Snake v0 ("physics not powers"): solo aplica a Avatares
  // (RealmPieceKind) moviéndose en Fase 2. Antes de Oriol los Venenos son
  // piezas físicas normales y no hay Avatar seleccionado al que aplicarle
  // un impulso posicional — ver venomImpulse.ts.
  if (!isBasePiece(params.pieceKind)) {
    const avatarKind = params.pieceKind as RealmPieceKind;
    const impulse = getPositionalImpulse(params.state, params.player, avatarKind);

    if (
      impulse === "ROOSTER" &&
      wouldEndStacked(params.state, params.player, avatarKind, params.toPos)
    ) {
      // ROOSTER v0: estaba apilado — si se mueve, no puede terminar
      // apilado de nuevo con otro Avatar propio.
      return;
    }

    if (impulse === "SNAKE" && meaning === "IMPACT") {
      // SNAKE v0: estaba solo — no puede capturar.
      return;
    }
  }

  params.options.push({
    pieceKind: params.pieceKind,
    choice: params.choice,
    value: params.value,
    fromPos: params.fromPos,
    toPos: params.toPos,
    venomId: params.venomId,
    meaning,
  });
}

// v3 — Actualización Crítica (RFC v0.9→v1.0, D-001/D-014): el destino de un
// Avatar se calcula desde la posición del VENENO elegido, no de la propia.
// Genera las opciones A/B/ECO/AB para un único origen (la posición de un
// Veneno concreto, o la del propio Veneno cuando es él quien se mueve en
// Fase 1). El Avatar viaja al mismo destino que el Veneno elegido.
function pushOptionsFromOrigin(params: {
  state: GameState;
  options: MoveOption[];
  player: PlayerId;
  pieceKind: PieceKind;
  fromPos: number;
  a: number;
  b: number;
  isDouble: boolean;
  enemyPositions: number[];
  venomId?: BasePieceKind;
}) {
  const { state, options, player, pieceKind, fromPos, a, b, isDouble, enemyPositions, venomId } = params;

  const toA = resolveFinalPreviewPos({
    fromPos,
    value: a,
    trackSize: state.trackSize,
    level: state.level,
    player,
  });

  pushMoveIfLegal({
    state,
    options,
    player,
    pieceKind,
    choice: "A",
    value: a,
    fromPos,
    toPos: toA,
    enemyPositions,
    venomId,
  });

  if (!isDouble) {
    const toB = resolveFinalPreviewPos({
      fromPos,
      value: b,
      trackSize: state.trackSize,
      level: state.level,
      player,
    });

    pushMoveIfLegal({
      state,
      options,
      player,
      pieceKind,
      choice: "B",
      value: b,
      fromPos,
      toPos: toB,
      enemyPositions,
      venomId,
    });

    if (toA === toB) {
      pushMoveIfLegal({
        state,
        options,
        player,
        pieceKind,
        choice: "ECO",
        value: a,
        fromPos,
        toPos: toA,
        enemyPositions,
        isSame: true,
        venomId,
      });
    }
  }

  if (state.level >= 3) {
    const sum = a + b;

    const toAB = resolveFinalPreviewPos({
      fromPos,
      value: sum,
      trackSize: state.trackSize,
      level: state.level,
      player,
    });

    pushMoveIfLegal({
      state,
      options,
      player,
      pieceKind,
      choice: "AB",
      value: sum,
      fromPos,
      toPos: toAB,
      enemyPositions,
      venomId,
    });
  }
}

// 2026-08-23 — extraído de getMoveOptionsForPlayer (mismo cuerpo, sin
// cambios de comportamiento) para que getPigForcedAvatar (más abajo)
// pueda calcular las mismas opciones "en bruto" (antes del filtro final
// por Avatar+Veneno seleccionados) sin duplicar esta lógica. Reportado
// por Federico: eligió un Avatar y probó los 3 Venenos sin obtener
// ninguna opción — resultó ser la regla PIG (ver venomImpulse.ts)
// forzando en silencio a OTRO Avatar (uno que volvió de Mara hace
// turnos y nunca fue elegido), sin ningún indicio visual de cuál era.
function buildRawOptions(
  state: GameState,
  player: PlayerId
): { options: MoveOption[]; phase2: boolean } {
  const [a, b] = state.rollOptions!;
  const isDouble = a === b;
  const opp = otherPlayer(player);

  // v25 (10 agosto 2026) — decisión de diseño cerrada con Federico:
  // desde que aparece Oriol (3er Avatar) en adelante, los Venenos dejan
  // de ser piezas móviles independientes y pasan a ser SOLO motores de
  // cálculo para los Avatares — global al jugador, no por Avatar
  // individual. Antes de Oriol (Bruno, Margot) siguen siendo piezas
  // físicas normales, igual que hoy. Mismo umbral que ya se usa para
  // nidanas/buda (currentRealmStep >= 3).
  const phase2 = state.realmProgress[player].currentRealmStep >= 3;

  // v27 — revertido el v25: los Venenos rivales siguen contando para
  // enemyPositions (posición física real), sin importar la fase.
  const enemyPositions = [
    ...ACTIVE_BASE_PIECES.filter(
      (kind) => !state.pieces[opp][kind].inLimbo
    ).map((kind) => state.pieces[opp][kind].pos),
    ...REALM_PIECE_ORDER.filter((kind) => {
      const p = state.realmPieces[opp]?.[kind];
      return p && p.unlocked && !p.inLimbo;
    }).map((kind) => state.realmPieces[opp]![kind]!.pos),
  ];

  const options: MoveOption[] = [];

  const activePieceKinds: PieceKind[] = phase2
    ? REALM_PIECES.filter(
        (kind) => state.realmPieces[player]?.[kind]?.unlocked
      )
    : [
        ...ACTIVE_BASE_PIECES,
        ...REALM_PIECES.filter(
          (kind) => state.realmPieces[player]?.[kind]?.unlocked
        ),
      ];

  for (const pieceKind of activePieceKinds) {
    if (isBasePiece(pieceKind)) {
      // Solo se llega aquí cuando !phase2 — en Fase 2, activePieceKinds
      // ya excluye los Venenos por completo (ver arriba).
      // Es un Veneno moviéndose por sí mismo (Fase 1: PHYSICAL_CAPTURABLE,
      // Fase 2: PHYSICAL_MOBILE). Origen = su propia posición.
      const piece = state.pieces[player][pieceKind];
      if (!piece || piece.inLimbo) continue;

      pushOptionsFromOrigin({
        state,
        options,
        player,
        pieceKind,
        fromPos: piece.pos,
        a,
        b,
        isDouble,
        enemyPositions,
      });

      continue;
    }

    // v3 — Actualización Crítica: es un Avatar (realm piece). El destino se
    // calcula desde la posición de CADA Veneno propio, no de la posición del
    // Avatar. Cuando el jugador elige una de estas opciones, ese Veneno se
    // mueve junto con el Avatar (ver reducer CONSCIOUS_MOVE, option.venomId).
    // Esto no cambia en Fase 2 — el Veneno sigue siendo el "motor" del
    // cálculo, solo que ya no aparece como pieza jugable por su cuenta.
    const realmPiece = state.realmPieces[player]?.[pieceKind];
    if (!realmPiece || realmPiece.inLimbo) continue;

    for (const venomId of ACTIVE_BASE_PIECES) {
      const venomPiece = state.pieces[player][venomId];
      if (!venomPiece || venomPiece.inLimbo) continue;

      pushOptionsFromOrigin({
        state,
        options,
        player,
        pieceKind,
        fromPos: venomPiece.pos,
        a,
        b,
        isDouble,
        enemyPositions,
        venomId,
      });
    }
  }

  return { options, phase2 };
}

// 2026-08-23 — ver comentario de buildRawOptions arriba. Devuelve qué
// Avatar (si alguno) está forzado por la regla PIG este turno, para que
// la UI pueda avisarlo — sin esto, elegir cualquier OTRO Avatar y probar
// los 3 Venenos no da nunca ninguna opción, sin ninguna pista de por qué.
// Null si no hay tirada, si todavía no es Fase 2 (PIG no aplica antes de
// Oriol) o si no hay ningún Avatar forzado en este turno.
export function getPigForcedAvatar(
  state: GameState,
  player: PlayerId
): RealmPieceKind | null {
  if (!state.rollOptions) return null;

  const { options, phase2 } = buildRawOptions(state, player);
  if (!phase2) return null;

  return (
    REALM_PIECE_ORDER.find(
      (kind) =>
        mustMoveDueToPig(state, player, kind) &&
        options.some((o) => o.pieceKind === kind)
    ) ?? null
  );
}

export function getMoveOptionsForPlayer(
  state: GameState,
  player: PlayerId
): MoveOption[] {
  if (!state.rollOptions) return [];

  const { options, phase2 } = buildRawOptions(state, player);

  if (!phase2) return options;

  // v27 (11 agosto 2026) — decisión de diseño cerrada con Federico/Chat:
  // en Fase 2 la selección es AVATAR + VENENO acumulados en dos clics
  // (ver reducer, case SELECT_PIECE). Sin un Avatar propio válido
  // seleccionado, no se muestra ninguna opción. Con Avatar pero sin
  // Veneno todavía, TAMPOCO se muestra ninguna — las líneas de destino
  // solo aparecen una vez elegidos los dos (regla 6 del diseño: "no
  // mostraría las tres líneas antes de elegir Veneno").
  const selectedAvatar = state.selectedPiece[player];
  const isValidAvatarSelected =
    !isBasePiece(selectedAvatar as PieceKind) &&
    REALM_PIECE_ORDER.includes(selectedAvatar as RealmPieceKind) &&
    Boolean(
      state.realmPieces[player]?.[selectedAvatar as RealmPieceKind]?.unlocked
    );

  if (!isValidAvatarSelected) return [];

  // v49 — PIG v0 ("physics not powers"): si algún Avatar propio recién
  // vuelto de Mara tiene al menos una opción legal en este turno, el
  // jugador está obligado a elegir ESE Avatar — cualquier otra selección
  // no produce opciones, como si no hubiera movimiento legal para ella.
  // Lo que ese Avatar pueda hacer una vez elegido (capturar, apilarse...)
  // lo deciden Rooster/Snake normalmente si aplican (ver venomImpulse.ts:
  // son capas distintas, selección vs. resultado, no una cadena de
  // prioridad).
  const pigForcedAvatar = REALM_PIECE_ORDER.find(
    (kind) =>
      mustMoveDueToPig(state, player, kind) &&
      options.some((o) => o.pieceKind === kind)
  );

  if (pigForcedAvatar && selectedAvatar !== pigForcedAvatar) return [];

  const selectedVenom = state.selectedVenom[player];
  if (!selectedVenom) return [];

  return options.filter(
    (o) => o.pieceKind === selectedAvatar && o.venomId === selectedVenom
  );
}
