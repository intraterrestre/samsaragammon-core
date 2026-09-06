import { useEffect, useRef, useState } from "react";
import type { GameState, MoveOption, PieceKind, BasePieceKind, PlayerId, RealmPieceKind, RealmPieceState } from "./types";
import { REALM_PIECE_ORDER } from "./types";
import {  cellStyle as ringCellStyle, RING_SIZE,  piecePosition,} from "../UI/geometry";
import { realmFromPos, REALM_LABEL, pickLine } from "../UI/realm";
import { ExplainModal } from "../UI/ExplainModal";
import { MoveEmanations } from "../UI/MoveEmanations";
import { MoveOptionsPanel } from "../UI/MoveOptionsPanel";
import budaKarmaER from "../assets/tokens/buda-karma-er.webp";
import BigHeadSchoolOverlay from "../UI/BigHeadSchoolOverlay";
import { getUnlockedBasePieces } from "./era";
import { NIDANA_FRONT_IMAGE, NIDANA_BACK_IMAGE } from "./nidanaAssets";
import { NIDANA_NUMBER_IMAGE, NIDANA_NUMBER } from "./nidanaNumberAssets";
import { NIDANAS } from "./nidanas";
import type { NidanaId } from "./nidanas";
import { STONE_GRADIENT, STONE_RING, STONE_SHADOW } from "./dice/stoneDiceStyle";

// 🔥 FICHAS
import pigWhite from "../assets/pieces/pig_white.webp";
import pigBlack from "../assets/pieces/pig_black.webp";
import roosterWhite from "../assets/pieces/rooster_white.webp";
import roosterBlack from "../assets/pieces/rooster_black.webp";
import cobraWhite from "../assets/pieces/cobra_white.webp";
import cobraBlack from "../assets/pieces/cobra_black.webp";

// 🔊 SONIDOS
// v22 (10 agosto 2026) — capture_white.mp3 confirmado sin audio real
// (silencioso). Federico pidió usar capture_black.mp3 para los dos
// hasta tener un archivo blanco de verdad.
import captureWhite from "../assets/sounds/capture_black.mp3";
import captureBlack from "../assets/sounds/capture_black.mp3";
import moveSound from "../assets/sounds/move.mp3";

import brunoP1 from "../assets/tokens/bruno_P1.webp";
import brunoP2 from "../assets/tokens/bruno_P2.webp";

import margotP1 from "../assets/tokens/margot_P1.webp";
import margotP2 from "../assets/tokens/margot_P2.webp";

import marinoP1 from "../assets/tokens/marino_P1.webp";
import marinoP2 from "../assets/tokens/marino_P2.webp";

import oriolP1 from "../assets/tokens/oriol_P1.webp";
import oriolP2 from "../assets/tokens/oriol_P2.webp";

import rufusP1 from "../assets/tokens/rufus_P1.webp";
import rufusP2 from "../assets/tokens/rufus_P2.webp";

import whitmanP1 from "../assets/tokens/whitman_P1.webp";
import whitmanP2 from "../assets/tokens/whitman_P2.webp";

// 🎲 Previous dice art — retired from the active roll button for this sprint
// (see point 4 of the Genesis Intro brief) but kept imported/usable so a
// future era can bring the spinning portal dice back.
import diceWhitePortal from "../assets/dice/dice_white_portal.webp";
import diceBlackPortal from "../assets/dice/dice_black_portal.webp";

// Real reference photo for the Primitive Era roll-button icon (pitted stone
// dice pair), dropped in by hand — see src/assets/dice/primitive/.
import diceGenesisStonePair from "../assets/dice/primitive/dice_genesis_1.webp";

// 2026-08-05: el usuario reemplazó dice_white_portal.webp por una foto de
// dados de mármol a juego con el arte de piedra del Génesis (dice_black_portal
// se queda como estaba, según pidió). Se activa esta rama para que el dado
// del botón cambie de foto según el turno (state.turn === "P1" -> blanco,
// si no -> negro) en cada clic, en vez de mostrar el par estático de arriba.
const USE_LEGACY_PORTAL_DICE_ART = true;

// Flip this to `true` to fall back to the CSS-drawn stone circles below
// instead of the real photo, e.g. if the photo asset is ever missing.
const USE_CSS_STONE_ICON_FALLBACK = false;

// CSS approximation of a carved-stone dice pair (see
// src/game/dice/stoneDiceStyle.ts) — superseded by the real photo above,
// kept as a fallback so the roll button still has *something* if the photo
// asset is removed.
function StoneDiceIcon({ color }: { color: "white" | "black" }) {
  return (
    <div
      style={{
        width: "42%",
        height: "68%",
        borderRadius: "50%",
        background: STONE_GRADIENT[color],
        border: `1px solid ${STONE_RING[color]}`,
        boxShadow: STONE_SHADOW,
        flexShrink: 0,
      }}
    />
  );
}

type Props = {
  state: GameState;
  // 2026-08-22: estaba tipado como (piece: string) => void — demasiado
  // amplio. GameShell.tsx pasa un callback (piece: PieceKind) => void
  // (su Props ya lo declara así). Los dos únicos call sites internos
  // (onSelectPiece?.(kind) con kind: BasePieceKind, y
  // onSelectPiece?.(piece.kind) con piece.kind: RealmPieceKind) nunca
  // pasan nada fuera de PieceKind = BasePieceKind | RealmPieceKind.
  onSelectPiece?: (piece: PieceKind) => void;
  hoveredOption?: MoveOption | null;
  moveOptions?: MoveOption[];
  onChooseMove?: (option: MoveOption, allOptions: MoveOption[]) => void;
  onSendEmoji?: (emoji: string) => void;
  onRoll?: () => void;
  nidanaCoinSrc?: string | null;
  nidanaCoinSide?: "front" | "back";
  nidanaCoinId?: number | null;
  genesisComplete?: boolean;
  // true una vez terminó el video intro de Genesis (fase CASILLAS o
  // COMPLETE). Controla cuándo arranca la animación de giro del dado y
  // cuándo se muestra el hint de "toca aquí".
  genesisVideoDone?: boolean;
  // clics del dado durante Genesis (antes de genesisComplete). Se usa
  // para ocultar el hint de mano apenas el jugador toca el dado una vez.
  genesisClickCount?: number;
  // 2026-08-05: tras las 24 casillas verdes, dos clics más revelan los
  // Venenos de cada jugador por separado (blanco primero, luego negro)
  // en vez de aparecer los 6 juntos. Ver GameShell.tsx.
  p1VenomsRevealed?: boolean;
  p2VenomsRevealed?: boolean;
  // 2026-08-05: el buda azul (Dharma Emergencies) ya no aparece con
  // genesisComplete — recién con la entrada real de Oriol. Ver GameShell.tsx.
  oriolEntered?: boolean;
};
// Era 1 (Ignorance) gate: only unlocked base pieces render on the board or
// can be clicked/selected. Snake and Rooster stay fully coded (imports,
// styles, sort keys, etc. are untouched below) — they're just filtered out
// of the active render list until a later era unlocks them.
// 2026-08-22: tipado como PieceKind[] (union con hungry_ghost/hell/...)
// aunque getUnlockedBasePieces() SOLO puede devolver BasePieceKind[] —
// eso es lo que TS7053 señalaba mas abajo, cada vez que se usa esta
// lista para indexar state.pieces[player][kind] (que solo tiene
// pig/snake/rooster). Mismos valores en runtime, tipo correcto.
const ACTIVE_PIECE_KINDS: BasePieceKind[] = getUnlockedBasePieces(
  ["pig", "snake", "rooster"] as BasePieceKind[]
);

// Visual size per base piece. Pig is enlarged vs. the previous uniform
// 50px so it reads clearly as the sole active drive of Era 1. Capped at
// 90px: the ring sits close to the top/bottom edge of the scaled
// samsaraScene (which clips overflow), so anything much bigger than this
// gets its head cut off on the topmost/bottommost cells. Snake/Rooster
// keep the original size for whenever their era switches them back on.
//
// v42 (13 agosto 2026) — pedido de Federico: el cochino grande es una
// metáfora de la Era 1 (Bruno, todavía "ignorante" — el cochino como
// único drive activo). Una vez que entra Margot, esa metáfora ya no
// aplica — el cochino debe verse igual que serpiente y gallo. Ver
// PIG_NORMAL_SIZE_ERA más abajo, donde se usa junto a state.cosmicClock.era.
const PIECE_VISUAL_SIZE: Record<BasePieceKind, number> = {
  pig: 90,
  snake: 50,
  rooster: 50,
};
const PIG_NORMAL_SIZE = 50;
const ERA_ORDER_FOR_PIG_SIZE = [
  "bruno",
  "margot",
  "oriol",
  "marino",
  "rufus",
  "whitman",
] as const;
const pieceShort = (k: PieceKind) => {
  if (k === "pig") return "P";
  if (k === "snake") return "S";
  return "R";
};
// v21 (10 agosto 2026) — exportado para que MaraPanel.tsx pueda
// mostrar Avatares capturados con su propia imagen (antes solo sabía
// dibujar Venenos — un Avatar capturado no aparecía en Mara, aunque el
// estado real ya lo movía por ahí correctamente).
export const REALM_TOKEN_MAP = {
  hungry_ghost: { P1: brunoP1, P2: brunoP2 },
  hell: { P1: margotP1, P2: margotP2 },
  animals: { P1: oriolP1, P2: oriolP2 },
  humans: { P1: marinoP1, P2: marinoP2 },
  asura: { P1: rufusP1, P2: rufusP2 },
  deva: { P1: whitmanP1, P2: whitmanP2 },
} as const;
function pieceSortKey(player: PlayerId, kind: PieceKind) {
  const playerOrder = player === "P1" ? 0 : 10;
  const kindOrder = kind === "pig" ? 0 : kind === "snake" ? 1 : 2;
  return playerOrder + kindOrder;
}

/* =====================================================
   /* =====================================================
   STACK ENGINE
   ===================================================== */

// v31 (11 agosto 2026) — getStackedTokenPosition/buildUnifiedStackMap
// se movieron a stacking.ts (lógica pura, sin imports de imágenes) para
// poder probarlas directamente. Mismo comportamiento, solo cambió dónde
// viven.
import { getStackedTokenPosition, buildUnifiedStackMap } from "./stacking";

export function Board({
  state,
  onSelectPiece,
  hoveredOption,
  // 2026-08-22: moveOptions?: MoveOption[] es opcional en Props, pero el
  // único caller real (GameShell.tsx) siempre pasa un array de verdad
  // (getMoveOptionsForPlayer(...) o []), nunca undefined — este default
  // solo blinda el caso teórico sin cambiar el comportamiento normal.
  moveOptions = [],
  onChooseMove,
  onRoll,
  nidanaCoinSrc,
  nidanaCoinSide,
  // nidanaCoinId?: number | null — sigue en el tipo Props (el padre
  // puede seguir mandandolo, App.tsx lo usa para calcular
  // nidanaCoinSrc), pero Board.tsx ya no lo necesita: el cartelito
  // title+body que lo usaba (NIDANA_EFFECT_LINES via cajaMagica) se
  // elimino en el Paso 1.2. No se desestructura para no dejar una
  // variable sin usar.
  genesisComplete = false,
  genesisVideoDone = false,
  genesisClickCount = 0,
  p1VenomsRevealed = false,
  p2VenomsRevealed = false,
  oriolEntered = false,
}: Props){

  const captureAudioWhite = useRef<HTMLAudioElement | null>(null);
  const captureAudioBlack = useRef<HTMLAudioElement | null>(null);
  const moveAudio = useRef<HTMLAudioElement | null>(null);

const [explainOpen, setExplainOpen] = useState(false);
const [explainPlayer] = useState<PlayerId>("P1");

const [impactPos, setImpactPos] = useState<number | null>(null);
const [flashCell, setFlashCell] = useState<number | null>(null);

const [ghost, setGhost] = useState<string | null>(null);
const ghostTimer = useRef<number | null>(null);

const [beat, setBeat] = useState(false);
const beatTimer = useRef<number | null>(null);

  // 🔊 INICIALIZAR AUDIOS

  useEffect(() => {
    captureAudioWhite.current = new Audio(captureWhite);
    captureAudioBlack.current = new Audio(captureBlack);
    moveAudio.current = new Audio(moveSound);

    // v22 (10 agosto 2026) — Federico reportó "el efecto sonoro de
    // arrastre no suena". El archivo está bien (mismo hash que el que
    // subió como referencia) — el volumen estaba en 0.03 (3%),
    // prácticamente inaudible junto al resto de efectos. Subido a un
    // nivel audible pero discreto (suena en cada movimiento, más
    // seguido que una captura).
    // 2026-08-24 — Federico volvió a reportar "las capturas no suenan
    // y cuando se mueven las fichas no suena el arrastre" jugando una
    // partida real de punta a punta. Medimos los archivos con ffmpeg
    // (volumedetect): move.mp3 estaba realmente flojo de fábrica
    // (mean ≈ -35.7dB, pico ≈ -20.8dB — MUY por debajo del resto de
    // los efectos), así que el 0.18 de la vez pasada terminaba
    // sonando casi nada al lado de la música/otros SFX. Se
    // renormalizó el archivo en sí (+18dB de ganancia, pico ahora
    // ≈ -3.3dB, ver src/assets/sounds/move.mp3) Y se sube el volumen
    // JS de los tres acá — no alcanza con tocar una sola de las dos
    // capas cuando el archivo de origen está tan por debajo del resto.
    if (moveAudio.current) moveAudio.current.volume = 0.35;
    if (captureAudioWhite.current) captureAudioWhite.current.volume = 0.55;
    if (captureAudioBlack.current) captureAudioBlack.current.volume = 0.55;
    
}, []);
  const size = state.trackSize;

  const [bigHeadSchoolBy, setBigHeadSchoolBy] =
  useState<"white" | "black" | null>(null);

  const [dharmaEmergencyFor, setDharmaEmergencyFor] =
  useState<PlayerId | null>(null);

  // 🔊 DISPARAR SONIDO / FX POR LAST MOVE
  useEffect(() => {
    if (!state.lastMove) return;

    if (state.lastMove.didCapture) {
      const player = state.lastMove.player;

      if (player === "P1") {
        if (captureAudioWhite.current) {
          captureAudioWhite.current.currentTime = 0;
          captureAudioWhite.current.play().catch(() => {});
        }
      } else {
        if (captureAudioBlack.current) {
          captureAudioBlack.current.currentTime = 0;
          captureAudioBlack.current.play().catch(() => {});
        }
      }
    } else {
      if (moveAudio.current) {
        moveAudio.current.currentTime = 0;
        moveAudio.current.play().catch(() => {});
      }
    }

    setBeat(true);
    if (beatTimer.current) window.clearTimeout(beatTimer.current);
    beatTimer.current = window.setTimeout(() => setBeat(false), 650);

    const oldRealm = realmFromPos(state.lastMove.fromPos);
    const newRealm = realmFromPos(state.lastMove.toPos);

    setGhost(oldRealm !== newRealm ? pickLine(newRealm) : "flow");

    if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
    ghostTimer.current = window.setTimeout(() => setGhost(null), 1200);

    setImpactPos(state.lastMove.toPos);
    setFlashCell(state.lastMove.toPos);

    const t = window.setTimeout(() => {
      setImpactPos(null);
      setFlashCell(null);
    }, 320);

    return () => window.clearTimeout(t);
  }, [state.lastMove]);

  useEffect(() => {
    return () => {
      if (ghostTimer.current) window.clearTimeout(ghostTimer.current);
      if (beatTimer.current) window.clearTimeout(beatTimer.current);
    };
  }, []);

  const turnClass = state.turn === "P1" ? "turnP1" : "turnP2";
  const beatClass = beat ? "beat" : "";

const unifiedStackMap = buildUnifiedStackMap(state);

const wheelCenter = {
  x: RING_SIZE / 2,
  y: RING_SIZE / 2,
};
 // Paso 1.2 (26 agosto 2026) — a pedido de Federico: el cartelito con
  // titulo+descripcion que aparecia solo, 5.6s despues de la moneda
  // grande, "salia y no volvia" — para cuando aparecia, ya habia dejado
  // de mirar la pantalla. Se reemplazo por mantener presionada la
  // monedita para ver su nombre.
  //
  // v71 (27 agosto 2026) — reemplazado de nuevo, a pedido de Federico:
  // el arte real de cada Nidana es indistinguible a 30x30/18x18px
  // ("desde pantallas chicas no se ven las diferencias"). Las monedas
  // sueltas y las cargadas por un Avatar ahora muestran un NUMERO
  // grande y legible (NIDANA_NUMBER_IMAGE) en vez del icono detallado.
  // El gesto de mantener presionado se reemplaza por un click simple
  // que abre el arte real en grande (enlargedNidana, ver el modal mas
  // abajo junto a ExplainModal) — mas facil de descubrir que un press
  // largo, y ahora sí muestra la moneda de verdad, no solo el nombre.
  const [enlargedNidana, setEnlargedNidana] = useState<NidanaId | null>(null);

  const piecesByPos: Record<number, { player: PlayerId; kind: PieceKind }[]> =
    {};

  (["P1", "P2"] as PlayerId[]).forEach((player) => {
   ACTIVE_PIECE_KINDS.forEach((kind) => {
      const pieceState = state.pieces[player][kind];
      if (pieceState.inLimbo) return;

      const pos = pieceState.pos;
      if (!piecesByPos[pos]) piecesByPos[pos] = [];
      piecesByPos[pos].push({ player, kind });
    });
  });

  Object.values(piecesByPos).forEach((stack) => {
    stack.sort(
      (a, b) => pieceSortKey(a.player, a.kind) - pieceSortKey(b.player, b.kind)
    );
  });

  // Paso 1 (26 agosto 2026) — Nidanas fisicas sueltas en el tablero
  // (todavia no recogidas). Se dibujan sin apilamiento (no reutiliza
  // getStackedTokenPosition/buildUnifiedStackMap) porque el diseño del
  // paso 1 no dice nada sobre varias Nidanas en la misma casilla — solo
  // el caso normal, una Nidana visible en su casilla hasta que un
  // Avatar la recoja.
  const boardNidanaTokens = Object.entries(state.boardNidanas).map(
    ([posKey, nidanaId]) => {
      if (!nidanaId) return null;
      const pos = Number(posKey);
      const base = piecePosition(pos, size);

      return (
        <div
          key={`nidana-board-${pos}`}
          style={{
            position: "absolute",
            left: base.left,
            top: base.top,
            width: 30,
            height: 30,
            zIndex: 700,
          }}
        >
          <img
            src={NIDANA_NUMBER_IMAGE[nidanaId]}
            alt={NIDANAS[nidanaId].label}
            onClick={() => setEnlargedNidana(nidanaId)}
            style={{
              width: 30,
              height: 30,
              objectFit: "contain",
              pointerEvents: "auto",
              cursor: "pointer",
              filter: "drop-shadow(0 0 4px rgba(255,255,255,0.35))",
            }}
          />
        </div>
      );
    }
  );

  const renderedPieces = (["P1", "P2"] as PlayerId[]).flatMap((player) => {
    // 2026-08-05: revelado escalonado — el blanco entra en el 1er clic
    // post-casillas, el negro en el 2do. Antes de genesisComplete, cada
    // jugador respeta su propio flag; una vez completo, ambos son true.
    const playerRevealed =
      player === "P1" ? p1VenomsRevealed : p2VenomsRevealed;
    if (!playerRevealed) return [];

    // v27 (11 agosto 2026) — revertido el v25: los Venenos siguen
    // visibles en el tablero en Fase 2 (decisión cerrada con
    // Federico/Chat — "los Venenos permanecen VISIBLES, pero pierden
    // la capacidad de iniciar movimientos independientes"). Lo que
    // cambia en Fase 2 no es su visibilidad, sino qué hace clicarlos
    // (ver reducer, case SELECT_PIECE: solo cuentan como el segundo
    // paso de una selección Avatar+Veneno, nunca inician un movimiento
    // por su cuenta).

    return ACTIVE_PIECE_KINDS.map((kind) => {
      const pieceState = state.pieces[player][kind];
      if (pieceState.inLimbo) return null;

      const pos = pieceState.pos;

      // v27 (11 agosto 2026) — en Fase 2, el Veneno "seleccionado" es el
      // segundo paso (selectedVenom), no selectedPiece (que ahora es el
      // Avatar). Se agranda con cualquiera de los dos, para que Fase 1
      // (donde solo existe selectedPiece) siga funcionando igual que
      // antes.
      //
      // v82 (1 septiembre 2026) — Snake Bet V0: mientras haya una
      // apuesta activa, la Serpiente del apostador se agranda con el
      // MISMO mecanismo (reutilizado, no un sistema visual aparte —
      // pedido explícito). A diferencia de la selección normal, esto
      // NO depende de state.turn — la apuesta dura varios turnos de
      // ambos jugadores, no solo el turno actual.
      const hasActiveSnakeBet =
        kind === "snake" && state.snakeBet?.byPlayer === player;

      const isCurrentSelected =
        hasActiveSnakeBet ||
        (player === state.turn &&
          (state.selectedPiece[player] === kind ||
            state.selectedVenom[player] === kind));

    const base = piecePosition(pos, size);

const stackKey = `${player}-${kind}`;
const { stackIndex, stackTotal, extraRadialOffset } =
  unifiedStackMap.get(stackKey) ?? {
    stackIndex: 0,
    stackTotal: 1,
    extraRadialOffset: 0,
  };

// v42 (13 agosto 2026) — el cochino vuelve a su tamaño normal (igual
// a serpiente/gallo) apenas entra Margot — antes de eso (todavía en
// Bruno/"ignorancia") se mantiene grande como el drive único de la
// Era 1.
const margotEntered =
  ERA_ORDER_FOR_PIG_SIZE.indexOf(
    state.cosmicClock.era as (typeof ERA_ORDER_FOR_PIG_SIZE)[number]
  ) >= ERA_ORDER_FOR_PIG_SIZE.indexOf("margot");

const visualSize =
  kind === "pig" && margotEntered
    ? PIG_NORMAL_SIZE
    : PIECE_VISUAL_SIZE[kind as BasePieceKind] ?? 50;

const stackedPosition = getStackedTokenPosition({
  base: {
    left: base.left as number,
    top: base.top as number,
  },
  pieceSize: visualSize,
  indexInStack: stackIndex,
  totalInStack: stackTotal,
  wheelCenter,
  spacing: 32,
  extraRadialOffset,
});

      let src = player === "P1" ? pigWhite : pigBlack;

      if (kind === "rooster") {
        src = player === "P1" ? roosterWhite : roosterBlack;
      } else if (kind === "snake") {
        src = player === "P1" ? cobraWhite : cobraBlack;
      }

      const badgeSize = kind === "pig" ? 22 : 14;

      // v41 (13 agosto 2026) — bug real reportado por Federico: en
      // casillas con varias fichas apiladas, un Veneno rival puede
      // quedar 100% tapado visualmente (la separación radial de v40
      // solo garantiza un borde, no visibilidad total con 3+ fichas).
      // En vez de perseguir una solución geométrica perfecta, Federico
      // propuso señalizar la inicial (P/S/R) en un círculo ROJO cuando
      // esa ficha comparte casilla con un Veneno rival — "aunque no se
      // vea" la ficha en sí, el círculo rojo avisa que ahí hay algo.
      // Solo cambia color/estilo del badge existente, nada de mecánica,
      // selección ni z-index.
      const hasRivalVenomSameCell = (piecesByPos[pos] ?? []).some(
        (p) => p.player !== player
      );

      return (
        <div
          key={`${player}-${kind}`}
          onClick={() => {
            if (player === state.turn && !pieceState.inLimbo) {
              onSelectPiece?.(kind);
            }
          }}
          style={{
            ...base,
            left: stackedPosition.left,
top: stackedPosition.top,
            width: visualSize,
            height: visualSize,
           zIndex: isCurrentSelected ? 9000 : 8000 + stackedPosition.zIndex,
            pointerEvents: player === state.turn ? "auto" : "none",
            position: "absolute",
            cursor: player === state.turn ? "pointer" : "default",
            borderRadius: 18,
            boxShadow: isCurrentSelected
              ? "0 0 0 2px rgba(255,255,255,0.18)"
              : "none",
          }}
        >
<img
  src={src}
  alt=""
  onError={(e) => {
    e.currentTarget.remove();
  }}
  className={impactPos === pos ? "pieceHit" : ""}
  style={{
    width: visualSize,
    height: visualSize,
    objectFit: "contain",
    pointerEvents: "none",
    // v86 (6 septiembre 2026) — pedido de Federico: antes,
    // hasActiveSnakeBet reusaba exactamente el mismo scale(1.08) que
    // la selección normal de pieza (ver comentario v82 más arriba) —
    // si el rival, en su propio turno, elegía mover con SU Snake por
    // una razón totalmente aparte de la apuesta, las dos serpientes
    // quedaban agrandadas IGUAL y con el mismo brillo blanco, sin
    // forma de distinguir "esta es la que reta" de "esta se movió
    // nomas". Ahora hasActiveSnakeBet tiene su propio tratamiento, más
    // grande que la selección normal y con brillo dorado propio, para
    // que la serpiente de la apuesta se note sola sin importar qué
    // haga el rival con la suya.
    transform: hasActiveSnakeBet
      ? "scale(1.45) translateY(-7px)"
      : isCurrentSelected
      ? "scale(1.08) translateY(-4px)"
      : "translateY(-1px)",
    filter: hasActiveSnakeBet
      ? "drop-shadow(0 0 12px rgba(255,200,90,0.85))"
      : isCurrentSelected
      ? "drop-shadow(0 0 8px rgba(255,255,255,0.4))"
      : "none",
  }}
/>

          <div
            style={{
              position: "absolute",
              right: -3,
              bottom: -3,
              minWidth: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              background: hasRivalVenomSameCell
                ? "#dc2626"
                : "rgba(0,0,0,0.72)",
              border: hasRivalVenomSameCell
                ? "1.5px solid #fecaca"
                : "1px solid rgba(255,255,255,0.2)",
              boxShadow: hasRivalVenomSameCell
                ? "0 0 6px rgba(220,38,38,0.9)"
                : "none",
              color: "white",
              fontSize: kind === "pig" ? 13 : 9,
              fontWeight: 800,
              lineHeight: `${badgeSize - 2}px`,
              textAlign: "center",
              padding: "0 3px",
              pointerEvents: "none",
            }}
          >
            {pieceShort(kind)}
          </div>
        </div>
      );
    });
  });

  return (
    <div className={`board ${turnClass} ${beatClass}`}>
      {genesisComplete && ghost && <div className="ghostWord">{ghost}</div>}
      {state.emojiEvents?.length ? (
  <div
    style={{
      textAlign: "center",
      fontSize: 26,
      margin: "6px 0 10px",
      minHeight: 32,
    }}
  >
    {state.emojiEvents[state.emojiEvents.length - 1].emoji}
  </div>
) : null}

{/* Paso 1.2 (26 agosto 2026) — cartelito con titulo+descripcion
    eliminado (aparecia solo, 5.6s tarde, "salia y no volvia" segun
    Federico). v71 (27 agosto 2026) — ahora cada monedita (suelta o
    portada) muestra su numero y un click abre el arte real en grande
    — ver enlargedNidana mas arriba y su modal junto a ExplainModal,
    al final de este componente. */}

      {/* ===== Ring ===== */}
<div
  className="ringWrap"
  style={{
    position: "absolute",
    left: 512,
    top: 50,

    width: RING_SIZE,
    height: RING_SIZE,

    margin: 0,
    borderRadius: "50%",

    overflow: "visible",
    // Siempre por encima del overlay NEBULA/CASILLAS de Genesis (zIndex 100 en
    // GenesisReveal.tsx) para que el dado real quede visible y clicable
    // durante todas las fases, no solo cuando genesisComplete.
    zIndex: 5000,

    transform: "scale(1.12)",
    transformOrigin: "center center",
  }}
>
  <img
src={budaKarmaER}
onClick={() => {
  setDharmaEmergencyFor(state.turn);

  setBigHeadSchoolBy(state.turn === "P1" ? "white" : "black");

  setTimeout(() => {
    setBigHeadSchoolBy(null);
    setDharmaEmergencyFor(null);
  }, 5000);
}}

onMouseEnter={(e)=>{
e.currentTarget.style.transform="scale(1.12)"
}}

onMouseLeave={(e)=>{
e.currentTarget.style.transform="scale(1)"
}}

style={{
position:"absolute",

left:"-8%",
top:"75%",

width:115,

zIndex:90,

pointerEvents: "auto",
transition:"0.3s",

filter:"drop-shadow(0 0 7px rgba(255,255,255,.95))",
display: oriolEntered ? "block" : "none"
}}
/>
{bigHeadSchoolBy && (
  <BigHeadSchoolOverlay openedBy={bigHeadSchoolBy} />
)}
{onRoll && !dharmaEmergencyFor && (() => {
  // 2026-08-05 — CORRECCIÓN: se asumía que ringWrap (position:absolute,
  // zIndex:5000) contenía el zIndex:999999 !important de
  // .samsaraDicePortalButton dentro de su propio stacking context, y que
  // por eso quedaba tapado por el div del video (zIndex:9999 en
  // GenesisReveal.tsx). Verificado con ffmpeg extrayendo frames del propio
  // genesis_dados.mp4: los "dados" solo existen en los primeros ~1.5s del
  // video (son los dos asteroides picados que chocan y generan el Big
  // Bang) — el resto del video (celosía de madera, warps, tablero blanco,
  // pintura) NO tiene dados. Lo que el usuario veía "congelado" encima del
  // video en el resto de las fases era el botón real de la app,
  // escapándose por encima — la contención de stacking context no estaba
  // funcionando como se asumió. Ahora se oculta explícitamente con
  // opacity/visibility en vez de confiar en el z-index.
  const diceSpinPaused = !genesisVideoDone && !genesisComplete;
  const diceHiddenDuringVideo = !genesisVideoDone && !genesisComplete;

  // Durante Genesis (CASILLAS) los clics no despachan ROLL real — son
  // decorativos, ver GameShell.tsx handleRollWithPopup — así que
  // state.turn nunca cambia y la foto se quedaba en blanco los 6 clics.
  // Antes de que termine Genesis alternamos por paridad de
  // genesisClickCount (clic 1 = blanco, clic 2 = negro, ...) para que la
  // foto sí indique a qué jugador le toca clicar. Una vez genesisComplete,
  // usamos el turno real del juego.
  const isWhiteTurn = genesisComplete
    ? state.turn === "P1"
    : genesisClickCount % 2 === 0;

  // Hint de "toca aquí": solo antes del primer clic, una vez visible
  // el dado real (video ya terminado) y antes de completar Genesis.
  const showTapHint =
    genesisVideoDone && !genesisComplete && genesisClickCount === 0;

  return (
    <>
      <button
        type="button"
        className="samsaraDicePortalButton"
        onClick={onRoll}
        title="Roll dice"
        style={{
          top: "44%",
          opacity: diceHiddenDuringVideo ? 0 : 1,
          visibility: diceHiddenDuringVideo ? "hidden" : "visible",
          pointerEvents: diceHiddenDuringVideo ? "none" : "auto",
        }}
      >
        {USE_LEGACY_PORTAL_DICE_ART ? (
          <img
            src={isWhiteTurn ? diceWhitePortal : diceBlackPortal}
            alt="Roll dice"
            className="samsaraDicePortalImg"
            style={{ animationPlayState: diceSpinPaused ? "paused" : "running" }}
          />
        ) : USE_CSS_STONE_ICON_FALLBACK ? (
          <div
            className="samsaraDicePortalImg"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6%",
              animation: "none",
            }}
          >
            <StoneDiceIcon color="white" />
            <StoneDiceIcon color="black" />
          </div>
        ) : (
          <img
            src={diceGenesisStonePair}
            alt="Roll dice"
            className="samsaraDicePortalImg"
            style={{ animationPlayState: diceSpinPaused ? "paused" : "running" }}
          />
        )}
      </button>

      {showTapHint && (
        <div
          style={{
            position: "absolute",
            top: "44%",
            left: "-23%",
            transform: "translate(-50%, 40px)",
            zIndex: 1000000,
            pointerEvents: "none",
            fontSize: 40,
            animation: "tapHintBounce 1.1s ease-in-out infinite",
            filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))",
          }}
        >
          👆
        </div>
      )}
    </>
  );
})()}
     {nidanaCoinSrc && (
  <div
    style={{
      position: "absolute",
      left: "-290px",
      top: "160px",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      pointerEvents: "none",
    }}
  >
    <img
    key={`${nidanaCoinSrc}-${nidanaCoinSide}`}
      src={nidanaCoinSrc}
      className={`nidanaCoinImage ${
        nidanaCoinSide === "back" ? "isBack" : ""
      }`}
      style={{
        width: 220,
        height: "auto",
        borderRadius: "50%",
animation: "nidanaReveal 2.6s cubic-bezier(.16,1.25,.32,1) both",
      }}
    />
  </div>
)}
  {genesisComplete && Array.from({ length: size }, (_, i) => {
  const cellRealm = realmFromPos(i);
  const isHoveredTarget = hoveredOption?.toPos === i;

  const enemyPlayer = state.turn === "P1" ? "P2" : "P1";
  // v28 (11 agosto 2026) — decisión de diseño cerrada: "esa regla de
  // backgammon (2+ = bloqueado) pasa a los Avatares solamente". Un
  // Veneno acompañando a su propio Avatar ya no suma para el bloqueo —
  // solo 2+ Avatares del mismo jugador bloquean, desde que ese jugador
  // entra en Fase 2 (Oriol). Antes de eso, sin cambios (Venenos +
  // Avatares combinados, como backgammon con 3 fichas).
  const enemyPhase2 = state.realmProgress[enemyPlayer].currentRealmStep >= 3;

  const enemiesOnCell = enemyPhase2
    ? REALM_PIECE_ORDER.filter((kind: RealmPieceKind) => {
        const piece = state.realmPieces[enemyPlayer]?.[kind];
        return piece?.unlocked && !piece.inLimbo && piece.pos === i;
      })
    : ACTIVE_PIECE_KINDS.filter((kind) => {
        const piece = state.pieces[enemyPlayer][kind];
        return !piece.inLimbo && piece.pos === i;
      });

  const isBlockedCell = enemiesOnCell.length >= 2;

  return (
    <button
      key={i}
      type="button"
      disabled={true}
      className={`cellBtn realmCell realmCell-${cellRealm} ${
        isHoveredTarget
          ? hoveredOption?.meaning === "IMPACT"
            ? "moveB"
            : hoveredOption?.meaning === "RISK"
            ? "moveAB"
            : "moveA"
          : ""
      } ${flashCell === i ? "cellFlash" : ""} ${
        isBlockedCell ? "blockedCell" : ""
      }`}
      style={ringCellStyle(i, size)}
      onClick={() => {}}
      title={`${i} — ${REALM_LABEL[cellRealm]}`}
    >
      {/* v45 (13 agosto 2026) — a pedido de Federico ("no puedo ver los
          numeros de las casillas... las casillas numeradas no
          corresponden con los colores"): el numero de casilla existia
          en el DOM pero era ilegible (gris translucido de 0.55 de
          opacidad, sobre el mural pintado de fondo) y el sistema de
          colores por reino (realmCell-NARAKA/PRETA/ANIMAL/HUMAN/ASURA/
          DEVA) ya estaba definido en board.css pero nunca se conectaba
          a esta clase — se agrega arriba. El numero ahora tiene alto
          contraste (blanco solido + contorno oscuro) para leerse sobre
          cualquier fondo. */}
      <span className="cellNumLabel">{i}</span>
              {isHoveredTarget && (
                <>
                  <div className="moveTag">{hoveredOption?.choice}</div>
                  {hoveredOption?.meaning && (
                    <div className="moveMeaning">{hoveredOption.meaning}</div>
                  )}
                </>
              )}
            </button>
          );
        })}

      {genesisComplete && moveOptions.length > 0 && onChooseMove && (
          <MoveEmanations
            options={moveOptions}
            player={state.turn}
            trackSize={size}
            selectedPiece={state.selectedPiece[state.turn]}
            onChoose={onChooseMove}
          />
        )}
      {/* v32 (12 agosto 2026) — panel de botones grandes, alternativa
          segura para pantallas chicas a las líneas del tablero (que
          pueden quedar tapadas por fichas apiladas encima, sobre todo
          en Fase 2 donde hay más fichas juntas por casilla). Solo se
          muestra desde Fase 2 (Oriol) — antes de eso las líneas ya
          funcionan bien sin este problema. */}
      {genesisComplete &&
        moveOptions.length > 0 &&
        onChooseMove &&
        state.realmProgress[state.turn].currentRealmStep >= 3 && (
          <MoveOptionsPanel options={moveOptions} onChoose={onChooseMove} />
        )}
{genesisComplete && (["P1", "P2"] as PlayerId[]).flatMap((player) => {
 const realmOrder = [
  "hungry_ghost",
  "hell",
  "animals",
  "humans",
  "asura",
  "deva",

] as const;

// 2026-08-22: el .filter() ya descartaba undefined/inLimbo/no-unlocked
// en runtime, pero sin un type predicate TS no reduce el tipo del
// array resultante — seguía viendo (RealmPieceState | undefined)[] mas
// abajo. Mismo filtrado, tipo correcto.
const realmList = realmOrder
  .map((key) => state.realmPieces[player]?.[key])
  .filter((piece): piece is RealmPieceState =>
    Boolean(piece) && !piece!.inLimbo && piece!.unlocked
  );
  const realmStackCountByPos = new Map<number, number>();

for (const piece of realmList) {
  realmStackCountByPos.set(
    piece.pos,
    (realmStackCountByPos.get(piece.pos) ?? 0) + 1
  );
}

  return realmList.map((piece) => {
    if (!piece || piece.inLimbo || !piece.unlocked) {
      return null;
    }

const base = piecePosition(piece.pos, size);

const stackKey = `${player}-${piece.kind}`;
const { stackIndex, stackTotal } =
  unifiedStackMap.get(stackKey) ?? {
    stackIndex: 0,
    stackTotal: 1,
    extraRadialOffset: 0,
  };

const stackedPosition = getStackedTokenPosition({
  base: {
    left: base.left as number,
    top: base.top as number,
  },
  pieceSize: 48,
  indexInStack: stackIndex,
  totalInStack: stackTotal,
  wheelCenter,
  spacing: 34,
});

// v30 (11 agosto 2026) — bug real reportado: los Avatares nunca tuvieron
// el efecto de "se agranda al seleccionar" que sí tienen los Venenos
// (isCurrentSelected más arriba, línea ~597). Con el flujo de hoy (donde
// seleccionar el Avatar es el primer paso obligatorio en Fase 2), esa
// falta de señal visual dejaba al jugador sin saber cuál Avatar estaba
// activo — especialmente grave con dos Avatares propios en la misma
// casilla (ej. Margot y Oriol juntos, reportado por Federico). Mismo
// criterio que ya usan los Venenos.
const isAvatarSelected =
  player === state.turn && state.selectedPiece[player] === piece.kind;

// Paso 1 — Nidana que este Avatar porta ahora mismo, si alguna (ver
// reducer.ts CONSCIOUS_MOVE, bloque de recoleccion).
const carriedNidana = state.avatarNidana[player][piece.kind];

    return (
      <div
        key={piece.id}
        onClick={() => {
          if (player === state.turn) {
            onSelectPiece?.(piece.kind);
          }
        }}
        className={`realmPieceToken realmPiece-${piece.kind} ${
          player === "P1" ? "realmPieceP1" : "realmPieceP2"
        }`}
style={{
  left: stackedPosition.left,
  top: stackedPosition.top,
  width: 48,
  height: 48,
  borderRadius: "50%",
  position: "absolute",
  // v40 (13 agosto 2026) — bug real: las dos ramas de este ternario
  // daban siempre >= 9999, sin importar si estaba seleccionado — un
  // Avatar SIEMPRE ganaba el clic sobre cualquier Veneno apilado en
  // la misma casilla, sin distinguir seleccion. Ahora el no-seleccionado
  // sigue por encima de los Venenos normales (comportamiento que ya
  // existia y se mantiene), pero el ternario vuelve a tener sentido:
  // el seleccionado de verdad queda por encima de todo.
  zIndex: isAvatarSelected ? 9999 : 9000 + stackedPosition.zIndex,
  pointerEvents: player === state.turn ? "auto" : "none",
  cursor: player === state.turn ? "pointer" : "default",
  boxShadow: isAvatarSelected
    ? "0 0 0 2px rgba(255,255,255,0.25)"
    : "none",
  /* glow: dejar que overlays.css maneje box-shadow y border */
}}
        title={`${player} ${piece.kind}`}
           >
      <img
  src={
    REALM_TOKEN_MAP[piece.kind as keyof typeof REALM_TOKEN_MAP]?.[player] ??
    brunoP1
  }
  alt={`${piece.kind} token`}
  className="realmPieceTokenImg"
  style={{
    transform: isAvatarSelected
      ? "scale(1.12) translateY(-4px)"
      : "translateY(-1px)",
    filter: isAvatarSelected
      ? "drop-shadow(0 0 8px rgba(255,255,255,0.5))"
      : "none",
  }}
/>
      {carriedNidana && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            zIndex: 9600,
          }}
        >
          <img
            src={NIDANA_NUMBER_IMAGE[carriedNidana]}
            alt={NIDANAS[carriedNidana].label}
            onClick={(e) => {
              e.stopPropagation();
              setEnlargedNidana(carriedNidana);
            }}
            style={{
              width: 18,
              height: 18,
              objectFit: "contain",
              pointerEvents: "auto",
              cursor: "pointer",
              borderRadius: "50%",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
              display: "block",
            }}
          />
        </div>
      )}
      </div>
    );
  });
})}
        {(p1VenomsRevealed || p2VenomsRevealed) && renderedPieces}
        {genesisComplete && boardNidanaTokens}



      </div>

        {/* v71 (27 agosto 2026) — click en cualquier monedita numerada
            (suelta o portada por un Avatar) abre esto: el arte real de
            esa Nidana en grande, su nombre y su linea poetica. Absolute
            (no fixed) a proposito — .samsaraScene tiene su propio
            transform:scale(...) para escalar el tablero al viewport
            real (ver VictoryScreen.tsx mas arriba en el repo para la
            explicacion completa de por que position:fixed se rompe
            ahi).

            v79c (31 agosto 2026) — este bloque vivía ANTES adentro de
            .ringWrap (el círculo del tablero, que ocupa solo la mitad
            derecha de .samsaraScene — ver left:512 en su style más
            arriba). Por eso el "inset:0" solo cubría/centraba dentro
            de esa mitad derecha: Federico reportó las monedas
            "puestas a la derecha" en vez de centradas, Y el juego
            "se trancaba" al abrir una Nidana — el velo NO cubría la
            mitad izquierda de la pantalla (zona de los dados), así
            que un toque ahí durante el modal seguía llegando al
            tablero de abajo y disparaba interacciones no deseadas
            mientras el modal parecía estar "congelado" encima.
            Movido acá, afuera de .ringWrap pero dentro de .board
            (mismo padre posicionado real: .samsaraScene) — inset:0
            ahora cubre y centra sobre la escena COMPLETA (1100x620),
            tal cual pidió Federico ("full pantalla... el jugador que
            está viendo eso no puede jugar en ese momento"). */}
        {enlargedNidana && (
          <div
            onClick={() => setEnlargedNidana(null)}
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 9800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(5,7,13,0.82)",
              cursor: "pointer",
            }}
          >
            {/* v79d (31 agosto 2026) — Federico: "una vez abierto no hay
                manera de cerrarlo .. y se tranca el juego". El cierre
                dependía SOLO de tocar el velo oscuro fuera de la
                cápsula — pero la cápsula + su padding (20px/28px) más
                el título y la línea poética debajo ocupan casi todo el
                alto disponible en el teléfono, dejando muy poco margen
                de velo "tocable" para cerrar, y el instinto natural es
                tocar justo la moneda (que a propósito NO cierra, para
                poder mirarla). Se agrega una X grande y fija arriba a
                la derecha, siempre visible, como forma explícita e
                inequívoca de cerrar — no reemplaza el toque-afuera,
                lo complementa. */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedNidana(null);
              }}
              aria-label="Cerrar"
              style={{
                position: "absolute",
                top: 18,
                right: 22,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(216,196,138,0.45)",
                color: "#f2e8d4",
                fontSize: 22,
                lineHeight: "44px",
                textAlign: "center",
                padding: 0,
                cursor: "pointer",
                zIndex: 9900,
              }}
            >
              ✕
            </button>
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                padding: "20px 28px",
                cursor: "default",
              }}
            >
              {/* v78 (31 agosto 2026) — pedido de Federico: "un óvalo
                  y las dos caras de las Nidanas... que muestre las dos
                  caras en una misma apertura y listo" — antes solo se
                  veía NIDANA_FRONT_IMAGE.
                  v79 (31 agosto 2026) — pedido de Federico tras verlo
                  en el tablero real: "el óvalo ponlo mucho más grande
                  y quita el fondo negro [...] pon todo el fondo velado
                  y el óvalo full pantalla — el jugador que está viendo
                  eso no puede jugar en ese momento". La cápsula ya no
                  lleva relleno oscuro propio (antes un gradiente casi
                  negro) — ahora solo un borde dorado fino, apoyada
                  sobre el mismo velo de pantalla completa que ya
                  existía (el fondo rgba(5,7,13,0.82) del contenedor de
                  afuera). Cada cara pasa de cuadrada a un medallón
                  circular bien grande (280px, casi el doble que
                  antes): el cuadrado negro que traía cada imagen de
                  fondo (arte fuente, no algo agregado acá) se recorta
                  con un círculo (overflow: hidden + borderRadius 50%)
                  y la imagen se escala apenas un poco (104%) centrada
                  adentro, así el medallón redondo de cada Nidana llena
                  el círculo entero sin dejar ver esas esquinas negras
                  — sin tocar el arte fuente en disco.

                  v79b (31 agosto 2026) — Federico reportó que a 135%
                  las monedas se veían "detrás de dos huecos pequeños,
                  no completas". Medido en disco: el círculo del diseño
                  de cada Nidana ya ocupa ~99.6% del cuadrado fuente (el
                  arte casi toca los cuatro bordes; solo las esquinas,
                  fuera del círculo inscrito, son negras). Por eso 135%
                  de sobre-escala recortaba un anillo real del diseño
                  (~24% del radio) en vez de solo esconder negro. Bajado
                  a 104%, el margen mínimo que ya cubre esas esquinas. */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 50,
                  padding: "40px 60px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(216,196,138,0.35)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid rgba(216,196,138,0.4)",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.55)",
                  }}
                >
                  <img
                    src={NIDANA_FRONT_IMAGE[enlargedNidana]}
                    alt={NIDANAS[enlargedNidana].label}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "104%",
                      height: "104%",
                      objectFit: "cover",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
                <div
                  style={{
                    position: "relative",
                    width: 280,
                    height: 280,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid rgba(216,196,138,0.4)",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.55)",
                  }}
                >
                  <img
                    src={NIDANA_BACK_IMAGE[enlargedNidana]}
                    alt={`${NIDANAS[enlargedNidana].label} (reverse)`}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: "104%",
                      height: "104%",
                      objectFit: "cover",
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                </div>
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', 'Trajan Pro', 'Times New Roman', serif",
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: "0.06em",
                  color: "#f2e8d4",
                  textShadow: "0 2px 5px rgba(0,0,0,0.55)",
                  textTransform: "uppercase",
                  textAlign: "center",
                }}
              >
                {NIDANA_NUMBER[enlargedNidana]}. {NIDANAS[enlargedNidana].label}
              </div>
              <div
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "rgba(242,232,212,0.75)",
                  textAlign: "center",
                  maxWidth: 220,
                }}
              >
                {NIDANAS[enlargedNidana].short}
              </div>
            </div>
          </div>
        )}

      <ExplainModal
        open={explainOpen}
        onClose={() => setExplainOpen(false)}
        player={explainPlayer}
        last={
          (() => {
            const hist = state.behavior?.history?.[explainPlayer] ?? [];
            return hist[hist.length - 1] ?? null;
          })()
        }
      />
    </div>
  );
}