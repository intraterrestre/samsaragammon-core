import { TopBar } from "./TopBar";
import { RunExportButton } from "./RunExportButton";
import { EvolutionStatus } from "./EvolutionStatus";
import { GameHUD } from "./GameHUD";
import { RollInstructions } from "./RollInstructions";
import { MasterPanel } from "./MasterPanel";
import { MirrorPanel } from "./MirrorPanel";
import { TurnDock } from "./TurnDock";
import { VestigiumOverlay } from "./VestigiumOverlay";
import { Board } from "../game/Board";

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
  onLogout: () => void | Promise<void>;
  onExportRun: () => void;
  onRoll: () => void;
  onReset: () => void;
  onChooseRoll: (value: number) => void;
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
  onChooseRoll,
  realmDataP1,
  realmDataP2,
}: GameShellProps) {
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

        <RollInstructions
          hasRolled={hasRolled}
          level={state.level}
          sum={sum}
        />

        <MasterPanel text={oracleText} />

        <MirrorPanel
          title={mirrorData.title}
          body={mirrorData.body}
          tags={mirrorData.tags}
        />

        <Board state={state} onChooseRoll={onChooseRoll} />
      </div>
    </>
  );
}