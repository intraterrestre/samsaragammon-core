import React from "react";

import { TopBar } from "./TopBar";
import { EvolutionStatus } from "./EvolutionStatus";
import { DicePopup } from "./DicePopup";

import { MasterPanel } from "./MasterPanel";
import { MirrorPanel } from "./MirrorPanel";
import { VestigiumOverlay } from "./VestigiumOverlay";
import { LedgerModal } from "./LedgerModal";

import { Board } from "../game/Board";
import { getMoveOptionsForPlayer } from "../game/rules/getMoveOptionsForPlayer";

import { FandangoKarma } from "../fandango/FandangoKarma";
import { MaraPanel } from "./MaraPanel";
import { SamsaraStage } from "../samsara/SamsaraStage";

import watcherVideo from "../assets/video/jesus_watch.mp4";
import type { MoveOption, PieceKind } from "../game/types";

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
// (ya subida a assets/intro) como SEGUNDO frame del mismo evento — no
// reemplaza a buda_dj_poster.png, aparece después de él mientras el
// cartel sigue en pantalla (ver djImageSwapTimerRef / showOneMoreImage
// más abajo).
import djBuddhaOneMore from "../assets/intro/7 A  one more .webp";
// v44 (13 agosto 2026) — Federico reemplazó el primer scratch por uno
// mejor/más suave. scratch_pre_win.wav queda sin usar en el repo (no
// se pudo borrar el archivo desde acá) — se puede eliminar a mano.
import scratchSound from "../assets/sounds/scratch_buda_dj.mp3";
// v53 (17 agosto 2026) — pedido de Federico: la fanfarria (militar +
// campanitas tibetanas) anima la entrada del 6to Avatar (Whitman) — NO
// es del evento de Buda DJ/"ONLY ONE MORE" (ese ya tenía su propio
// scratch, sin tocar). Arranca cuando termina whitman_deva_intro.mp4
// (whitmanIntroEndSignal, prop que sube App.tsx), no junto con el video
// — el video ya trae su propio audio y se pisarían. Ver el efecto de
// flanco sobre whitmanIntroEndSignal más abajo.
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
  // case "DEV_SKIP_TO_WHITMAN". Opcional para no romper otros usos de
  // GameShell que no la pasen.
  onDevSkipToWhitman?: () => void;

  // v53 (17 agosto 2026) — contador que App.tsx sube cada vez que termina
  // whitman_deva_intro.mp4 (ver ese archivo). GameShell mira el CAMBIO de
  // valor (flanco), no el valor en sí, para disparar la fanfarria del 6to
  // Avatar exactamente una vez por fin de video.
  whitmanIntroEndSignal?: number;
};

export function GameShell({
  state,
  a,
  b,
  activeRealmData,
  activeEra,
  oracleText,
  mirrorData,
  currentNidana,
  nidanaCoinSrc,
  nidanaCoinId,
  nidanaCoinSide,
  showVestigium,
  onVestigiumDone,
  onLogout,
  onRoll,
  onReset,
  onDevSkipToWhitman,
  whitmanIntroEndSignal = 0,
  playDiceSound,
  onConsciousMove,
  onGenesisUIComplete,
  onSelectPiece,
  onSendEmoji,
  onCloseLedger,
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

const triggerWatcher = () => {
  const line =
    WATCHER_LINES[Math.floor(Math.random() * WATCHER_LINES.length)];

  setWatcherLine(line);

  setShowWatcher(true);
  window.setTimeout(() => setShowWatcher(false), 1800);
};
const [showNidanaSpinner, setShowNidanaSpinner] = React.useState(false);
const [visibleNidana, setVisibleNidana] = React.useState<string | null>(null);
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
const [showNidanaTitle, setShowNidanaTitle] = React.useState(false);
// v53 (17 agosto 2026) — ver import de campanaFinalSound: se pone en
// true cuando termina la fanfarria del 6to Avatar, y hace que el mural
// de fondo (SamsaraStage/MaraLayer) muestre "7 nirvana dj.webp" (luna
// destapada) en vez de quedarse en "6 entra whitman.webp". No se
// resetea a mano: GameShell se remonta entero en cada reset de partida
// (App.tsx le pasa key={genesisResetSeq}), así que este estado vuelve
// solo a false en la partida siguiente.
const [nirvanaMuralRevealed, setNirvanaMuralRevealed] = React.useState(false);

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
  if (scratchAudio.current) scratchAudio.current.volume = 0.55;
  if (fanfarriaAudio.current) fanfarriaAudio.current.volume = 0.5;
  if (campanaFinalAudio.current) campanaFinalAudio.current.volume = 0.5;

  // v53 (17 agosto 2026) — pedido de Federico: cuando termina la
  // fanfarria del 6to Avatar (whitmanIntroEndSignal más abajo dispara
  // el .play(), ver ese efecto), suena esta campana tibetana sola y el
  // mural pasa a mostrar la luna destapada. Enganchada al 'ended'
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

// v53 (17 agosto 2026) — dispara la fanfarria al FLANCO de
// whitmanIntroEndSignal (App.tsx lo sube en el onEnded de
// whitman_deva_intro.mp4). Baseline capturada en el valor que trae la
// prop AL MONTAR (no 0 fijo): así, si esta pantalla se remonta después
// de que el video ya terminó (por ejemplo, tras un refresh a mitad de
// partida), no dispara la fanfarria de nuevo sin que haya pasado nada.
const prevWhitmanIntroEndSignalRef = React.useRef(whitmanIntroEndSignal);
React.useEffect(() => {
  if (whitmanIntroEndSignal === prevWhitmanIntroEndSignalRef.current) return;
  prevWhitmanIntroEndSignalRef.current = whitmanIntroEndSignal;

  const audio = fanfarriaAudio.current;
  if (!audio) return;
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
}, [whitmanIntroEndSignal]);

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
const p1VenomsRevealed = casillasFinished && genesisClickCount >= 7;
const p2VenomsRevealed = casillasFinished && genesisClickCount >= 8;
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
const ERA_ORDER = ["bruno", "margot", "oriol", "marino", "rufus", "whitman"] as const;
const oriolEntered =
  ERA_ORDER.indexOf(state.cosmicClock.era as (typeof ERA_ORDER)[number]) >=
  ERA_ORDER.indexOf("oriol");

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
// v52 (17 agosto 2026) — timer del segundo frame ("7 A one more.webp"),
// ver import de djBuddhaOneMore más arriba.
const djImageSwapTimerRef = React.useRef<number | null>(null);
const [transientDharma, setTransientDharma] = React.useState<{
  message: string;
  big: boolean;
  fading: boolean;
  withDjBuddha: boolean;
  showOneMore: boolean;
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
    if (djImageSwapTimerRef.current) window.clearTimeout(djImageSwapTimerRef.current);

    setTransientDharma({ message, big, fading: false, withDjBuddha, showOneMore: false });

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

    // v52 (17 agosto 2026) — a los 2.5s (mitad de los 5s que el cartel
    // queda en pantalla, ver dharmaHideTimerRef abajo) el poster pasa de
    // buda_dj_poster.png a "7 A one more.webp" — cross-fade en el JSX
    // (showOneMoreImage), no se toca el timing del cartel de texto ni el
    // del fade-out (isDharmaFading), son cosas independientes.
    if (withDjBuddha) {
      djImageSwapTimerRef.current = window.setTimeout(() => {
        setTransientDharma((cur) => (cur ? { ...cur, showOneMore: true } : cur));
      }, 2500);
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
    if (djImageSwapTimerRef.current) window.clearTimeout(djImageSwapTimerRef.current);
  };
}, []);

React.useEffect(() => {
  if (oriolEntered && !prevOriolEnteredRef.current) {
    fireDharmaEvent("THE FIRST EYE OPENS.", false);
  }
  prevOriolEnteredRef.current = oriolEntered;
}, [oriolEntered, fireDharmaEvent]);

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
// v53 (17 agosto 2026) — nirvanaMuralRevealed (campana final del 6to
// Avatar, ver más arriba) pisa a state.cosmicClock.era: ese campo real
// del juego nunca llega a valer "nirvana" (llega hasta "whitman" y se
// queda ahí hasta la victoria real), así que sin este override el
// mural se quedaría en "6 entra whitman.webp" para siempre.
const muralEra = nirvanaMuralRevealed
  ? "nirvana"
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
React.useEffect(() => {
  if (!state.lastMove) return;

  if (state.lastMove.didCapture) {
    triggerWatcher();
    return;
  }

  if (Math.random() < 0.35) {
    triggerWatcher();
  }
}, [state.lastMove]);

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

const activeEffect = state.activeNidanaEffect as
  | "CLARITY"
  | "DISTORTION"
  | "TENSION"
  | null;

const getNidanaEffectText = () => {
  if (activeEffect === "CLARITY") {
    return {
      title: "🔔 CLARITY ACTIVE",
      body: "PROGRESS gets a bonus.",
    };
  }

  if (activeEffect === "DISTORTION") {
    return {
      title: "🎚️ DISTORTION ACTIVE",
      body: "RISK may punish you.",
    };
  }

  if (activeEffect === "TENSION") {
    return {
      title: "⚔️ TENSION ACTIVE",
      body: "IMPACT is rewarded. Everything else costs.",
    };
  }

  return null;
};
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
  const p1At5 = p1NearWin === 5;
  const p2At5 = p2NearWin === 5;

  if (p1At5 && !prevNearWinRef.current.P1) {
    fireDharmaEvent("WHITE: ONLY ONE MORE.", true, true);
  } else if (p2At5 && !prevNearWinRef.current.P2) {
    fireDharmaEvent("BLACK: ONLY ONE MORE.", true, true);
  }

  prevNearWinRef.current = { P1: p1At5, P2: p2At5 };
}, [p1NearWin, p2NearWin, fireDharmaEvent]);

const buddhaMessage = transientDharma?.message ?? "";
const isDharmaBig = transientDharma?.big ?? false;
const isDharmaFading = transientDharma?.fading ?? false;
const showDjBuddha = transientDharma?.withDjBuddha ?? false;
// v52 (17 agosto 2026) — segundo frame ("7 A one more.webp"), ver
// djImageSwapTimerRef en fireDharmaEvent.
const showOneMoreImage = transientDharma?.showOneMore ?? false;
  
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
          progresion Bruno->Whitman cada vez. No aparece en el flujo
          normal de juego, solo un boton chico y discreto. */}
      {genesisComplete && onDevSkipToWhitman && (
        <button
          onClick={onDevSkipToWhitman}
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
          DEV: → Whitman
        </button>
      )}

      {/* v51 (14 agosto 2026) — leyenda de reinos (v45, 13 agosto)
          quitada a pedido de Federico: ya quedó claro en pantalla cuál
          color/rango es cada reino, no hace falta el cartelito
          permanente abajo a la derecha. */}

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
              transition: "opacity 220ms ease",
              opacity: showOneMoreImage ? 0 : 1,
            }}
          />
          {/* v52 (17 agosto 2026) — segundo frame a pedido de Federico:
              "7 A one more.webp" (assets/intro), apilada sobre el poster
              original y cross-fadeada a los 2.5s (djImageSwapTimerRef
              en fireDharmaEvent), no lo reemplaza. */}
          <img
            src={djBuddhaOneMore}
            alt=""
            style={{
              display: "block",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              position: "absolute",
              inset: 0,
              transform: "scaleX(-1)",
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.6))",
              transition: "opacity 220ms ease",
              opacity: showOneMoreImage ? 1 : 0,
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