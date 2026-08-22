import React from "react";

import { DicePopup } from "./DicePopup";

import { VestigiumOverlay } from "./VestigiumOverlay";
import { LedgerModal } from "./LedgerModal";

import { Board } from "../game/Board";
import {
  getMoveOptionsForPlayer,
  getPigForcedAvatar,
} from "../game/rules/getMoveOptionsForPlayer";

import { FandangoKarma } from "../fandango/FandangoKarma";
import { MaraPanel } from "./MaraPanel";
import { SamsaraStage } from "../samsara/SamsaraStage";

import watcherVideo from "../assets/video/jesus_watch.mp4";
import type { MoveOption, PieceKind, PlayerId } from "../game/types";
import { REALM_PIECE_ORDER } from "../game/types";
import { AVATAR_ORDER } from "../game/historicalClock";
import { ACTOR_PROFILES } from "../game/actors/actorProfiles";

import cheeringSound from "../assets/sounds/cheering.mp3";
import fireworksSound from "../assets/sounds/fireworks.wav";

import claritySound from "../assets/sounds/clarity.mp3";
import distortionSound from "../assets/sounds/distortion.wav";
import tensionSound from "../assets/sounds/tension.mp3";

// v43 (13 agosto 2026) — pedido de Federico: cuando se dispara el aviso
// "ONLY ONE MORE" (5 de 6 en Humans), ademas del cartel de texto entra
// esta imagen desde la izquierda tapando a Mara un momento, con un
// scratch de DJ. Mismo evento efimero de hoy (fireDharmaEvent), no un
// sistema nuevo — ver mas abajo, withDjBuddha.
import djBuddhaPoster from "../assets/intro/buda_dj_poster.png";
// v52 (17 agosto 2026) — pedido de Federico: agregar "7 A one more.webp"
// como segundo frame del poster de Buda DJ, cross-fadeado adentro del
// mismo popup.
// v57 (17 agosto 2026) — revertido: Federico reportó un glitch visual
// ("intenta entrar la foto siguiente, pero se detiene a medio camino y
// se retira") con las dos imágenes apiladas + cross-fade DENTRO del
// popup que YA está siendo animado por su propio keyframe de entrada/
// salida (djBuddhaEnter / djBuddhaPosterFading, ver overlays.css) — dos
// animaciones de opacidad/transform compitiendo en el mismo layout.
// Además quedaba redundante: "7 A one more.webp" ahora se muestra en el
// MURAL de fondo (oneMoreMuralRevealed, ver más abajo), que es lo que
// Federico describió realmente ("entra la foto: 7 A one more" como
// etapa del mural, no como detalle del popup). El popup vuelve a ser
// una sola imagen fija (buda_dj_poster.png), sin segundo frame.
// v44 (13 agosto 2026) — Federico reemplazó el primer scratch por uno
// mejor/más suave. scratch_pre_win.wav queda sin usar en el repo (no
// se pudo borrar el archivo desde acá) — se puede eliminar a mano.
import scratchSound from "../assets/sounds/scratch_buda_dj.mp3";
// v55 (17 agosto 2026) — pedido de Federico, coreografía correcta
// (corrige v53, que la disparaba al terminar whitman_deva_intro.mp4 —
// eso confundía "Whitman ya jugable" con "formación completa" y hacía
// salir la foto de la luna antes de tiempo). La fanfarria suena cuando
// un jugador COMPLETA la formación física: 6/6 fichas en Humans. Ver el
// flanco p1FullFormation/p2FullFormation más abajo, junto a
// p1NearWin/p2NearWin.
import fanfarriaSound from "../assets/sounds/fanfarria 5to Avatar.mp3";
// v53 (17 agosto 2026) — cuando termina la fanfarria (evento 'ended',
// mismo patrón), suena esta campana tibetana sola y el mural de fondo
// pasa a "7 nirvana dj.webp" (la única de las 7 fotos con la luna ya
// destapada — antes tapada por nubes en "6 entra whitman.webp"). Ver
// nirvanaMuralRevealed más abajo.
import campanaFinalSound from "../assets/sounds/campana final.mp3";
import { SacredProgress } from "./SacredProgress";
import { countNirvanaFormationProgress } from "../game/victory/nirvana";
import { VictoryScreen } from "./VictoryScreen";
import { VenomBanner } from "./VenomBanner";
import { HistoricalTimeCounter } from "./HistoricalTimeCounter";

type MirrorData = {
  title: string;
  body: string;
  tags: string[];
};

type Props = {
  state: any;
  a: number | null;
  b: number | null;
  activeRealmData: any;
  activeEra: string;
  oracleText: string;
  mirrorData: MirrorData;
  currentNidana: string | null;
  // 2026-08-22: se desestructuraba y se usaba (pasado a <Board>, línea
  // ~1135) pero nunca estuvo declarado en Props — TS no lo comprobaba.
  // Mismo tipo que Board.tsx espera para esta prop.
  nidanaCoinSrc?: string | null;
  nidanaCoinId: number | null;
nidanaCoinSide: "front" | "back";
  showVestigium: boolean;

  onVestigiumDone: () => void;
  onLogout: () => void;
  onRoll: () => void;
  onReset: () => void;
  // v11 — sonido de dados durante los clics decorativos de Genesis
  // (10 agosto 2026). onRoll solo se llama tras genesisComplete, así que
  // el sonido real (playDiceSound, App.tsx) nunca sonaba en los clics
  // decorativos — mismo patrón que ya se corrigió para el NÚMERO del
  // dado (genesisDiceA/B). Prop opcional para no romper otros usos de
  // GameShell que no la pasen.
  playDiceSound?: (player: "P1" | "P2") => void;

  onConsciousMove: (option: MoveOption, all: MoveOption[]) => void;
  onGenesisUIComplete?: () => void;
  onSelectPiece: (piece: PieceKind) => void;
  onSendEmoji: (emoji: string) => void;

  onCloseLedger: () => void;

  // DEV ONLY (13 agosto 2026) — atajo pedido por Federico, ver reducer.ts
  // case "DEV_SKIP_TO_RUFUS" (v54, 17 agosto 2026: renombrado — el atajo
  // se detiene en Rufus/5to Avatar, ya no en Whitman/6to, para que la
  // entrada real de Whitman se siga jugando a mano). Opcional para no
  // romper otros usos de GameShell que no la pasen.
  onDevSkipToRufus?: () => void;

  avatarVideoPlaying?: boolean;
};

export function GameShell({
  state,
  a,
  b,
  oracleText,
  mirrorData,
  currentNidana,
  nidanaCoinSrc,
  nidanaCoinId,
  nidanaCoinSide,
  showVestigium,
  onVestigiumDone,
  onRoll,
  onReset,
  onDevSkipToRufus,
  playDiceSound,
  onConsciousMove,
  onGenesisUIComplete,
  onSelectPiece,
  onSendEmoji,
  onCloseLedger,
  avatarVideoPlaying = false,
}: Props) {
const [hoveredOption, setHoveredOption] = React.useState<MoveOption | null>(null);
const [dicePopupVisible, setDicePopupVisible] = React.useState(false);
const [diceRolling, setDiceRolling] = React.useState(false);

// Clicks del dado *durante* Genesis (fases VIDEO/CASILLAS) — puramente
// decorativos, avanzan el reveal de casillas verdes. Deliberadamente NO
// despachan la acción ROLL real: el reducer bloquea un segundo ROLL
// mientras state.phase === "rolled" hasta que se elige y mueve una ficha,
// pero las fichas siguen ocultas durante Genesis, así que un ROLL real
// aquí dejaría el juego trancado tras el primer clic. Además evita que
// estos clics de calentamiento contaminen state.globalRollCount, que el
// Orquestador usa para la progresión real de eras.
const [genesisClickCount, setGenesisClickCount] = React.useState(0);

// Valor puramente cosmético para los clics decorativos del dado durante
// Genesis. state.rollOptions no cambia en esos clics (a propósito, ver
// arriba), así que antes el popup de dados se quedaba mostrando siempre
// el mismo número tras el giro. Este estado local no toca el reducer ni
// globalRollCount — solo hace que el número que se ve cambie en cada
// clic, igual que un roll real, mientras estás en Genesis.
const [genesisDiceA, setGenesisDiceA] = React.useState(1);
const [genesisDiceB, setGenesisDiceB] = React.useState(1);

const handleRollWithPopup = () => {
  setDicePopupVisible(true);
  setDiceRolling(true);

  if (!genesisComplete) {
    setGenesisClickCount((n) => n + 1);
    setGenesisDiceA(1 + Math.floor(Math.random() * 6));
    setGenesisDiceB(1 + Math.floor(Math.random() * 6));
    // Mismo criterio de paridad que isWhiteTurn (más abajo) para que el
    // sonido coincida con qué color de dado se ve girando.
    playDiceSound?.(genesisClickCount % 2 === 0 ? "P1" : "P2");
  } else {
    onRoll();
  }

  setTimeout(() => setDiceRolling(false), 900);
};

const [showWatcher, setShowWatcher] = React.useState(false);
const [watcherLine, setWatcherLine] = React.useState("I see you.");
const [showRealmMedal, setShowRealmMedal] = React.useState(false);
const [realmMedalKey, setRealmMedalKey] =
  React.useState<string | null>(null);

const WATCHER_LINES = [
  "I saw that.",
  "Not random.",
  "Again?",
  "Careful.",
  "You chose that.",
  "I see you.",
];

const triggerWatcher = (forcedLine?: string) => {
  const line =
    forcedLine ??
    WATCHER_LINES[Math.floor(Math.random() * WATCHER_LINES.length)];

  setWatcherLine(line);

  setShowWatcher(true);
  window.setTimeout(() => setShowWatcher(false), 1800);
};
const [, setShowNidanaSpinner] = React.useState(false);
const [, setVisibleNidana] = React.useState<string | null>(null);
const nidanaTimerRef = React.useRef<number | null>(null);
const prevNidanaRef = React.useRef<string | null>(null);
const clarityAudio = React.useRef<HTMLAudioElement | null>(null);
const distortionAudio = React.useRef<HTMLAudioElement | null>(null);
const tensionAudio = React.useRef<HTMLAudioElement | null>(null);
const cheeringAudio = React.useRef<HTMLAudioElement | null>(null);
const fireworksAudio = React.useRef<HTMLAudioElement | null>(null);
const scratchAudio = React.useRef<HTMLAudioElement | null>(null);
const fanfarriaAudio = React.useRef<HTMLAudioElement | null>(null);
const campanaFinalAudio = React.useRef<HTMLAudioElement | null>(null);
const [, setShowNidanaTitle] = React.useState(false);
// v53 (17 agosto 2026) — ver import de campanaFinalSound: se pone en
// true cuando termina la fanfarria del 6to Avatar, y hace que el mural
// de fondo (SamsaraStage/MaraLayer) muestre "7 nirvana dj.webp" (luna
// destapada) en vez de quedarse en "6 entra whitman.webp". No se
// resetea a mano: GameShell se remonta entero en cada reset de partida
// (App.tsx le pasa key={genesisResetSeq}), así que este estado vuelve
// solo a false en la partida siguiente.
const [nirvanaMuralRevealed, setNirvanaMuralRevealed] = React.useState(false);
// v55 (17 agosto 2026) — pedido de Federico: mural intermedio entre
// "6 entra whitman" y "7 nirvana dj". Se pone en true junto con el
// cartel "ONLY ONE MORE" (5/6 en Humans, ver p1NearWin/p2NearWin más
// abajo) y hace que el mural de fondo muestre "7 A one more.webp"
// (destapa el turbante, todavía NO la luna) en vez de "6 entra
// whitman.webp". nirvanaMuralRevealed (arriba) tiene prioridad sobre
// este cuando ambos son true (formación completa ya pasó por los 5/6
// en camino a los 6/6). Mismo criterio de no-reset-a-mano que
// nirvanaMuralRevealed: GameShell se remonta entero en cada reset.
const [oneMoreMuralRevealed, setOneMoreMuralRevealed] = React.useState(false);

// Escala dinámica del scene para llenar el viewport
React.useEffect(() => {
  const applyScale = () => {
    const scaleX = window.innerWidth  / 1116;
    const scaleY = window.innerHeight / 636;
    const scale  = Math.min(scaleX, scaleY);
    document.documentElement.style.setProperty('--scene-scale', String(scale));
  };
  applyScale();
  window.addEventListener('resize', applyScale);
  return () => window.removeEventListener('resize', applyScale);
}, []);

// Fullscreen + orientation lock al primer toque en móvil
React.useEffect(() => {
  const requestFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      if ((screen.orientation as any)?.lock) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {}
    document.removeEventListener('click', requestFullscreen);
    document.removeEventListener('touchstart', requestFullscreen);
  };
  document.addEventListener('click', requestFullscreen, { once: true });
  document.addEventListener('touchstart', requestFullscreen, { once: true });
  return () => {
    document.removeEventListener('click', requestFullscreen);
    document.removeEventListener('touchstart', requestFullscreen);
  };
}, []);

React.useEffect(() => {
   clarityAudio.current = new Audio(claritySound);
  distortionAudio.current = new Audio(distortionSound);
  tensionAudio.current = new Audio(tensionSound);

  cheeringAudio.current = new Audio(cheeringSound);
  fireworksAudio.current = new Audio(fireworksSound);
  scratchAudio.current = new Audio(scratchSound);
  fanfarriaAudio.current = new Audio(fanfarriaSound);
  campanaFinalAudio.current = new Audio(campanaFinalSound);

  if (cheeringAudio.current) cheeringAudio.current.volume = 0.18;
  if (fireworksAudio.current) fireworksAudio.current.volume = 0.12;
  // v54 (17 agosto 2026) — pedido de Federico: reemplazó el archivo de
  // scratch_buda_dj.mp3 por uno nuevo (mismo nombre/ruta, sin cambios
  // de código) pero sonaba "muy bajo, sin potencia". El archivo nuevo
  // no viene distorsionado ni recortado (llega a 0dB de pico), así que
  // el volumen 0.55 heredado del archivo VIEJO le dejaba ~45% de
  // volumen del navegador sin usar — subido a full (1.0, tope real de
  // HTMLAudioElement.volume) para que suene con toda la fuerza que
  // trae el archivo.
  if (scratchAudio.current) scratchAudio.current.volume = 1.0;
  if (fanfarriaAudio.current) fanfarriaAudio.current.volume = 0.5;
  if (campanaFinalAudio.current) campanaFinalAudio.current.volume = 0.5;

  // v55 (17 agosto 2026) — pedido de Federico, coreografía correcta
  // (corrige v53): la fanfarria NO suena cuando termina el video de
  // Whitman — suena cuando un jugador COMPLETA la formación física (6/6
  // fichas en Humans, ver el flanco p1FullFormation/p2FullFormation más
  // abajo, junto a p1NearWin/p2NearWin). Cuando la fanfarria termina de
  // sonar sola, esta campana tibetana suena y el mural pasa a mostrar
  // la luna destapada ("7 nirvana dj.webp"). Enganchada al 'ended'
  // nativo del audio (no un setTimeout con la duración copiada a mano)
  // para no desincronizarse si el archivo de fanfarria cambia de
  // duración — ya pasó una vez con el scratch del Buda DJ (ver v44).
  // Mismo patrón de reintento que ya usa este archivo (v26, v51) para
  // el .play() que puede fallar en silencio.
  const fanfarria = fanfarriaAudio.current;
  const onFanfarriaEnded = () => {
    setNirvanaMuralRevealed(true);
    const campana = campanaFinalAudio.current;
    if (!campana) return;
    campana.currentTime = 0;
    campana.play().catch(() => {
      console.warn("[whitman] campana final falló al reproducir, reintentando...");
      window.setTimeout(() => {
        campana.currentTime = 0;
        campana.play().catch(() => {
          console.warn("[whitman] campana final falló también en el reintento.");
        });
      }, 120);
    });
  };
  fanfarria?.addEventListener("ended", onFanfarriaEnded);

  return () => {
    fanfarria?.removeEventListener("ended", onFanfarriaEnded);
  };
}, []);

const prevTransitionsRef = React.useRef({
  P1: state.realmProgress.P1.realmTransitions,
  P2: state.realmProgress.P2.realmTransitions,
});

const triggerCelebrationSound = () => {
  // v26 (11 agosto 2026) — reportado dos veces (Margot y Oriol): el
  // audio de aplausos/cohetes a veces no suena tras una ascensión. El
  // trigger en sí dispara bien (independiente por jugador, sin
  // depender del video) — el problema es que .play() puede fallar de
  // forma silenciosa en el navegador (autoplay, dos audios
  // solapándose, etc.) y el .catch() vacío se lo tragaba sin dejar
  // rastro. Ahora: si falla, reintenta una vez tras un instante, y deja
  // un aviso en consola para poder diagnosticar si sigue pasando.
  const playWithRetry = (audio: HTMLAudioElement | null, label: string) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      console.warn(`[celebración] ${label} falló al reproducir, reintentando...`);
      window.setTimeout(() => {
        audio.currentTime = 0;
        audio.play().catch(() => {
          console.warn(`[celebración] ${label} falló también en el reintento.`);
        });
      }, 120);
    });
  };

  playWithRetry(cheeringAudio.current, "aplausos");
  playWithRetry(fireworksAudio.current, "cohetes");
};
React.useEffect(() => {
  const p1Now = state.realmProgress.P1.realmTransitions;
  const p2Now = state.realmProgress.P2.realmTransitions;

  const ascended =
    p1Now > prevTransitionsRef.current.P1 ||
    p2Now > prevTransitionsRef.current.P2;

 if (ascended) {
  const key = state.realmAscension?.realmKey ?? null;

  setRealmMedalKey(key);

  triggerCelebrationSound();

  setShowRealmMedal(true);
  window.setTimeout(() => setShowRealmMedal(false), 6000);
}

  prevTransitionsRef.current = {
    P1: p1Now,
    P2: p2Now,
  };
}, [
  state.realmProgress.P1.realmTransitions,
  state.realmProgress.P2.realmTransitions,
]);
React.useEffect(() => {
  if (!state.activeNidanaEffect) return;

  const play = (audio: HTMLAudioElement | null) => {
    if (!audio) return;
    audio.currentTime = 0;
    audio.volume = 0.25;
    audio.play().catch(() => {});
  };

  if (state.activeNidanaEffect === "CLARITY") {
    play(clarityAudio.current);
  }

  if (state.activeNidanaEffect === "DISTORTION") {
    play(distortionAudio.current);
  }

  if (state.activeNidanaEffect === "TENSION") {
    play(tensionAudio.current);
  }
}, [state.activeNidanaEffect]);
  const moveOptions =
    state.phase === "rolled"
      ? getMoveOptionsForPlayer(state, state.turn)
      : [];

  // 2026-08-23 — reportado por Federico: elegía un Avatar, probaba los
  // 3 Venenos y no aparecía ninguna opción de movimiento. Causa: la
  // regla PIG (venomImpulse.ts) obliga en silencio a elegir OTRO
  // Avatar (uno que volvió de Mara y todavía no se movió desde
  // entonces) — sin este aviso, cualquier otro Avatar elegido da
  // siempre cero opciones, sin ninguna pista de por qué. Null cuando
  // no hay ningún Avatar forzado este turno (el caso normal).
  const pigForcedAvatarKind =
    state.phase === "rolled"
      ? getPigForcedAvatar(state, state.turn)
      : null;

  const pigForcedAvatarName = pigForcedAvatarKind
    ? ACTOR_PROFILES[AVATAR_ORDER[REALM_PIECE_ORDER.indexOf(pigForcedAvatarKind)]]
        ?.name ?? pigForcedAvatarKind
    : null;

  const showPigForcedHint =
    pigForcedAvatarKind !== null &&
    state.selectedPiece[state.turn] !== pigForcedAvatarKind;
// 2026-08-05: brunoAwakened vivía como estado local disparado apenas
// CUALQUIER pieza de cada tipo (pig/snake/rooster) se movía una vez —
// alcanzaba con ~3 movidas de UN jugador, así que "THE FIRST EYE OPENS"
// (el ojo, el conector del buda) aparecía a los pocos lances, mucho antes
// de lo previsto. El trigger real y riguroso ya vive en el reducer/
// Orchestrator (evaluateGenesisToBruno: ambos jugadores usaron los 3
// Venenos, mínimo de turnos, 4 eventos de novedad) y se expone como
// state.brunoRevealed.
//
// v19 (10 agosto 2026) — Federico confirmó explícitamente (dos veces)
// que el buda/conector y las nidanas deben esperar a Oriol, no a
// Bruno — mismo criterio que ya se corrigió para shouldTriggerNidana
// en App.tsx. "THE FIRST EYE OPENS" seguía sonando a "el momento de
// Bruno" por el nombre, pero el diseño real es que todo este sistema
// (conector, globo de texto, nidanas) es una capa que arranca en
// Oriol — no antes.
//
// v36 (13 agosto 2026) — se retira el viejo "brunoAwakened" local
// (`state.realmProgress[state.turn].currentRealmStep >= 3`): era
// re-derivado del TURNO ACTUAL, así que alternaba false/true solo por
// cambiar de jugador (aunque ningún evento narrativo nuevo hubiera
// pasado) — eso rompía el pedido de Federico de que el cartel sea un
// evento único, no una condición que parpadea con cada movida/turno.
// La fuente de verdad real y global para "Oriol ya entró" es
// `oriolEntered` (más abajo, deriva de state.cosmicClock.era) — es la
// MISMA que ya gatea el resto de la capa Oriol en este archivo
// (FandangoKarma, línea ~626). El disparo del cartel ahora vive en el
// useEffect de flanco (edge) más abajo, después de definir oriolEntered.

// 2026-08-05 — secuencia pedida por el usuario: después de las 24
// casillas verdes (6 clics, GenesisReveal), NO se revela todo junto.
// Primero terminan las casillas (casillasFinished), luego 2 clics más:
// uno revela los Venenos del jugador blanco, el siguiente los del
// jugador negro. genesisComplete (que gatea el resto — anillo, chat,
// buda, yin-yang) ya no es un estado propio: es "ambos ya revelados".
const [casillasFinished, setCasillasFinished] = React.useState(false);
const [introSkipped, setIntroSkipped] = React.useState(false);
const p1VenomsRevealed =
  introSkipped || (casillasFinished && genesisClickCount >= 1);
const p2VenomsRevealed =
  introSkipped || (casillasFinished && genesisClickCount >= 2);
const genesisComplete = p2VenomsRevealed;
// Notificar al reducer cuando el Genesis visual termina
React.useEffect(() => {
  if (genesisComplete) onGenesisUIComplete?.();
}, [genesisComplete]);

// 2026-08-05 — pedido del usuario: el buda azul (Dharma Emergencies),
// el chat Karma Fandango y el yin-yang (dentro de SacredProgress) no
// deben aparecer con genesisComplete — recién con la entrada real de
// Oriol (3er Avatar). state.cosmicClock.era ya se actualiza en el
// reducer cuando el Orquestador revela cada Avatar (ver RFC Cosmic
// Clock — leer ese estado para gatear otra UI sí es un uso válido de
// "consumidor", no se está construyendo el componente aplazado).
//
// v59 (20 agosto 2026) — ERA_ORDER pasó a ser un alias de AVATAR_ORDER
// (historicalClock.ts, usado por el Historical Time Counter): mismos 6
// valores que ya vivían acá, ahora en una sola fuente de verdad en vez
// de dos arrays idénticos mantenidos a mano por separado.
const ERA_ORDER = AVATAR_ORDER;
const oriolEntered =
  ERA_ORDER.indexOf(state.cosmicClock.era as (typeof ERA_ORDER)[number]) >=
  ERA_ORDER.indexOf("oriol");
// v56 (17 agosto 2026) — pedido de Federico: reportó "ONLY ONE MORE" +
// Buda DJ + mural de turbante destapado disparándose con el 5to Avatar
// (Rufus) recién llegando a Humans, SIN que Whitman hubiera entrado
// todavía. Causa real: countNirvanaFormationProgress cuenta CUALQUIER
// 5 de las 6 fichas propias en Humans, sin importar cuáles — nada
// obligaba a que la ficha faltante fuera justo la de Whitman. Ver el
// gate whitmanEntered && más abajo, junto a p1NearWin/p2NearWin.
const whitmanEntered =
  ERA_ORDER.indexOf(state.cosmicClock.era as (typeof ERA_ORDER)[number]) >=
  ERA_ORDER.indexOf("whitman");

// v59 (20 agosto 2026) — Historical Time Counter: índice del avatar
// actual dentro de AVATAR_ORDER (-1 si todavía no apareció Bruno).
// Único punto donde GameShell traduce cosmicClock.era a un índice
// numérico para el contador — HistoricalTimeCounter no conoce nombres
// de avatar, solo índices.
const currentAvatarIndex = ERA_ORDER.indexOf(
  state.cosmicClock.era as (typeof ERA_ORDER)[number]
);
const diceFrozen = state.phase === "rolled";

// v36 (13 agosto 2026) — cartel del buda (DharmaBubble/DharmaConnector,
// mismo cupo visual de siempre, ver MaraLayer) convertido de condición
// persistente a EVENTO efímero de un solo disparo: aparece ~5s y se
// desvanece (~700ms de fade), nunca queda pegado. Dos disparadores,
// cada uno detectado por FLANCO (edge) sobre fuentes de verdad que YA
// existen — no se crea ningún estado de juego nuevo, solo el
// temporizador de UI (mismo patrón que ya usa este archivo para las
// nidanas: nidanaTimerRef/showNidanaSpinner más arriba):
//   1) "THE FIRST EYE OPENS." — al cruce false→true de oriolEntered
//      (arriba), que ya es la fuente de verdad global para "Oriol
//      entró de verdad" (misma que gatea FandangoKarma más abajo).
//   2) "WHITE/BLACK: ONLY ONE MORE." — al cruce a exactamente 5 de 6
//      en countNirvanaFormationProgress (ver más abajo, junto a
//      p1NearWin/p2NearWin) — se re-arma solo si el jugador baja de 5
//      y vuelve a subir (flanco real, no "está en 5" continuo). 6/6
//      (victoria) NO pasa por acá — queda para el futuro evento de
//      Nirvana, sin tocar la condición de victoria.
const prevOriolEnteredRef = React.useRef(false);
const prevNearWinRef = React.useRef<{ P1: boolean; P2: boolean }>({
  P1: false,
  P2: false,
});
const dharmaHideTimerRef = React.useRef<number | null>(null);
const dharmaFadeTimerRef = React.useRef<number | null>(null);
const [transientDharma, setTransientDharma] = React.useState<{
  message: string;
  big: boolean;
  fading: boolean;
  withDjBuddha: boolean;
} | null>(null);

// v43 (13 agosto 2026) — withDjBuddha es opcional (default false) para
// no afectar "THE FIRST EYE OPENS.", que sigue sin la imagen/sonido.
// Mismo timing exacto que ya usa el cartel de texto (5s + 700ms fade) —
// se reutiliza transientDharma.fading para las dos cosas a la vez, no
// se crean timers nuevos ni una segunda fuente de verdad de timing.
const fireDharmaEvent = React.useCallback(
  (message: string, big: boolean, withDjBuddha: boolean = false) => {
    if (dharmaHideTimerRef.current) window.clearTimeout(dharmaHideTimerRef.current);
    if (dharmaFadeTimerRef.current) window.clearTimeout(dharmaFadeTimerRef.current);

    setTransientDharma({ message, big, fading: false, withDjBuddha });

    // v51 (14 agosto 2026) — Federico reportó el scratch del Buda DJ sin
    // sonar en un playtest real (el cartel y la imagen sí aparecieron).
    // Mismo problema ya visto y arreglado en aplausos/cohetes (v26, 11
    // agosto): .play() puede fallar de forma silenciosa (autoplay,
    // audios solapados, buffer todavía cargando) y el .catch() vacío se
    // lo tragaba sin dejar rastro. Mismo arreglo: un reintento + aviso
    // en consola para diagnosticar si vuelve a pasar.
    if (withDjBuddha && scratchAudio.current) {
      const audio = scratchAudio.current;
      audio.currentTime = 0;
      audio.play().catch(() => {
        console.warn("[buda dj] scratch falló al reproducir, reintentando...");
        window.setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(() => {
            console.warn("[buda dj] scratch falló también en el reintento.");
          });
        }, 120);
      });
    }

    dharmaHideTimerRef.current = window.setTimeout(() => {
      setTransientDharma((cur) => (cur ? { ...cur, fading: true } : cur));

      dharmaFadeTimerRef.current = window.setTimeout(() => {
        setTransientDharma(null);
      }, 700);
    }, 5000);
  },
  []
);

React.useEffect(() => {
  return () => {
    if (dharmaHideTimerRef.current) window.clearTimeout(dharmaHideTimerRef.current);
    if (dharmaFadeTimerRef.current) window.clearTimeout(dharmaFadeTimerRef.current);
  };
}, []);

React.useEffect(() => {
  if (oriolEntered && !prevOriolEnteredRef.current) {
    fireDharmaEvent("THE FIRST EYE OPENS.", false);
  }
  prevOriolEnteredRef.current = oriolEntered;
}, [oriolEntered, fireDharmaEvent]);

// v58 (18 agosto 2026) — pedido de Federico: banner de Veneno
// (icono + IGNORANCE/ANGER/IMPULSE, ver VenomBanner.tsx) que aparece
// cada vez que un jugador escoge un Veneno, en Fase 1 (selectedPiece
// es directamente el Veneno) o Fase 2 (selectedVenom, segundo clic
// después de elegir Avatar). Timer propio y corto (no comparte
// dharmaHideTimerRef/fadeTimerRef de arriba): esto dispara mucho más
// seguido que un evento narrativo, un cartel de 5s sería molesto.
const BASE_PIECE_KINDS_LOCAL = ["pig", "snake", "rooster"] as const;
const me = state.turn as "P1" | "P2";
const phase2Active = state.realmProgress[me].currentRealmStep >= 3;
const rawSelection = phase2Active
  ? state.selectedVenom[me]
  : state.selectedPiece[me];
const selectedVenomKind = BASE_PIECE_KINDS_LOCAL.includes(rawSelection)
  ? (rawSelection as (typeof BASE_PIECE_KINDS_LOCAL)[number])
  : null;

// v58 — arranca en el valor YA seleccionado al montar (selectedPiece
// por defecto es "pig" para ambos jugadores desde el estado inicial,
// no null) para no disparar el banner solo por cargar la partida;
// useRef(initialValue) solo usa este valor en el primer render, así
// que sigue detectando bien los cambios reales después.
const prevVenomSelectionRef = React.useRef<string | null>(selectedVenomKind);
const venomBannerHideTimerRef = React.useRef<number | null>(null);
const venomBannerFadeTimerRef = React.useRef<number | null>(null);
const [venomBanner, setVenomBanner] = React.useState<{
  kind: (typeof BASE_PIECE_KINDS_LOCAL)[number];
  fading: boolean;
} | null>(null);

React.useEffect(() => {
  // Flanco: solo dispara cuando la selección de Veneno CAMBIA a una
  // nueva pieza (no en cada render, no al deseleccionar).
  if (selectedVenomKind && selectedVenomKind !== prevVenomSelectionRef.current) {
    if (venomBannerHideTimerRef.current)
      window.clearTimeout(venomBannerHideTimerRef.current);
    if (venomBannerFadeTimerRef.current)
      window.clearTimeout(venomBannerFadeTimerRef.current);

    setVenomBanner({ kind: selectedVenomKind, fading: false });

    venomBannerHideTimerRef.current = window.setTimeout(() => {
      setVenomBanner((cur) => (cur ? { ...cur, fading: true } : cur));
      venomBannerFadeTimerRef.current = window.setTimeout(() => {
        setVenomBanner(null);
      }, 250);
    }, 1400);
  }
  prevVenomSelectionRef.current = selectedVenomKind;
}, [selectedVenomKind]);

React.useEffect(() => {
  return () => {
    if (venomBannerHideTimerRef.current)
      window.clearTimeout(venomBannerHideTimerRef.current);
    if (venomBannerFadeTimerRef.current)
      window.clearTimeout(venomBannerFadeTimerRef.current);
  };
}, []);

// 2026-08-05 — pedido del usuario: el mural de "Bruno" no debe verse
// apenas se pintan las casillas — debe esperar hasta que el video intro
// de Bruno se dispare de verdad (cosmicClock.transitionSequence === 0
// todavía cubre exactamente ese caso: antes de la primera transición
// real, no se muestra ningún mural de Avatar).
//
// v20 (10 agosto 2026) — el desplazamiento de "-1" que había aquí
// compensaba a propósito el desfase de nombres entre avatarStep y
// REALM_PIECE_ORDER que ya se corrigió de raíz hoy (ver "reparación de
// identidad de etapa", reducer.ts) — cosmicClock.era ya dice "bruno" en
// el momento real en que Bruno nace, no "margot". Mantener el "-1" aquí
// ahora mostraría el mural del Avatar ANTERIOR al que realmente está
// activo. Se quita — cosmicClock.era ya es la fuente de verdad directa.
// v55 (17 agosto 2026) — nirvanaMuralRevealed/oneMoreMuralRevealed (ver
// más arriba) pisan a state.cosmicClock.era: ese campo real del juego
// nunca llega a valer "nirvana" ni "one_more" (llega hasta "whitman" y
// se queda ahí hasta la victoria real), así que sin este override el
// mural se quedaría en "6 entra whitman.webp" para siempre. Orden:
// nirvana (6/6, luna destapada) gana sobre one_more (5/6, turbante
// destapado) — para cuando llega la formación completa, los 5/6 ya
// pasaron.
const muralEra = nirvanaMuralRevealed
  ? "nirvana"
  : oneMoreMuralRevealed
    ? "one_more"
    : state.cosmicClock.transitionSequence === 0
      ? "none"
      : state.cosmicClock.era;

const [genesisPhase, setGenesisPhase] = React.useState<string>("VIDEO");

const handleMove = (opt: MoveOption, all: MoveOption[]) => {
  setHoveredOption(null);
  onConsciousMove(opt, all);
};
React.useEffect(() => {
  if (state.phase !== "rolled") setHoveredOption(null);
}, [state.phase]);
// v58 (18 agosto 2026) — pedido de Federico: el video de Jesús (watcher)
// debe salir cuando un jugador usa la Culebra (Snake) 2 veces SEGUIDAS,
// pero solo después de que Oriol haya entrado (mismo gate `oriolEntered`
// que ya usa "THE FIRST EYE OPENS" más arriba). Antes de este cambio el
// watcher solo tenía dos disparadores: captura (siempre) y 35% random en
// cualquier movimiento — ninguno de los dos tenía relación con la
// Culebra ni con Oriol.
//
// snakeStreakRef cuenta rachas POR JUGADOR (no rachas globales de
// movimientos): solo se incrementa cuando el propio Veneno usado en el
// movimiento (state.lastMove.venomUsed, ya sea Fase 1 directo o Fase 2
// vía Avatar+Veneno) es "snake", y se resetea a 0 en cualquier otro
// movimiento de ese jugador. Como el jugador rival no toca el contador
// del otro, esto ya captura "2 veces seguidas" del MISMO jugador aunque
// el turno del rival quede intercalado en el medio.
const snakeStreakRef = React.useRef<{ P1: number; P2: number }>({
  P1: 0,
  P2: 0,
});

React.useEffect(() => {
  if (!state.lastMove) return;

  const player = state.lastMove.player as PlayerId;
  const usedSnake = state.lastMove.venomUsed === "snake";

  if (usedSnake) {
    snakeStreakRef.current[player] += 1;
  } else {
    snakeStreakRef.current[player] = 0;
  }

  if (oriolEntered && snakeStreakRef.current[player] >= 2) {
    snakeStreakRef.current[player] = 0;
    triggerWatcher("Anger, again?");
    return;
  }

  if (state.lastMove.didCapture) {
    triggerWatcher();
    return;
  }

  if (Math.random() < 0.35) {
    triggerWatcher();
  }
}, [state.lastMove, oriolEntered]);

React.useEffect(() => {
  if (!currentNidana) return;

  prevNidanaRef.current = currentNidana;
  setVisibleNidana(currentNidana);
  setShowNidanaSpinner(true);

  if (nidanaTimerRef.current) {
    window.clearTimeout(nidanaTimerRef.current);
  }

  nidanaTimerRef.current = window.setTimeout(() => {
    setShowNidanaSpinner(false);

setShowNidanaTitle(true);

window.setTimeout(() => {
  setShowNidanaTitle(true);

  window.setTimeout(() => {
    setShowNidanaTitle(false);
  }, 8000);
}, 1800);

    nidanaTimerRef.current = window.setTimeout(() => {
      setVisibleNidana(null);
    }, 3000);
  }, 1200);

  return () => {
    if (nidanaTimerRef.current) {
      window.clearTimeout(nidanaTimerRef.current);
    }
  };
}, [currentNidana]);

const realmCoinMap = {
  hungry_ghost: {
    front: "/assets/coin_hungry_ghost_front.webp",
    back: "/assets/coin_hungry_ghost_back.webp",
  },

  hell: {
    front: "/assets/coin_hell_front.webp",
    back: "/assets/coin_hell_back.webp",
  },

  animals: {
    front: "/assets/coin_animal_front.webp",
    back: "/assets/coin_animal_back.webp",
  },

  humans: {
    front: "/assets/coin_human_front.webp",
    back: "/assets/coin_human_back.webp",
  },

  asura: {
    front: "/assets/coin_asura_front.webp",
    back: "/assets/coin_asura_back.webp",
  },

  deva: {
    front: "/assets/coin_deva_front.webp",
    back: "/assets/coin_deva_back.webp",
  },
} as const;

const currentRealmKey =
  realmMedalKey as keyof typeof realmCoinMap | null;

console.log("REALM ASCENSION:", currentRealmKey);

const coinRealmKey =
  currentRealmKey === "asura"
    ? "deva"
    : currentRealmKey === "deva"
    ? "asura"
    : currentRealmKey;

const currentRealmCoin =
  (coinRealmKey && realmCoinMap[coinRealmKey]) ||
  realmCoinMap.humans ||
  {
    front: "/assets/coin_human_front.webp",
    back: "/assets/coin_human_back.webp",
  };

console.log("ORACLE TEXT:", oracleText);

console.log("MIRROR DATA:", mirrorData);

console.log(
  "BUDDHA MESSAGE:",
  `${oracleText}\n\n${mirrorData.title}\n${mirrorData.body}`
);

// Antes esto era un string fijo ("THE FIRST EYE OPENS.") que se mostraba
// apenas terminaba Genesis, sin haber pasado nada en la partida real —
// daba la sensación de "saltar" a una partida ya avanzada. Luego (v35,
// 12 agosto) pasó a ser una condición persistente reusando el mismo
// cartel para "a un Avatar del final" (5 de 6 en Humans) — pero
// Federico señaló que quedaba pegado en pantalla el resto de la
// partida sin motivo ("¿y qué? ¿es tuerto?").
//
// v36 (13 agosto 2026) — ambos casos son ahora EVENTOS de flanco (ver
// fireDharmaEvent y los dos useEffect más arriba, junto a
// oriolEntered). Acá solo se calculan las fuentes de verdad
// (p1NearWin/p2NearWin, sin cambios) y se dispara el evento de
// "ONLY ONE MORE" cuando cualquiera de los dos CRUZA a exactamente 5 —
// se re-arma solo si el jugador baja de 5 y vuelve a subir (flanco
// real). isDharmaBig ya no se deriva de nearWinMessage: viaja adentro
// de transientDharma, fijado en el momento del disparo (ver
// fireDharmaEvent), para que el cartel de "THE FIRST EYE OPENS." (no
// grande) y el de "ONLY ONE MORE." (3x, ver DharmaBubble.css) no se
// mezclen aunque ambas condiciones cambien en el mismo render.
const p1NearWin = countNirvanaFormationProgress(state, "P1");
const p2NearWin = countNirvanaFormationProgress(state, "P2");

React.useEffect(() => {
  // v56 (17 agosto 2026) — gate whitmanEntered && agregado (ver más
  // arriba): sin esto, un jugador podía juntar 5 de sus OTRAS 5 fichas
  // en Humans (bruno..rufus) antes de que Whitman siquiera entrara al
  // juego, y "ONLY ONE MORE" salía igual — mal, porque la ficha que
  // falta ahí NO es necesariamente la de Whitman. Se evalúa como
  // condición combinada (no solo en el valor de count) para que el
  // flanco dispare correctamente sin importar el orden en que se
  // cumplen las dos cosas: si Whitman entra DESPUÉS de que el jugador
  // ya tenía 5 en Humans, el cruce de whitmanEntered (false→true) es lo
  // que arma el disparo en ese momento, aunque el count no haya
  // cambiado en ese render.
  const p1At5 = whitmanEntered && p1NearWin === 5;
  const p2At5 = whitmanEntered && p2NearWin === 5;

  if (p1At5 && !prevNearWinRef.current.P1) {
    fireDharmaEvent("WHITE: ONLY ONE MORE.", true, true);
    // v55 (17 agosto 2026) — mismo flanco de "ONLY ONE MORE": el mural
    // de fondo pasa a "7 A one more.webp" (turbante destapado).
    setOneMoreMuralRevealed(true);
  } else if (p2At5 && !prevNearWinRef.current.P2) {
    fireDharmaEvent("BLACK: ONLY ONE MORE.", true, true);
    setOneMoreMuralRevealed(true);
  }

  prevNearWinRef.current = { P1: p1At5, P2: p2At5 };
}, [p1NearWin, p2NearWin, whitmanEntered, fireDharmaEvent]);

// v55 (17 agosto 2026) — pedido de Federico: cuando un jugador COMPLETA
// la formación física (6/6 fichas en Humans — mismo p1NearWin/p2NearWin
// de arriba, reusado, ya cuenta 0-6), suena la fanfarria. Mismo patrón
// de flanco que el resto de este archivo (prevFullFormationRef, edge
// false→true, se re-arma si baja de 6 y vuelve a subir — no debería
// pasar en la práctica, pero mantiene el mismo criterio que
// prevNearWinRef por consistencia). Cuando la fanfarria termina de
// sonar sola, el listener 'ended' (ver useEffect de setup de audios,
// más arriba) dispara la campana + nirvanaMuralRevealed.
const prevFullFormationRef = React.useRef<{ P1: boolean; P2: boolean }>({
  P1: false,
  P2: false,
});

React.useEffect(() => {
  const p1Full = p1NearWin === 6;
  const p2Full = p2NearWin === 6;

  if (
    (p1Full && !prevFullFormationRef.current.P1) ||
    (p2Full && !prevFullFormationRef.current.P2)
  ) {
    const audio = fanfarriaAudio.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        console.warn("[whitman] fanfarria falló al reproducir, reintentando...");
        window.setTimeout(() => {
          audio.currentTime = 0;
          audio.play().catch(() => {
            console.warn("[whitman] fanfarria falló también en el reintento.");
          });
        }, 120);
      });
    }
  }

  prevFullFormationRef.current = { P1: p1Full, P2: p2Full };
}, [p1NearWin, p2NearWin]);

const buddhaMessage = transientDharma?.message ?? "";
const isDharmaBig = transientDharma?.big ?? false;
const isDharmaFading = transientDharma?.fading ?? false;
const showDjBuddha = transientDharma?.withDjBuddha ?? false;
  
return (

  <>

    {/* <TopBar onLogout={onLogout} /> */}

    <VestigiumOverlay

      show={showVestigium}

      onDone={onVestigiumDone}

    />
{showWatcher && (
  <div className="watcherOverlay">
    <div className="watcherTextTop">{watcherLine}</div>

    <video
      src={watcherVideo}
      autoPlay
      muted
      playsInline
      className="watcherVideo"
    />
  </div>
)}

<div className="gameViewport">
  {false && showRealmMedal && currentRealmCoin && (
    <div className="realmMedalFlip">
      <div className="realmMedalInner">
        <img src={currentRealmCoin.front} className="realmMedalFace" />
        <img src={currentRealmCoin.back} className="realmMedalFace realmMedalBack" />
      </div>
    </div>
  )}

  <div className="rotateHint">
    <span>↺</span>
    Rotate your device to play
  </div>

  <div className="samsaraStage">
    <div className="samsaraScene">
      {/* DEV ONLY (13 agosto 2026) — atajo a pedido de Federico para
          probar contenido de fin de partida sin jugar toda la
          progresion Bruno->Rufus cada vez. No aparece en el flujo
          normal de juego, solo un boton chico y discreto.
          v54 (17 agosto 2026) — se detiene en Rufus (5to Avatar), no en
          Whitman (6to): Federico quiere jugar a mano el último tramo y
          ver la entrada real de Whitman (video/fanfarria/campana/foto
          de la luna) en su momento real, no adelantada por el atajo. */}
      {genesisComplete && onDevSkipToRufus && (
        <button
          onClick={onDevSkipToRufus}
          style={{
            position: "absolute",
            right: 8,
            top: 8,
            zIndex: 20000,
            fontSize: 11,
            padding: "4px 8px",
            borderRadius: 6,
            background: "rgba(0,0,0,0.55)",
            color: "#f5d76e",
            border: "1px solid rgba(245,215,110,0.4)",
            cursor: "pointer",
          }}
        >
          DEV: → Rufus
        </button>
      )}

      {/* v51 (14 agosto 2026) — leyenda de reinos (v45, 13 agosto)
          quitada a pedido de Federico: ya quedó claro en pantalla cuál
          color/rango es cada reino, no hace falta el cartelito
          permanente abajo a la derecha. */}

      <HistoricalTimeCounter
        currentAvatarIndex={currentAvatarIndex}
        frozen={diceFrozen}
        moveSignal={state.lastMove?.at ?? 0}
        avatarVideoPlaying={avatarVideoPlaying}
      />

      <VenomBanner
        kind={venomBanner?.kind ?? null}
        fading={venomBanner?.fading ?? false}
      />

      {/* 2026-08-23 — reportado por Federico: elegía un Avatar, probaba
          los 3 Venenos, y no aparecía ninguna opción de movimiento. La
          regla PIG estaba obligando en silencio a OTRO Avatar (uno que
          volvió de Mara y todavía no se movió) — sin ningún aviso en
          pantalla de cuál. Este cartel avisa cuál Avatar hay que elegir
          este turno; se oculta apenas ese sea el Avatar seleccionado. */}
      {showPigForcedHint && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: 96,
            transform: "translateX(-50%)",
            zIndex: 9500,
            background: "rgba(20, 10, 0, 0.88)",
            border: "1px solid rgba(255, 200, 80, 0.6)",
            borderRadius: 12,
            padding: "8px 16px",
            color: "#ffe9a8",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textAlign: "center",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          {pigForcedAvatarName} just returned from Mara — must move this turn
        </div>
      )}

      <SamsaraStage
        dharmaMessage={buddhaMessage}
        dharmaBig={isDharmaBig}
        dharmaFading={isDharmaFading}
        realmStep={Math.max(
          state.realmProgress.P1.currentRealmStep,
          state.realmProgress.P2.currentRealmStep
        )}
        lastRealmKey={state.realmAscension?.realmKey ?? null}
        globalRollCount={genesisClickCount}
        genesisComplete={genesisComplete}
        boardPainted={casillasFinished}
        era={muralEra}
        onGenesisComplete={() => setCasillasFinished(true)}
        onGenesisPhaseChange={(phase) => setGenesisPhase(phase)}
        onGenesisSkip={() => {
          setCasillasFinished(true);
          setIntroSkipped(true);
        }}
      />

      {/* v29 (11 agosto 2026) — apagado a pedido de Federico: el Yin-Yang
          (dentro de SacredProgress) no comunica información legible en
          juego ("¿quién domina? ¿qué significa esta pepa aquí? ¿qué
          consecuencia estratégica tiene?"). No se borra el componente —
          solo se apaga el render, por si se retoma como elemento visual
          puro o se rediseña con una intención más específica por reino. */}
      {false && oriolEntered && (
        <SacredProgress
          p1Completed={state.realmProgress.P1.realmTransitions}
          p2Completed={state.realmProgress.P2.realmTransitions}
        />
      )}

      {genesisComplete && <MaraPanel state={state} />}

      {/* v43 (13 agosto 2026) — buda DJ: entra desde la izquierda
          tapando a Mara cuando se dispara "ONLY ONE MORE" (5 de 6 en
          Humans), mismo timing que el cartel de texto (isDharmaFading,
          ver fireDharmaEvent más arriba). Posicionado adentro de
          .samsaraScene (no document.body) para que trackee el tablero
          escalado en vez del viewport crudo — mismo criterio que ya
          usa MoveOptionsPanel.

          v50 (14 agosto 2026) — a pedido de Federico: 80% mas grande
          (220px -> 396px) y espejada horizontalmente para que la luna
          del poster caiga del mismo lado que la luna pintada en el
          mural del tablero. El slide/fade (clases djBuddhaPoster/
          djBuddhaPosterFading, ver overlays.css) sigue animando el
          DIV contenedor sin tocar transform ahi; el espejo
          (scaleX(-1)) va aparte, solo en el <img> interno, para no
          pelear con esas animaciones de transform. */}
      {showDjBuddha && (
        <div
          className={`djBuddhaPoster${
            isDharmaFading ? " djBuddhaPosterFading" : ""
          }`}
          style={{
            position: "absolute",
            left: 0,
            top: "50%",
            width: 396,
            zIndex: 10550,
            pointerEvents: "none",
          }}
        >
          <img
            src={djBuddhaPoster}
            alt=""
            style={{
              display: "block",
              width: "100%",
              transform: "scaleX(-1)",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
            }}
          />
        </div>
      )}

      {/* v34 (12 agosto 2026) — state.winner ya se calculaba bien, nada
          en la interfaz lo mostraba. Encima de todo lo demás. */}
      {state.winner && (
        <VictoryScreen winner={state.winner} onPlayAgain={onReset} />
      )}

     {oriolEntered && <FandangoKarma />}

      {/* Dados ocultos durante video intro del Genesis */}
      {(genesisComplete || genesisPhase !== "VIDEO") && (
        <DicePopup
          visible={dicePopupVisible}
          rollA={genesisComplete ? a : genesisDiceA}
          rollB={genesisComplete ? b : genesisDiceB}
          rolling={diceRolling}
          turn={state.turn}
          onDismiss={() => setDicePopupVisible(false)}
        />
      )}

      {/*
        boardLayer ya no se oculta por completo durante Genesis: el dado real
        de piedra (dentro de Board/ringWrap, zIndex 5000) debe quedar visible
        y clicable encima del overlay NEBULA/CASILLAS desde que termina el
        video. Lo que sí sigue oculto hasta genesisComplete —anillo de
        casillas, fichas Avatar, fichas Veneno, MoveEmanations— se gatea
        dentro de Board.tsx, no aquí.
      */}
      <div className="boardLayer" style={{ opacity: 1 }}>
        <Board
          state={state}
          onSelectPiece={onSelectPiece}
          hoveredOption={hoveredOption}
          moveOptions={moveOptions}
          onChooseMove={handleMove}
          onSendEmoji={onSendEmoji}
          onRoll={handleRollWithPopup}
          nidanaCoinSrc={genesisComplete ? nidanaCoinSrc : null}
          nidanaCoinSide={nidanaCoinSide}
          nidanaCoinId={genesisComplete ? nidanaCoinId : null}
          genesisComplete={genesisComplete}
          genesisVideoDone={genesisPhase !== "VIDEO"}
          genesisClickCount={genesisClickCount}
          p1VenomsRevealed={p1VenomsRevealed}
          p2VenomsRevealed={p2VenomsRevealed}
          oriolEntered={oriolEntered}
        />
      </div>
    </div>
  </div>
</div>

<LedgerModal
  open={state.ledgerOpen}
  entryId={state.ledgerEntry}
  onClose={onCloseLedger}
/>

</>
);
}