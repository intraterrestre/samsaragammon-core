import React from "react";

import { TopBar } from "./TopBar";
import { EvolutionStatus } from "./EvolutionStatus";
import { TurnDock } from "./TurnDock";

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
import { SacredProgress } from "./SacredProgress";

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

  onConsciousMove: (option: MoveOption, all: MoveOption[]) => void;
  onSelectPiece: (piece: PieceKind) => void;
  onSendEmoji: (emoji: string) => void;

  onCloseLedger: () => void;
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
  onConsciousMove,
  onSelectPiece,
  onSendEmoji,
  onCloseLedger,
}: Props) {
const [hoveredOption, setHoveredOption] = React.useState<MoveOption | null>(null);

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
const [showNidanaTitle, setShowNidanaTitle] = React.useState(false);

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

  if (cheeringAudio.current) cheeringAudio.current.volume = 0.18;
  if (fireworksAudio.current) fireworksAudio.current.volume = 0.12;
}, []);

const prevTransitionsRef = React.useRef({
  P1: state.realmProgress.P1.realmTransitions,
  P2: state.realmProgress.P2.realmTransitions,
});

const triggerCelebrationSound = () => {
  if (cheeringAudio.current) {
    cheeringAudio.current.currentTime = 0;
    cheeringAudio.current.play().catch(() => {});
  }

  if (fireworksAudio.current) {
    fireworksAudio.current.currentTime = 0;
    fireworksAudio.current.play().catch(() => {});
  }
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
const [usedPoisons, setUsedPoisons] = React.useState({
  pig: false,
  snake: false,
  rooster: false,
});

const [brunoAwakened, setBrunoAwakened] = React.useState(false);

const handleMove = (opt: MoveOption, all: MoveOption[]) => {
  setHoveredOption(null);

  const nextUsedPoisons = {
    ...usedPoisons,
    [opt.pieceKind]: true,
  };

  setUsedPoisons(nextUsedPoisons);

  const firstEyeOpens =
    nextUsedPoisons.pig &&
    nextUsedPoisons.snake &&
    nextUsedPoisons.rooster &&
    !brunoAwakened;

  if (firstEyeOpens) {
    setBrunoAwakened(true);

    console.log("THE FIRST EYE OPENS");
    console.log("BRUNO AWAKENS");
  }

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

const buddhaMessage = "THE FIRST EYE OPENS.";
  
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
      <SamsaraStage
       dharmaMessage={buddhaMessage}
      />

      <SacredProgress
        p1Completed={state.realmProgress.P1.realmTransitions}
        p2Completed={state.realmProgress.P2.realmTransitions}
      />

      <MaraPanel state={state} />

     <FandangoKarma />

      <div className="boardLayer">
        <Board
          state={state}
          onSelectPiece={onSelectPiece}
          hoveredOption={hoveredOption}
          moveOptions={moveOptions}
          onChooseMove={handleMove}
          onSendEmoji={onSendEmoji}
          onRoll={onRoll}
          nidanaCoinSrc={nidanaCoinSrc}
          nidanaCoinSide={nidanaCoinSide}
          nidanaCoinId={nidanaCoinId}
        />
      </div>
    </div>
  </div>

  <div style={{
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: "rgba(0,0,0,0.85)",
    backdropFilter: "blur(8px)",
    padding: "6px 0",
  }}>
    <TurnDock
      turn={state.turn}
      phase={state.phase}
      rollA={a}
      rollB={b}
      level={state.level ?? 1}
      onRoll={onRoll}
      onReset={onReset}
      showVestigium={showVestigium}
    />
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