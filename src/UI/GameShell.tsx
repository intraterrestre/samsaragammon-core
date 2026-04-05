import React from "react";
import { TopBar } from "./TopBar";
import { RunExportButton } from "./RunExportButton";
import { EvolutionStatus } from "./EvolutionStatus";
import { GameHUD } from "./GameHUD";

import { MasterPanel } from "./MasterPanel";
import { MirrorPanel } from "./MirrorPanel";
import { TurnDock } from "./TurnDock";
import { VestigiumOverlay } from "./VestigiumOverlay";
import { LedgerModal } from "./LedgerModal";
import { Board } from "../game/Board";
import { CoinBank } from "./CoinBank";
import { RealmInsightPanel } from "./RealmInsightPanel";

import type { MoveOption, PieceKind } from "../game/types";
import { getMoveOptionsForPlayer } from "../game/rules/getMoveOptionsForPlayer";
import { MoveOptionsPanel } from "./MoveOptionsPanel";

type MirrorData = {
  title: string;
  body: string;
  tags: string[];
};

type GameShellProps = {
  state: any;
  a: number | null;
  b: number | null;
  sum: number | null;
  hasRolled: boolean;
  rollsCount: number;
  karmaSnap: any;
  activeRealmData: any;
  activeEra: string;
  cyclesDone: number;
  cyclesNeeded: number;
  transitions: number;
  oracleText: string;
  mirrorData: MirrorData;
  showVestigium: boolean;

  onVestigiumDone: () => void;
  onCloseLedger: () => void;
  onLogout: () => void | Promise<void>;
  onExportRun: () => void;
  onRoll: () => void;
  onReset: () => void;

  // sistema de decisión
  onConsciousMove: (option: MoveOption, allOptions: MoveOption[]) => void;
  onSelectPiece: (piece: PieceKind) => void;

  realmDataP1: any;
  realmDataP2: any;
};

export function GameShell({
  state,
  a,
  b,
  sum,
  hasRolled,
  rollsCount,
  karmaSnap,
  activeRealmData,
  activeEra,
  cyclesDone,
  cyclesNeeded,
  transitions,
  oracleText,
  mirrorData,
  showVestigium,
  onVestigiumDone,
  onLogout,
  onExportRun,
  onRoll,
  onReset,
  onConsciousMove,
  onSelectPiece,
  onCloseLedger,
  realmDataP1,
  realmDataP2,
}: GameShellProps) {
  const activePiece = state.selectedPiece[state.turn];
  const activePos = state.pieces[state.turn][activePiece].pos;

  const [insightOpen, setInsightOpen] = React.useState(false);
  const [showMaster, setShowMaster] = React.useState(false);
  const [masterText, setMasterText] = React.useState("");
const [hoveredOption, setHoveredOption] = React.useState<MoveOption | null>(null);
  const moveOptions =
    state.phase === "rolled"
      ? getMoveOptionsForPlayer(state, state.turn)
      : [];

  const handleConsciousMove = (
    option: MoveOption,
    allOptions: MoveOption[]
  ) => {
    onConsciousMove(option, allOptions);
  };

  const playerCoins = [
    {
      id: "hungry_ghost",
      label: "Hungry Ghost",
      front: "/assets/coins/coin_hungry_ghost_front.png",
      back: "/assets/coins/coin_hungry_ghost_back.png",
      unlocked: true,
    },
    {
      id: "hell",
      label: "Hell",
      front: "/assets/coins/coin_hell_front.png",
      back: "/assets/coins/coin_hell_back.png",
      unlocked: true,
    },
    {
      id: "animal",
      label: "Animal",
      front: "/assets/coins/coin_animal_front.png",
      back: "/assets/coins/coin_animal_back.png",
      unlocked: true,
    },
    {
      id: "human",
      label: "Human",
      front: "/assets/coins/coin_human_front.png",
      back: "/assets/coins/coin_human_back.png",
      unlocked: true,
    },
    {
      id: "asura",
      label: "Asura",
      front: "/assets/coins/coin_asura_front.png",
      back: "/assets/coins/coin_asura_back.png",
      unlocked: true,
    },
    {
      id: "deva",
      label: "Deva",
      front: "/assets/coins/coin_deva_front.png",
      back: "/assets/coins/coin_deva_back.png",
      unlocked: true,
    },
    {
      id: "nirvana",
      label: "Nirvana",
      front: "/assets/coins/coin_nirvana_front.png",
      back: "/assets/coins/coin_nirvana_back.png",
      unlocked: false,
    },
  ];

  const [selectedCoin, setSelectedCoin] = React.useState<null | {
    id: string;
    label: string;
    front: string;
    back: string;
    unlocked: boolean;
  }>(null);

  const [selectedCoinSide, setSelectedCoinSide] = React.useState<"front" | "back">("front");

  return (
    <>
      <TopBar onLogout={onLogout} />
      <VestigiumOverlay show={showVestigium} onDone={onVestigiumDone} />

      <div style={{ padding: 24 }}>
        <h1 className={`mainTitle ${showVestigium ? "vestigiumCincel" : ""}`}>
          {showVestigium ? "VESTIGIUM TUUM" : "Samsaragammon Core"}
        </h1>

        <EvolutionStatus
          realmLabel={activeRealmData?.label ?? "Unknown"}
          realmHex={activeRealmData?.hex ?? "#ffffff"}
          era={activeEra}
          cyclesDone={cyclesDone}
          cyclesNeeded={cyclesNeeded}
          transitions={transitions ?? 0}
        />

        <RunExportButton onClick={onExportRun} />

        <TurnDock
          turn={state.turn}
          phase={state.phase}
          rollA={a}
          rollB={b}
          level={state.level}
          onRoll={onRoll}
          onReset={onReset}
        />

        <GameHUD
          state={state}
          rollsCount={rollsCount}
          karmaSnap={karmaSnap}
          realmDataP1={realmDataP1}
          realmDataP2={realmDataP2}
        />

        <CoinBank
          coins={playerCoins}
          onOpenCoin={(coin) => {
            if (coin.id === "nirvana" && !coin.unlocked) {
              setMasterText(`You reach for the final coin…

Nirvana is not unlocked.

Your pattern still binds you.
Break the cycle to reveal it.

Transcend.
Or remain.`);
              setShowMaster(true);
              return;
            }

            setSelectedCoin(coin);
            setSelectedCoinSide("front");
          }}
        />
       <MoveOptionsPanel
  options={moveOptions}
  player={state.turn}
  onChoose={handleConsciousMove}
  onHoverOption={setHoveredOption}
/>

        <MasterPanel text={oracleText} />

        <MirrorPanel
          title={mirrorData.title}
          body={mirrorData.body}
          tags={mirrorData.tags}
        />

        <RealmInsightPanel
          open={insightOpen}
          realm="HUNGRY_GHOST"
          onClose={() => setInsightOpen(false)}
        />

        <Board
  state={state}
  onSelectPiece={onSelectPiece}
  hoveredOption={hoveredOption}
/>
      </div>

      {selectedCoin && (
        <div
          onClick={() => setSelectedCoin(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2200,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 560px)",
              borderRadius: 24,
              background: "rgba(20,20,20,0.96)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                marginBottom: 8,
                color: "rgba(255,255,255,0.95)",
              }}
            >
              {selectedCoin.label}
            </div>

            <img
              src={selectedCoinSide === "front" ? selectedCoin.front : selectedCoin.back}
              alt={selectedCoin.label}
              style={{
                width: 320,
                height: 320,
                objectFit: "contain",
                aspectRatio: "1 / 1",
                display: "block",
                margin: "0 auto 20px",
                filter: "drop-shadow(0 14px 26px rgba(0,0,0,0.38))",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => setSelectedCoinSide("front")}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background:
                    selectedCoinSide === "front"
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Front
              </button>

              <button
                type="button"
                onClick={() => setSelectedCoinSide("back")}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background:
                    selectedCoinSide === "back"
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedCoinSide((s) => (s === "front" ? "back" : "front"))
                }
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.95)",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Flip
              </button>

              <button
                type="button"
                onClick={() => setSelectedCoin(null)}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.92)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showMaster && (
        <div
          onClick={() => setShowMaster(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 4000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 560px)",
              borderRadius: 24,
              background: "rgba(20,20,20,0.96)",
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "0 20px 80px rgba(0,0,0,0.5)",
              padding: 24,
              textAlign: "center",
            }}
          >
            <img
              src={masterImg}
              alt="Master Ying-Yang"
              style={{
                width: 260,
                height: 260,
                objectFit: "contain",
                display: "block",
                margin: "0 auto 18px",
                filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
                animation: "float 3s ease-in-out infinite",
              }}
            />

            <div
              style={{
                fontWeight: 800,
                fontSize: 24,
                color: "rgba(255,255,255,0.95)",
                marginBottom: 10,
              }}
            >
              Master Ying-Yang
            </div>

            <div
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: "rgba(255,255,255,0.86)",
                maxWidth: 420,
                margin: "0 auto 20px",
                whiteSpace: "pre-line",
              }}
            >
                           {masterText}
            </div>

            <button
              type="button"
              onClick={() => setShowMaster(false)}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.95)",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 🪟 LEDGER MODAL */}
      <LedgerModal
        open={state.ledgerOpen}
        entryId={state.ledgerEntry}
        onClose={onCloseLedger}
      />

    </>
  );
}