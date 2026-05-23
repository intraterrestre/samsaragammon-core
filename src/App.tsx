// src/App.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";

import { getGameDerivedState } from "./game/getGameDerivedState";
import type { PieceKind } from "./game/types";
import { reducer } from "./game/state/reducer";
import { initialState } from "./game/state/state";

import { masterOracleLine } from "./game/master/masterEngine";
import { supabase } from "./lib/supabaseClient";
import { KarmaEngine } from "./game/engine/KarmaEngine";

import { GameShell } from "./UI/GameShell";
import { LoginScreen } from "./UI/LoginScreen";
import { useGameController } from "./game/hooks/useGameController";
import { getMasterLine } from "./game/master/masterVoices";
import diceRollSound from "./assets/sounds/dice_roll.mp3";

import brunoIntro from "./assets/cinematics/realms/bruno_origin_intro.mp4";
import margotIntro from "./assets/cinematics/realms/margot_hell_intro.mp4";
import oriolIntro from "./assets/cinematics/realms/oriol_animal_intro.mp4";
import marinoIntro from "./assets/cinematics/realms/marino_human_intro.mov";
import rufusIntro from "./assets/cinematics/realms/rufus_titan_intro.mp4";
import whitmanIntro from "./assets/cinematics/realms/whitman_deva_intro.mp4";

const nidanaImages = import.meta.glob("./assets/nidanas/*.jpg", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const NIDANAS = [
  "ignorance",
  "formations",
  "consciousness",
  "name_form",
  "six_senses",
  "contact",
  "feeling",
  "craving",
  "clinging",
  "identity",
  "birth",
  "death",
];
const REALM_INTRO_MAP = {
  hungry_ghost: brunoIntro,
  hell: margotIntro,
  animals: oriolIntro,
  humans: marinoIntro,
  asura: rufusIntro,
  deva: whitmanIntro,
} as const;
function getNidanaImage(id: number, side: "front" | "back") {
  const num = String(id).padStart(2, "0");
  const name = NIDANAS[id - 1];
  return nidanaImages[`./assets/nidanas/nidana_${num}_${name}_${side}.jpg`];
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui", color: "white" }}>
          <h2 style={{ marginTop: 0 }}>💥 The app is down</h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 12,
              borderRadius: 12,
              maxWidth: 900,
              overflowX: "auto",
            }}
          >
            {String(this.state.error.stack || this.state.error.message)}
          </pre>
          <p style={{ opacity: 0.8 }}>
            Copy & paste that error exactly as shown and we’ll fix it in one shot.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/** =========================
 *  Vestigium (v0) — LocalStorage
 *  ========================= */
type VestigiumSnapshot = {
  at: number;
  rolls: number;
  level: number;
  turn: "P1" | "P2";
  pos: { P1: number; P2: number };
  captures: { P1: number; P2: number };
};

const VESTIGIA_KEY = "samsara_vestigia_v0";

function loadVestigia(): VestigiumSnapshot[] {
  try {
    const raw = localStorage.getItem(VESTIGIA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveVestigium(snapshot: VestigiumSnapshot) {
  const all = loadVestigia();
  all.push(snapshot);
  localStorage.setItem(VESTIGIA_KEY, JSON.stringify(all.slice(-12)));
}

/** =========================
 *  RunExport (LOCAL)
 *  ========================= */
type ExportEvent =
  | {
      type: "roll";
      at: number;
      turn: "P1" | "P2";
      turnIndex: number;
      cycleIndex: number;
      a: number;
      b: number;
      sum: number;
      level: number;
      pos: { P1: number; P2: number };
      captures: { P1: number; P2: number };
    }
  | {
      type: "move";
      at: number;
      player: "P1" | "P2";
      pieceKind: PieceKind | null;
      turnIndex: number;
      cycleIndex: number;
      choice: "A" | "B" | "AB" | "ECO";
      chosenValue: number;
      fromPos: number;
      toPos: number;
      didCapture: boolean;
      capturedPieceKind: PieceKind | null;
      fromRealm: string;
      toRealm: string;
      level: number;
      pos: { P1: number; P2: number };
      captures: { P1: number; P2: number };
    }
  | {
      type: "snapshot";
      at: number;
      turn: "P1" | "P2";
      turnIndex: number;
      cycleIndex: number;
      level: number;
      pos: { P1: number; P2: number };
      captures: { P1: number; P2: number };
      note?: string;
    };

type RunExport = {
  version: "runexport_v1";
  runId: string;
  startedAt: number;
  finishedAt: number | null;
  meta: { trackSize: number };
  events: ExportEvent[];
};

export default function App() {
  const { handleLogin } = useGameController();
  const [state, dispatchBase] = useReducer(reducer, initialState);
const [activeRealmIntro, setActiveRealmIntro] = useState<string | null>(null);
const playedRealmIntrosRef = useRef<Record<string, boolean>>({});
  const karmaRef = useRef<KarmaEngine | null>(null);
  const [karmaSnap, setKarmaSnap] = useState<any>(null);

  useEffect(() => {
    if (!karmaRef.current) {
      karmaRef.current = new KarmaEngine(["P1", "P2"]);
      setKarmaSnap(karmaRef.current.snapshot(0));
    }
  }, []);

  /** =========================
   *  Helpers
   *  ========================= */
 const selectedPos = useCallback(
  (player: "P1" | "P2") => {
    const selected = state.selectedPiece[player];

    const basePiece =
      state.pieces[player][selected as keyof typeof state.pieces.P1];

    if (basePiece) return basePiece.pos;

    const realmPiece =
      state.realmPieces[player]?.[
        selected as keyof typeof state.realmPieces.P1
      ];

    return realmPiece?.pos ?? 0;
  },
  [state.pieces, state.realmPieces, state.selectedPiece]
);

  const playDiceSound = useCallback(() => {
    const audio = new Audio(diceRollSound);
    audio.volume = 0.4;
    audio.play().catch((err) => {
      console.warn("Dice sound failed:", err);
    });
  }, []);

  /** =========================
   *  Supabase session
   *  ========================= */
  const [session, setSession] = useState<
    Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]
  >(null);

  const [profile, setProfile] = useState<any>(null);
  const [runId, setRunId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;
      setSession(sess);

      if (sess?.user) {
        await supabase.from("profiles").upsert({
          id: sess.user.id,
          display_name: sess.user.email?.split("@")[0] ?? "player",
        });

        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sess.user.id)
          .single();

        setProfile(p ?? null);
      } else {
        setProfile(null);
        setRunId(null);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);

      if (sess?.user) {
        await supabase.from("profiles").upsert({
          id: sess.user.id,
          display_name: sess.user.email?.split("@")[0] ?? "player",
        });

        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sess.user.id)
          .single();

        setProfile(p ?? null);
      } else {
        setProfile(null);
        setRunId(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const ensureRun = useCallback(async (): Promise<string> => {
    if (!session?.user) throw new Error("No session");
    if (runId) return runId;

    const { data, error } = await supabase
      .from("runs")
      .insert({
        user_id: session.user.id,
        level: state.level ?? 1,
        total_rolls: 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    setRunId(data.id);
    return data.id;
  }, [session, runId, state.level]);

  /** =========================
   *  RunExport local
   *  ========================= */
  const runExportRef = useRef<RunExport | null>(null);

  const ensureRunExport = useCallback(() => {
    if (runExportRef.current) return runExportRef.current;

    const newRun: RunExport = {
      version: "runexport_v1",
      runId: `local_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      startedAt: Date.now(),
      finishedAt: null,
      meta: { trackSize: state.trackSize },
      events: [],
    };

    runExportRef.current = newRun;
    return newRun;
  }, [state.trackSize]);

  const pushExportEvent = useCallback(
    (ev: ExportEvent) => {
      const run = ensureRunExport();
      run.events.push(ev);

      if (run.events.length > 2000) {
        run.events = run.events.slice(-2000);
      }
    },
    [ensureRunExport]
  );

  const resetRunExport = useCallback(() => {
    runExportRef.current = null;
  }, []);

  /** =========================
   *  Export: roll
   *  ========================= */
  useEffect(() => {
    if (state.phase !== "rolled") return;
    if (!state.rollOptions) return;

    const [a, b] = state.rollOptions;

    pushExportEvent({
      type: "roll",
      at: Date.now(),
      turn: state.turn,
      turnIndex: state.turnIndex,
      cycleIndex: state.cycleIndex,
      level: state.level,
      a,
      b,
      sum: a + b,
      pos: { P1: selectedPos("P1"), P2: selectedPos("P2") },
      captures: { P1: state.captures.P1, P2: state.captures.P2 },
    });
  }, [
    state.phase,
    state.rollOptions,
    state.turn,
    state.turnIndex,
    state.cycleIndex,
    state.level,
    state.captures,
    pushExportEvent,
    selectedPos,
  ]);
useEffect(() => {
  const realmKey = state.realmAscension?.realmKey as
    | keyof typeof REALM_INTRO_MAP
    | undefined;

  const player = state.realmAscension?.player;

  console.log("REALM ASCENSION:", state.realmAscension);

  if (!realmKey || !player) return;

  const introId = `${player}-${realmKey}`;

  if (playedRealmIntrosRef.current[introId]) return;

  const introSrc = REALM_INTRO_MAP[realmKey];

  if (!introSrc) return;

  playedRealmIntrosRef.current[introId] = true;

  window.setTimeout(() => {
    setActiveRealmIntro(introSrc);
  }, 2200);

}, [state.realmAscension]);

  /** =========================
   *  Export + Karma ingest: move
   *  ========================= */
  useEffect(() => {
    if (!state.lastMove) return;

    const lm = state.lastMove;
    const turnIndex = lm.turnIndex ?? 0;

    const snap1 = karmaRef.current?.ingest({
      id: `move_${turnIndex}_${lm.player}_${lm.fromPos}_${lm.toPos}`,
      t: lm.at ?? Date.now(),
      turn: turnIndex,
      actor: lm.player,
      type: "MOVE",
      moveKey: `CHOICE:${lm.choice}|VAL:${lm.chosenValue}`,
      posKey: `${lm.fromPos}->${lm.toPos}`,
      realm: lm.toRealm,
      intensity: 0.2,
      reactionDelayMs: 2000,
    });

    let snap2 = snap1;
    if (lm.didCapture) {
      const target = lm.player === "P1" ? "P2" : "P1";
      snap2 = karmaRef.current?.ingest({
        id: `cap_${turnIndex}_${lm.player}_vs_${target}_${lm.toPos}`,
        t: (lm.at ?? Date.now()) + 1,
        turn: turnIndex,
        actor: lm.player,
        target,
        type: "CAPTURE",
        moveKey: `CAPTURE@${lm.toPos}`,
        posKey: `${lm.toPos}`,
        realm: lm.toRealm,
        intensity: 1.0,
        reactionDelayMs: 600,
      });
    }

    if (snap2) setKarmaSnap(snap2);

    pushExportEvent({
      type: "move",
      at: lm.at,
      player: lm.player,
      pieceKind: lm.pieceKind ?? null,
      turnIndex: lm.turnIndex,
      cycleIndex: lm.cycleIndex,
      level: lm.level,
      choice: lm.choice,
      chosenValue: lm.chosenValue,
      fromPos: lm.fromPos,
      toPos: lm.toPos,
      didCapture: lm.didCapture,
      capturedPieceKind: lm.capturedPieceKind ?? null,
      fromRealm: lm.fromRealm,
      toRealm: lm.toRealm,
      pos: { P1: selectedPos("P1"), P2: selectedPos("P2") },
      captures: { P1: state.captures.P1, P2: state.captures.P2 },
    });
  }, [state.lastMove, state.captures, pushExportEvent, selectedPos]);

  const debugPrintRunExport = useCallback(() => {
    const run = ensureRunExport();
    run.finishedAt = Date.now();
    console.log("=== RUN EXPORT (LOCAL) ===");
    console.log(JSON.stringify(run, null, 2));
    alert("RunExport JSON impreso en consola ✅ (DevTools > Console)");
  }, [ensureRunExport]);

  /** =========================
   *  Vestigium
   *  ========================= */
  const [showVestigium, setShowVestigium] = useState(false);
  const [rollsCount, setRollsCount] = useState(0);
  const prevPhaseRef = useRef<string>(state.phase);

  const [activeNidanaId, setActiveNidanaId] = useState<number | null>(null);
const [nidanaSide, setNidanaSide] = useState<"front" | "back">("front");
const [showNidana, setShowNidana] = useState(false);

const nidanaTimersRef = useRef<number[]>([]);

const triggerNidanaCoin = () => {
  nidanaTimersRef.current.forEach((t) => window.clearTimeout(t));
  nidanaTimersRef.current = [];

  const id = 1 + Math.floor(Math.random() * 12);

  setActiveNidanaId(id);
  setNidanaSide("front");
  setShowNidana(true);

  nidanaTimersRef.current.push(
    window.setTimeout(() => setNidanaSide("back"), 1000),
    window.setTimeout(() => setShowNidana(false), 4200)
  );
};
  useEffect(() => {
    const prev = prevPhaseRef.current;
    const now = state.phase;

    if (prev === "rolled" && now !== "rolled") {
      setRollsCount((n) => {
        const next = n + 1;

        if (next % 30 === 0) {
          setShowVestigium(true);
          try {
            saveVestigium({
              at: Date.now(),
              rolls: next,
              level: state.level,
              turn: state.turn,
              pos: { P1: selectedPos("P1"), P2: selectedPos("P2") },
              captures: { P1: state.captures.P1, P2: state.captures.P2 },
            });
          } catch {}
        }

        return next;
      });
    }

    prevPhaseRef.current = now;
  }, [
    state.phase,
    state.level,
    state.turn,
    state.captures,
    state.pieces,
    state.selectedPiece,
    selectedPos,
  ]);

  useEffect(() => {
    if (!showVestigium) return;
    const t = window.setTimeout(() => setShowVestigium(false), 2600);
    return () => window.clearTimeout(t);
  }, [showVestigium]);

  /** =========================
   *  Roll log to Supabase
   *  ========================= */
  const lastLoggedRollRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    if (state.phase !== "rolled") return;
    if (!state.rollOptions) return;

    const [ra, rb] = state.rollOptions;

    try {
      if (karmaRef.current) {
        const turnIndex = state.turnIndex ?? 0;
        const snap = karmaRef.current.ingest({
          id: `roll_${turnIndex}_${state.turn}_${ra}_${rb}`,
          t: Date.now(),
          turn: turnIndex,
          actor: state.turn,
          type: "SPECIAL",
          moveKey: `ROLL:${ra},${rb}`,
          intensity: 0.1,
          reactionDelayMs: 9999,
        });
        setKarmaSnap(snap);
      }
    } catch (e) {
      console.warn("KARMA ROLL INGEST FAILED:", e);
    }

    const key = `${state.turnIndex ?? 0}-${state.turn}-${ra}-${rb}`;
    if (lastLoggedRollRef.current === key) return;
    lastLoggedRollRef.current = key;

    (async () => {
      try {
        const id = await ensureRun();

        const { error } = await supabase.from("events").insert({
          run_id: id,
          user_id: session.user.id,
          type: "roll",
          payload: {
            at: Date.now(),
            a: ra,
            b: rb,
            sum: ra + rb,
            turn: state.turn,
            turnIndex: state.turnIndex,
            cycleIndex: state.cycleIndex,
            level: state.level,
            pos: { P1: selectedPos("P1"), P2: selectedPos("P2") },
            captures: { P1: state.captures.P1, P2: state.captures.P2 },
          },
        });

        if (error) throw error;
      } catch (e) {
        console.warn("ROLL LOG FAILED (non-blocking):", e);
      }
    })();
  }, [
    session?.user,
    state.phase,
    state.rollOptions,
    state.turn,
    state.turnIndex,
    state.cycleIndex,
    state.level,
    state.captures,
    ensureRun,
    selectedPos,
  ]);
    const {
    hasRolled,
    a,
    b,
    sum,
    realmDataP1,
    realmDataP2,
    activeRealmData,
    activeEra,
    cyclesDone,
    cyclesNeeded,
    transitions,
    oracleText,
    mirrorData,
  } = getGameDerivedState({
    state,
    selectedPos,
  });
  const masterDisplayText = state.lastMove
  ? getMasterLine({
      didCapture: state.lastMove.didCapture,
      patternScore: state.lastKarma?.pattern ?? 0,
      realm: state.lastMove.toRealm,
      fromPos: state.lastMove.fromPos,
      toPos: state.lastMove.toPos,
    })
  : "The wheel waits.";
  /** =========================
   *  Dispatch wrapper
   *  ========================= */
  const dispatch = useCallback(
    (action: any) => {
   if (action?.type === "RESET") {

  playedRealmIntrosRef.current = {};
  setActiveRealmIntro(null);

  setRollsCount(0);
  setShowVestigium(false);
  prevPhaseRef.current = "idle";
  setRunId(null);
  resetRunExport();

  karmaRef.current = new KarmaEngine(["P1", "P2"]);
  setKarmaSnap(karmaRef.current.snapshot(0));
  lastLoggedRollRef.current = null;
}

      dispatchBase(action);
    },
    [resetRunExport]
  );

  /** =========================
   *  Debug
   *  ========================= */
  useEffect(() => {
    console.log("PHASE:", state.phase);
    console.log("ROLL_OPTIONS:", state.rollOptions);
  }, [state.phase, state.rollOptions]);

  return (
  <ErrorBoundary>
{activeRealmIntro && (
  <div className="realmIntroOverlay">
  <video
  className="realmIntroVideo"
  src={activeRealmIntro}
  autoPlay
  playsInline
  muted={false}
  onLoadedMetadata={(e) => {
    e.currentTarget.volume = 1;
    e.currentTarget.muted = false;
    e.currentTarget.play().catch((err) => {
      console.warn("Intro video play blocked:", err);
    });
  }}
  onEnded={() => setActiveRealmIntro(null)}
/>
  </div>
)}

  {!session ? (
  
    <LoginScreen onLogin={handleLogin} />
  ) : (
    <GameShell
      state={state}
      a={a}
      b={b}
      sum={sum}
      hasRolled={hasRolled}
      rollsCount={rollsCount}
      karmaSnap={karmaSnap}
      activeRealmData={activeRealmData}
      activeEra={activeEra}
      cyclesDone={cyclesDone}
      cyclesNeeded={cyclesNeeded}
      transitions={transitions ?? 0}
      oracleText={oracleText}
      mirrorData={mirrorData}
      showVestigium={showVestigium}
      currentNidana={state.currentNidana}   // 👈 ESTA ES LA CLAVE
      nidanaCoinSrc={
  showNidana && activeNidanaId
    ? getNidanaImage(activeNidanaId, nidanaSide)
    : null
}
nidanaCoinId={activeNidanaId}
nidanaCoinSide={nidanaSide}
      onVestigiumDone={() => setShowVestigium(false)}
      onCloseLedger={() => dispatch({ type: "CLOSE_LEDGER" })}
      onIntroDone={() => dispatch({ type: "INTRO_DONE" })}
      onLogout={async () => {
        await supabase.auth.signOut();
        setRunId(null);
        setProfile(null);
      }}
  onExportRun={debugPrintRunExport}

onRoll={() => {
  playDiceSound();
  triggerNidanaCoin();

  const r = Math.random();
  const effect =
    r < 0.33 ? "CLARITY" :
    r < 0.66 ? "DISTORTION" :
    "TENSION";

  dispatch({ type: "SET_NIDANA_EFFECT", effect });

  dispatch({ type: "ROLL" });
}}
  onReset={() => dispatch({ type: "RESET" })}
onConsciousMove={(option, allOptions) =>
  dispatch({
    type: "CONSCIOUS_MOVE",
    option,
    allOptions,
  })
}
onSelectPiece={(piece: PieceKind) =>
  dispatch({ type: "SELECT_PIECE", player: state.turn, piece })
}
onSendEmoji={(emoji: string) =>
  dispatch({ type: "EMOJI", emoji, player: state.turn })
}
realmDataP1={realmDataP1}
realmDataP2={realmDataP2}
/>
      )}
    </ErrorBoundary>
  );
}