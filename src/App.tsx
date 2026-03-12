// src/App.tsx
import React, { useEffect, useMemo, useReducer, useRef, useState, useCallback } from "react";
import "./App.css";

import { Board } from "./game/Board";
import { realmFromPos, REALM_LABEL } from "./UI/realm";

import { reducer } from "./game/state/reducer";
import { initialState } from "./game/state/state";
import { TurnDock } from "./UI/TurnDock";
import { VestigiumOverlay } from "./UI/VestigiumOverlay";
import { masterLine, masterOracleLine } from "./game/master/masterEngine";

import { supabase } from "./lib/supabaseClient";
import { KarmaEngine } from "./game/engine/KarmaEngine";
import { REALM_CANON } from "./game/realm/realmCanon";
import { karmaOracle } from "./game/karma/karmaOracle";
import { karmaMirror } from "./game/karma/karmaMirror";

import { MasterPanel } from "./UI/MasterPanel";
import { MirrorPanel } from "./UI/MirrorPanel";
import { EvolutionStatus } from "./UI/EvolutionStatus";
import { GameHUD } from "./UI/GameHUD"
import { RollInstructions } from "./UI/RollInstructions";
import { TopBar } from "./UI/TopBar";
import { RunExportButton } from "./UI/RunExportButton";
import { GameShell } from "./UI/GameShell";
import { LoginScreen } from "./UI/LoginScreen";
import { useGameController } from "./game/hooks/useGameController";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
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
          <p style={{ opacity: 0.8 }}>Copy & paste that error exactly as shown and we’ll fix it in one shot.</p>
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
// ===== RunExport (LOCAL) =====
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
      turn: "P1" | "P2";
      turnIndex: number;
      cycleIndex: number;
      choice: "A" | "B" | "AB" | "ECO";
      chosenValue: number;
      fromPos: number;
      toPos: number;
      didCapture: boolean;
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
  runId: string; // local id
  startedAt: number;
  finishedAt: number | null;
  meta: { trackSize: number };
  events: ExportEvent[];
};

export default function App() {
  const { handleLogin } = useGameController();
  const [state, dispatchBase] = useReducer(reducer, initialState);
 
  const karmaRef = useRef<KarmaEngine | null>(null);
  const [karmaSnap, setKarmaSnap] = useState<any>(null);

  useEffect(() => {
    if (!karmaRef.current) {
      karmaRef.current = new KarmaEngine(["P1", "P2"]);
      setKarmaSnap(karmaRef.current.snapshot(0));
    }
  }, []);

  // ===== Supabase session =====
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

        const { data: p } = await supabase.from("profiles").select("*").eq("id", sess.user.id).single();
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

        const { data: p } = await supabase.from("profiles").select("*").eq("id", sess.user.id).single();
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
// ===== RunExport (LOCAL) =====
const runExportRef = useRef<RunExport | null>(null);

const ensureRunExport = () => {
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
};

const pushExportEvent = (ev: ExportEvent) => {
  const run = ensureRunExport();
  run.events.push(ev);

  // opcional: cap para no reventar memoria mientras prototipas
  if (run.events.length > 2000) run.events = run.events.slice(-2000);
};

const resetRunExport = () => {
  runExportRef.current = null;
};
useEffect(() => {
  if (state.phase !== "rolled") return;
  if (!state.rollOptions) return;

  const [a, b] = state.rollOptions;

  pushExportEvent({ type: "roll", at: Date.now(),
    turn: state.turn,
    turnIndex: state.turnIndex,
    cycleIndex: state.cycleIndex,
    level: state.level,
    a,
    b,
    sum: a + b,
  });

}, [
  state.phase,
  state.rollOptions,
  state.turn,
  state.turnIndex,
  state.cycleIndex,
  state.level,
]);
useEffect(() => {
  if (!state.lastMove) return;

const lm = state.lastMove;
const turnIndex = lm.turnIndex ?? 0;

// 1) MOVE (siempre)
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
  reactionDelayMs: 2000, // luego lo calculamos real
});

// 2) CAPTURE (solo si ocurrió)
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
    turnIndex: lm.turnIndex,
    cycleIndex: lm.cycleIndex,
    level: lm.level,
    a: lm.a,
    b: lm.b,
    chosenValue: lm.chosenValue,
    choice: lm.choice,
    fromPos: lm.fromPos,
    toPos: lm.toPos,
    didCapture: lm.didCapture,
    fromRealm: lm.fromRealm,
    toRealm: lm.toRealm,
  });

}, [state.lastMove]);
// Botón: imprimir JSON bonito en consola
const debugPrintRunExport = () => {
  const run = ensureRunExport();
  run.finishedAt = Date.now();
  console.log("=== RUN EXPORT (LOCAL) ===");
  console.log(JSON.stringify(run, null, 2));
  alert("RunExport JSON impreso en consola ✅ (DevTools > Console)");
};
  // Vestigium overlay
  const [showVestigium, setShowVestigium] = useState(false);

  // Rolls counter
  const [rollsCount, setRollsCount] = useState(0);

  // ===== Master Ying-Yang =====
  const [masterMsg, setMasterMsg] = useState<string>(() => masterLine("start"));

  // Previous snapshot (to detect real movement)
  const prevSnapRef = useRef({
    turn: state.turn as "P1" | "P2",
    p1: state.pieces.P1.pos,
    p2: state.pieces.P2.pos,
  });

  // Master comments when movement actually happened
  useEffect(() => {
    const prev = prevSnapRef.current;
    const now = {
      turn: state.turn as "P1" | "P2",
      p1: state.pieces.P1.pos,
      p2: state.pieces.P2.pos,
    };

    const p1Moved = prev.p1 !== now.p1;
    const p2Moved = prev.p2 !== now.p2;

    if (p1Moved || p2Moved) {
      const mover = prev.turn;
      const from = mover === "P1" ? prev.p1 : prev.p2;
      const to = mover === "P1" ? now.p1 : now.p2;
      const dif = to - from;

      setMasterMsg(masterLine("cross", { from, to, dif }));
    }

    prevSnapRef.current = now;
  }, [state.turn, state.pieces.P1.pos, state.pieces.P2.pos]);

  // Phase transition tracking (to count rolls)
  const prevPhaseRef = useRef<string>(state.phase);

  // Dedupers
  const lastLoggedRollRef = useRef<string | null>(null);
  const lastLoggedMoveRef = useRef<string | null>(null); // (lo usaremos luego para moves)
const asPlayer = (x: any): "P1" | "P2" | null =>
  x === "P1" || x === "P2" ? x : null;

const otherPlayer = (p: "P1" | "P2"): "P1" | "P2" =>
  p === "P1" ? "P2" : "P1";
  const hasRolled = state.phase === "rolled";
  const a = state.rollOptions?.[0] ?? null;
  const b = state.rollOptions?.[1] ?? null;

  const sum = useMemo(() => {
    if (a == null || b == null) return null;
    return a + b;
  }, [a, b]);

  // Realms by position (6×4)
 const realmIndexFromPos = (pos: number) => {
  return Math.max(0, Math.min(Math.floor(pos / 4), REALM_CANON.length - 1));
};

const realmIndexP1 = realmIndexFromPos(state.pieces.P1.pos);
const realmIndexP2 = realmIndexFromPos(state.pieces.P2.pos);

const realmDataP1 = REALM_CANON[realmIndexP1];
const realmDataP2 = REALM_CANON[realmIndexP2];

const eraP1 = realmDataP1?.era ?? "Unknown";
const eraP2 = realmDataP2?.era ?? "Unknown";

const activeRealmData = state.turn === "P1" ? realmDataP1 : realmDataP2;
const activeEra = activeRealmData?.era ?? "Unknown";
const activePlayer = state.turn;

const activeProgress = state.realmProgress[activePlayer];

const cyclesDone = activeProgress.completedLoopsInRealm;

const loopsRequiredForRealmStep = (step: number) => {
  if (step >= 7) return 0;
  return step * 7;
};

const cyclesNeeded = loopsRequiredForRealmStep(activeProgress.currentRealmStep);
const cyclesRemaining = Math.max(0, cyclesNeeded - cyclesDone);
const transitions = activeProgress.realmTransitions;

const activePatternRaw =
  state.turn === "P1"
    ? (state.pattern as any)?.players?.P1?.label ??
      (state.pattern as any)?.P1?.label ??
      "UNKNOWN"
    : (state.pattern as any)?.players?.P2?.label ??
      (state.pattern as any)?.P2?.label ??
      "UNKNOWN";

const activeChoice = state.lastMove?.choice ?? null;

const oracleReading = karmaOracle({
  pattern: activePatternRaw,
  realm: activeRealmData?.id ?? "UNKNOWN",
  didCapture: state.lastMove?.didCapture ?? false,
  choice: activeChoice,
});

const oracleText = masterOracleLine(oracleReading, state.level);

const mirrorData = karmaMirror({
  player: state.turn,
  patternLabel: activePatternRaw,
  choice: activeChoice as "A" | "B" | "AB" | "ECO" | null,
  didCapture: state.lastMove?.didCapture ?? false,
  cyclesDone,
  transitions,
  realmLabel: activeRealmData?.label ?? "Unknown",
  oracle: oracleReading,
});

  // 1) Count rolls (when a roll is consumed)
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
              pos: { P1: state.pieces.P1.pos, P2: state.pieces.P2.pos },
              captures: { P1: state.captures.P1, P2: state.captures.P2 },
            });
          } catch {}
        }

        return next;
      });
    }

    prevPhaseRef.current = now;
  }, [state.phase, state.level, state.turn, state.pieces, state.captures]);

  // 1b) Log roll to Supabase (ONLY when A/B exist)
  useEffect(() => {
    if (!session?.user) return;
    if (state.phase !== "rolled") return;
    if (!state.rollOptions) return;

    const [ra, rb] = state.rollOptions;
// --- KarmaEngine ingest: ROLL ---
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
    // dedupe: evita insertar dos veces el mismo roll
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
            pos: { P1: state.pieces.P1.pos, P2: state.pieces.P2.pos },
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
    state.pieces,
    state.captures,
    ensureRun,
  ]);

  // 2) Auto-close vestigium overlay
  useEffect(() => {
    if (!showVestigium) return;
    const t = window.setTimeout(() => setShowVestigium(false), 2600);
    return () => window.clearTimeout(t);
  }, [showVestigium]);

  // 3) Dispatch wrapper: safe reset
  const dispatch = (action: any) => {
    if (action?.type === "RESET") {
      setRollsCount(0);
      setShowVestigium(false);
      prevPhaseRef.current = "idle";
      setMasterMsg(masterLine("start"));
      prevSnapRef.current = { turn: "P1", p1: 0, p2: 0 };
      setRunId(null);
      resetRunExport();

      karmaRef.current = new KarmaEngine(["P1", "P2"]);
      setKarmaSnap(karmaRef.current.snapshot(0));

      // reset dedupers
      lastLoggedRollRef.current = null;
      lastLoggedMoveRef.current = null;
    }
    dispatchBase(action);
  };

  useEffect(() => {
    console.log("PHASE:", state.phase);
    console.log("ROLL_OPTIONS:", state.rollOptions);
  }, [state.phase, state.rollOptions]);

return (
  <ErrorBoundary>

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
        onVestigiumDone={() => setShowVestigium(false)}
        onLogout={async () => {
          await supabase.auth.signOut();
          setRunId(null);
          setProfile(null);
        }}
        onExportRun={debugPrintRunExport}
        onRoll={() => dispatch({ type: "ROLL" })}
        onReset={() => dispatch({ type: "RESET" })}
        onChooseRoll={(value) => dispatch({ type: "CHOOSE_ROLL", value })}
        realmDataP1={realmDataP1}
        realmDataP2={realmDataP2}
      />
    )}

  </ErrorBoundary>
);
}