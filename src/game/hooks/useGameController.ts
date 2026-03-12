import { useEffect, useReducer, useRef, useState, useMemo, useCallback } from "react";
import { reducer } from "../state/reducer";
import { initialState } from "../state/state";
import { supabase } from "../../lib/supabaseClient";
import { KarmaEngine } from "../engine/KarmaEngine";
import { REALM_CANON } from "../realm/realmCanon";
import { karmaOracle } from "../karma/karmaOracle";
import { karmaMirror } from "../karma/karmaMirror";
import { masterLine, masterOracleLine } from "../master/masterEngine";

export function useGameController() {
  const [state, dispatchBase] = useReducer(reducer, initialState);
  const [showVestigium, setShowVestigium] = useState(false);
  const [rollsCount, setRollsCount] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [karmaSnap, setKarmaSnap] = useState<any>(null);

  const karmaRef = useRef<KarmaEngine | null>(null);

  useEffect(() => {
    if (!karmaRef.current) {
      karmaRef.current = new KarmaEngine(["P1", "P2"]);
      setKarmaSnap(karmaRef.current.snapshot(0));
    }
  }, []);

  const handleLogin = async () => {
    const email = prompt("Email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Check your email for the login link.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setRunId(null);
    setProfile(null);
  };

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

  const dispatch = (action: any) => {
    dispatchBase(action);
  };

  const a = state.rollOptions?.[0] ?? null;
  const b = state.rollOptions?.[1] ?? null;
  const hasRolled = state.phase === "rolled";

  const sum = useMemo(() => {
    if (a == null || b == null) return null;
    return a + b;
  }, [a, b]);

  const realmIndexFromPos = (pos: number) =>
    Math.max(0, Math.min(Math.floor(pos / 4), REALM_CANON.length - 1));

  const realmDataP1 = REALM_CANON[realmIndexFromPos(state.pieces.P1.pos)];
  const realmDataP2 = REALM_CANON[realmIndexFromPos(state.pieces.P2.pos)];
  const activeRealmData = state.turn === "P1" ? realmDataP1 : realmDataP2;
  const activeEra = activeRealmData?.era ?? "Unknown";

  const activePlayer = state.turn;
  const activeProgress = state.realmProgress[activePlayer];
  const cyclesDone = activeProgress.completedLoopsInRealm;
  const cyclesNeeded =
    activeProgress.currentRealmStep >= 7 ? 0 : activeProgress.currentRealmStep * 7;
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

  const debugPrintRunExport = () => {
    console.log("run export placeholder");
  };

  return {
    state,
    dispatch,
    session,
    profile,
    runId,
    setRunId,
    setProfile,
    showVestigium,
    setShowVestigium,
    rollsCount,
    setRollsCount,
    karmaSnap,
    setKarmaSnap,
    handleLogin,
    handleLogout,
    a,
    b,
    sum,
    hasRolled,
    realmDataP1,
    realmDataP2,
    activeRealmData,
    activeEra,
    cyclesDone,
    cyclesNeeded,
    transitions,
    oracleText,
    mirrorData,
    debugPrintRunExport,
  };
}