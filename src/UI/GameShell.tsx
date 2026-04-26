import React from "react";

import { TopBar } from "./TopBar";
import { EvolutionStatus } from "./EvolutionStatus";
import { TurnDock } from "./TurnDock";
import { MoveOptionsPanel } from "./MoveOptionsPanel";
import { MasterPanel } from "./MasterPanel";
import { MirrorPanel } from "./MirrorPanel";
import { VestigiumOverlay } from "./VestigiumOverlay";
import { LedgerModal } from "./LedgerModal";

import { Board } from "../game/Board";
import { getMoveOptionsForPlayer } from "../game/rules/getMoveOptionsForPlayer";
import { resolveNidanaOutcome } from "../game/karma/resolveNidanaOutcome";
import { RING_SIZE } from "../UI/geometry";
import { MaraPanel } from "./MaraPanel";
import watcherVideo from "../assets/video/jesus_watch.mp4";
import type { MoveOption, PieceKind } from "../game/types";
import type { RealmId } from "../game/realms";
import type { NidanaId } from "../game/nidanas";

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
  cyclesDone: number;
  cyclesNeeded: number;
  transitions: number;
  oracleText: string;
  mirrorData: MirrorData;
  currentNidana: string | null;
  nidanaCoinSrc: string | null;
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
  cyclesDone,
  cyclesNeeded,
  transitions,
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

const triggerWatcher = () => {
  setShowWatcher(true);
  window.setTimeout(() => setShowWatcher(false), 1800);
};
  const [showNidanaSpinner, setShowNidanaSpinner] = React.useState(false);
  const [visibleNidana, setVisibleNidana] = React.useState<string | null>(null);
  const nidanaTimerRef = React.useRef<number | null>(null);
  const prevNidanaRef = React.useRef<string | null>(null);

  const moveOptions =
    state.phase === "rolled"
      ? getMoveOptionsForPlayer(state, state.turn)
      : [];

  const handleMove = (opt: MoveOption, all: MoveOption[]) => {
    setHoveredOption(null);
    onConsciousMove(opt, all);
  };
React.useEffect(() => {
  if (state.phase !== "rolled") setHoveredOption(null);
}, [state.phase]);
React.useEffect(() => {
  if (!state.lastMove) return;

  // aparece siempre si hay captura
  if (state.lastMove.didCapture) {
    triggerWatcher();
    return;
  }

  // aparece a veces (sorpresa)
  if (Math.random() < 0.18) {
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

  const nidanaPreviewByOption = Object.fromEntries(
    moveOptions.map((opt) => {
      if (!currentNidana || !activeRealmData?.id) {
        return [`${opt.pieceKind}-${opt.choice}-${opt.toPos}`, null];
      }

      const result = resolveNidanaOutcome({
        realm: activeRealmData.id as RealmId,
        nidana: currentNidana as NidanaId,
        creature: opt.pieceKind,
        tacticalMeaning: opt.meaning,
      });

      return [`${opt.pieceKind}-${opt.choice}-${opt.toPos}`, result];
    })
  );

  return (
    <>
      <TopBar onLogout={onLogout} />
      <VestigiumOverlay show={showVestigium} onDone={onVestigiumDone} />
{showWatcher && (
  <div className="watcherOverlay">
    <video
      src={watcherVideo}
      autoPlay
      muted
      playsInline
      className="watcherVideo"
    />
    <div className="watcherText">I see you.</div>
  </div>
)}

     <div style={{ padding: 24, position: "relative" }}>


        <h1 className="mainTitle">Samsaragammon Core</h1>

        <EvolutionStatus
          realmLabel={activeRealmData?.label ?? "Unknown"}
          realmHex={activeRealmData?.hex ?? "#fff"}
          era={activeEra}
          cyclesDone={cyclesDone}
          cyclesNeeded={cyclesNeeded}
          transitions={transitions}
        />

   <TurnDock
  turn={state.turn}
  phase={state.phase}
  rollA={a}
  rollB={b}
  level={state.level}
  onRoll={onRoll}
  onReset={onReset}
/>

        {false && (
          <MoveOptionsPanel
            options={moveOptions}
            player={state.turn}
            onChoose={handleMove}
            onHoverOption={setHoveredOption}
            nidanaPreviewByOption={nidanaPreviewByOption}
          />
        )}

        <MasterPanel text={oracleText} />

<MirrorPanel
  title={mirrorData.title}
  body={mirrorData.body}
  tags={mirrorData.tags}
/>

<MaraPanel state={state} />

<Board
  state={state}
  onSelectPiece={onSelectPiece}
  hoveredOption={hoveredOption}
  moveOptions={moveOptions}
  onChooseMove={handleMove}
  onSendEmoji={onSendEmoji}
  nidanaCoinSrc={nidanaCoinSrc}
  nidanaCoinSide={nidanaCoinSide}
/>
</div>

<LedgerModal
  open={state.ledgerOpen}
  entryId={state.ledgerEntry}
  onClose={onCloseLedger}
/>
</>
);
}