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
import { Lobby } from "./UI/Lobby";
import { useGameController } from "./game/hooks/useGameController";
import {
  createGame,
  joinGame,
  updateGameState,
  subscribeToGame,
  type Game,
} from "./lib/gameService";
import { getMasterLine } from "./game/master/masterVoices";
import diceRollSound from "./assets/sounds/dice_roll.mp3";
// 2026-08-05: sonido distinto por dado, a pedido del usuario — blanco
// (P1) sigue con dice_roll.mp3, negro (P2) usa este nuevo archivo.
import diceRollSoundBlack from "./assets/sounds/blackdice-rolling.mp3";

// Videos cargados como URLs estáticas (no en memoria hasta que se usan)
// v8 — el split-screen (dos videos lado a lado) se probó y se descartó:
// el ratio 50/50 corta el cartel inicial de cada video y no se lee.
// Vuelve a ser un solo video, igual que el resto de los Avatares —
// Federico va a producir un video único con swap de ficha blanca/negra
// para reemplazar bruno_origin_intro.mp4 cuando esté listo.
const brunoIntro = new URL("./assets/cinematics/realms/bruno_origin_intro.mp4", import.meta.url).href;
const margotIntro = new URL("./assets/cinematics/realms/margot_hell_intro.mp4", import.meta.url).href;
const oriolIntro = new URL("./assets/cinematics/realms/oriol_animal_intro.mp4", import.meta.url).href;
const marinoIntro = new URL("./assets/cinematics/realms/marino_human_intro.mov", import.meta.url).href;
const rufusIntro = new URL("./assets/cinematics/realms/rufus_titan_intro.mp4", import.meta.url).href;
const whitmanIntro = new URL("./assets/cinematics/realms/whitman_deva_intro.mp4", import.meta.url).href;
import { SamsaraStage } from "./samsara/SamsaraStage";

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
// v13 (10 agosto 2026) — reinicio real de Genesis. GameShell guarda su
// propio estado local de los clics decorativos (genesisClickCount,
// casillasFinished, genesisPhase, genesisDiceA/B) — ese estado NUNCA se
// tocaba en RESET porque vive en un componente hijo, no en el reducer.
// Resultado real de playtest: tras reiniciar, esos valores quedaban tan
// altos como en la partida anterior, así que genesisComplete/
// casillasFinished ya estaban en true desde el primer render de la
// partida nueva — se saltaba todo Genesis, incluida la intro de Bruno.
// Forzar un remount completo de GameShell (key) es más seguro que ir
// limpiando cada useState uno por uno: garantiza que TODO su estado
// local decorativo empiece de cero, sin tener que enumerar cada campo.
const [genesisResetSeq, setGenesisResetSeq] = useState(0);
// 2026-08-05: este video se disparaba con muted={false} + play() dentro de
// un useEffect/setTimeout — fuera de la cadena directa de un gesto del
// usuario, así que los navegadores lo bloqueaban silenciosamente (catch
// vacío). Resultado: pantalla negra aunque sonaran otros efectos (fiesta/
// fireworks, que sí corren dentro del gesto de clic). Mismo patrón que
// GenesisReveal: arranca muted (autoplay garantizado) + botón para
// activar sonido con un tap explícito.
const [realmIntroMuted, setRealmIntroMuted] = useState(true);
const realmIntroVideoRef = useRef<HTMLVideoElement | null>(null);
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

  // 2026-08-05: tres causas encontradas en orden. (1) Se creaba un
  // `new Audio(...)` nuevo en cada tirada sin guardar referencia —
  // corregido reusando un Audio persistente. (2) El archivo dice_roll.mp3
  // estaba casi en silencio (mean_volume ≈ -53dB) — renormalizado +20dB.
  // (3) Con logs de diagnóstico confirmamos que play() SIEMPRE resuelve
  // OK (sin error), pero el usuario reportó que igual "a veces no suena"
  // — es el problema clásico de reusar UN SOLO elemento Audio para un
  // efecto corto que se dispara repetido: si un play() nuevo llega antes
  // de que el anterior se asiente del todo, el navegador a veces lo
  // silencia sin avisar. Fix: pool de varios Audio en rotación, patrón
  // estándar para SFX cortos y repetidos.
  // Desbloquear contexto de audio en iOS/móvil en el primer toque
  React.useEffect(() => {
    const unlockAudio = () => {
      const silence = new Audio();
      silence.play().catch(() => {});
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("touchstart", unlockAudio, { once: true });
    document.addEventListener("click", unlockAudio, { once: true });
  }, []);

  const DICE_AUDIO_POOL_SIZE = 4;
  const diceAudioPoolWhiteRef = useRef<HTMLAudioElement[]>([]);
  const diceAudioPoolBlackRef = useRef<HTMLAudioElement[]>([]);
  const diceAudioPoolIndexRef = useRef(0);
  useEffect(() => {
    const makePool = (src: string) =>
      Array.from({ length: DICE_AUDIO_POOL_SIZE }, () => {
        const a = new Audio(src);
        a.volume = 0.8;
        return a;
      });
    diceAudioPoolWhiteRef.current = makePool(diceRollSound);
    diceAudioPoolBlackRef.current = makePool(diceRollSoundBlack);
  }, []);

  const playDiceSound = useCallback((player: "P1" | "P2") => {
    const pool =
      player === "P1"
        ? diceAudioPoolWhiteRef.current
        : diceAudioPoolBlackRef.current;
    if (!pool.length) return;
    const audio = pool[diceAudioPoolIndexRef.current % pool.length];
    diceAudioPoolIndexRef.current =
      (diceAudioPoolIndexRef.current + 1) % pool.length;
    try {
      audio.currentTime = 0;
    } catch (err) {
      console.warn("Dice sound currentTime reset failed:", err);
    }
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

  /** =========================
   *  Multiplayer state
   *  ========================= */
  const [gameMode, setGameMode] = useState<"lobby" | "local" | "multiplayer">("lobby");
  const [multiplayerGame, setMultiplayerGame] = useState<Game | null>(null);
  const [myRole, setMyRole] = useState<"P1" | "P2" | null>(null);
  const [lobbyCode, setLobbyCode] = useState<string | null>(null);
  const [lobbyError, setLobbyError] = useState<string | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(false);
  const isReceivingFromRealtime = useRef(false);
  const lastSyncedVersion = useRef<number>(-1);

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

  // v12 (10 agosto 2026) — generalizado a los seis Avatares: el video de
  // cada Avatar se reproduce UNA SOLA VEZ para toda la partida, sin
  // importar cuál jugador llegue primero. Antes solo Bruno tenía esta
  // regla (v9); Federico confirmó que quiere el mismo patrón para el
  // resto: video una vez para quien llega primero, y solo aplausos/
  // fuegos artificiales (otro useEffect, sin relación) para el segundo
  // jugador — sin repetir el video. La ficha de CADA jugador se sigue
  // creando de forma independiente cuando ese jugador individualmente
  // alcanza la etapa (Orchestrator/reducer, sin cambios) — esto solo
  // afecta cuántas veces se ve el video.
  const introId = realmKey;


  if (playedRealmIntrosRef.current[introId]) return;

  const introSrc = REALM_INTRO_MAP[realmKey];

  if (!introSrc) return;

  playedRealmIntrosRef.current[introId] = true;

  // 2026-08-05: antes esperaba 2200ms (para dejar sonar fireworks/medalla
  // primero) y arrancaba muted=true, exigiendo un tap manual para
  // escuchar el video. fireworks/cheering (más arriba, mismo archivo) SÍ
  // logran sonido automático porque se disparan desde un useEffect sin
  // demora artificial — probamos aquí lo mismo: bajamos el delay (deja
  // algo de aire para la fanfarria) y arrancamos con muted=false directo.
  // Si el navegador igual lo bloquea, el video se ve pero sin audio hasta
  // el tap en el botón (que sigue ahí como respaldo) — no hay forma
  // 100% confiable de saltarse esa política del navegador.
  window.setTimeout(() => {
    setRealmIntroMuted(false);
    setActiveRealmIntro(introSrc);
  }, 800);

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

  // FASE 1: cara frontal
  setNidanaSide("front");
  setShowNidana(true);

  nidanaTimersRef.current.push(
    // se borra la cara
   window.setTimeout(() => {
  setShowNidana(false);
}, 2600),

window.setTimeout(() => {
  setNidanaSide("back");
  setShowNidana(true);
}, 3000),

window.setTimeout(() => {
  setShowNidana(false);
}, 5600)
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
  setRealmIntroMuted(true);
  setGenesisResetSeq((n) => n + 1);

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

  /** =========================
   *  Multiplayer — sync state to Supabase
   *  ========================= */
  useEffect(() => {
    if (gameMode !== "multiplayer" || !multiplayerGame || !session?.user) return;
    if (isReceivingFromRealtime.current) return;

    const version = multiplayerGame.version;
    if (version === lastSyncedVersion.current) return;

    updateGameState(
      multiplayerGame.id,
      state,
      version,
      session.user.id,
      state.phase === "rolled" ? "roll" : "move"
    ).then((ok) => {
      if (ok) {
        lastSyncedVersion.current = version + 1;
        setMultiplayerGame((g) => g ? { ...g, version: version + 1 } : g);
      }
    });
  }, [state, gameMode, multiplayerGame, session]);

  /** =========================
   *  Multiplayer — Realtime subscription
   *  ========================= */
  useEffect(() => {
    if (gameMode !== "multiplayer" || !multiplayerGame) return;

    const unsubscribe = subscribeToGame(multiplayerGame.id, (game) => {
      // Si la versión es mía (ya la tengo), ignorar
      if (game.version <= lastSyncedVersion.current) return;

      isReceivingFromRealtime.current = true;
      dispatchBase({ type: "SET_MULTIPLAYER_STATE", state: game.state });
      setMultiplayerGame(game);
      lastSyncedVersion.current = game.version;

      setTimeout(() => {
        isReceivingFromRealtime.current = false;
      }, 100);
    });

    return unsubscribe;
  }, [gameMode, multiplayerGame?.id]);

  return (
  <ErrorBoundary>
{activeRealmIntro && (
  <div className="realmIntroOverlay" style={{ pointerEvents: "auto" }}>
  <video
  ref={realmIntroVideoRef}
  className="realmIntroVideo"
  src={activeRealmIntro}
  autoPlay
  playsInline
  preload="auto"
  muted={realmIntroMuted}
  // 2026-08-05: el handler onCanPlay anterior reseteaba
  // v.currentTime = 0 y llamaba play() en CADA disparo del evento
  // "canplay" — ese evento puede dispararse más de una vez durante el
  // buffering, así que el video quedaba reiniciándose en el frame 0 en
  // loop (pantalla "congelada" aunque el audio de fiesta sí sonaba).
  // El atributo autoPlay ya es suficiente para arrancar solo (empieza
  // muted, así que ningún navegador lo bloquea).
  onEnded={() => setActiveRealmIntro(null)}
/>
  <button
    type="button"
    onClick={() => {
      setRealmIntroMuted((prev) => {
        const next = !prev;
        if (realmIntroVideoRef.current) {
          realmIntroVideoRef.current.muted = next;
          if (!next) {
            realmIntroVideoRef.current.play().catch(() => {});
          }
        }
        return next;
      });
    }}
    aria-label={realmIntroMuted ? "Activar sonido" : "Silenciar"}
    title={realmIntroMuted ? "Activar sonido" : "Silenciar"}
    style={{
      position: "absolute",
      right: 20,
      bottom: 20,
      width: 72,
      height: 72,
      borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.7)",
      background: "rgba(0,0,0,0.55)",
      color: "#fff",
      fontSize: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      backdropFilter: "blur(2px)",
      zIndex: 1000000,
      pointerEvents: "auto",
    }}
  >
    {realmIntroMuted ? "🔇" : "🔊"}
  </button>
  </div>
)}

  {!session ? (
    <LoginScreen onLogin={handleLogin} />
  ) : gameMode === "lobby" ? (
    <Lobby
      userId={session.user.id}
      createdCode={lobbyCode}
      isLoading={lobbyLoading}
      error={lobbyError}
      onPlayLocal={() => setGameMode("local")}
      onCreateGame={async () => {
        setLobbyLoading(true);
        setLobbyError(null);
        try {
          const game = await createGame(session.user.id, state);
          setMultiplayerGame(game);
          setMyRole("P1");
          setLobbyCode(game.code);
          lastSyncedVersion.current = 0;
          // Esperar a que se una P2 via Realtime
          subscribeToGame(game.id, (updated) => {
            if (updated.player2_id && updated.status === "active") {
              setMultiplayerGame(updated);
              setGameMode("multiplayer");
            }
          });
        } catch (e: any) {
          setLobbyError(e.message ?? "Error creating game");
        } finally {
          setLobbyLoading(false);
        }
      }}
      onJoinGame={async (code) => {
        setLobbyLoading(true);
        setLobbyError(null);
        try {
          const game = await joinGame(code, session.user.id);
          setMultiplayerGame(game);
          setMyRole("P2");
          lastSyncedVersion.current = game.version;
          dispatchBase({ type: "SET_MULTIPLAYER_STATE", state: game.state });
          setGameMode("multiplayer");
        } catch (e: any) {
          setLobbyError(e.message ?? "Invalid code or game not found");
        } finally {
          setLobbyLoading(false);
        }
      }}
    />
  ) : (
    <>
    <GameShell
      key={genesisResetSeq}
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
     currentNidana={showNidana ? state.currentNidana : null}
      nidanaCoinSrc={
  showNidana && activeNidanaId
    ? getNidanaImage(activeNidanaId, nidanaSide)
    : null
}
nidanaCoinId={activeNidanaId}
nidanaCoinSide={nidanaSide}
      onGenesisUIComplete={() => dispatch({ type: "SET_GENESIS_UI_COMPLETE" })}
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
  // En multiplayer, solo puede tirar el jugador activo
  if (gameMode === "multiplayer" && myRole !== state.turn) return;
  playDiceSound(state.turn);

// Antes esto disparaba la moneda-Nidana + un efecto CLARITY/DISTORTION/
// TENSION en CADA tirada, incluida la primera tirada real justo después
// de terminar Genesis — daba la impresión de "saltar" a una partida ya
// avanzada (ver reporte del usuario: "salta a una foto vieja con todo
// el juego andando"). Los Nidanas son, según el diseño, activos "desde
// Oriol en adelante".
//
// v17 (10 agosto 2026) — bug real confirmado por Federico: el comentario
// de arriba YA decía "desde Oriol en adelante", pero el código usaba
// state.brunoRevealed (Bruno es el PRIMER Avatar, Oriol es el TERCERO —
// dos etapas completas de diferencia). Las nidanas se encendían apenas
// nacía Bruno, mucho antes de lo previsto. Corregido para comprobar de
// verdad la etapa de Oriol: avatarStep 3 en STEP_TO_ACTOR_ID
// (Orchestrator.ts) — currentRealmStep >= 3 del jugador activo.
const shouldTriggerNidana = state.realmProgress[state.turn].currentRealmStep >= 3;

if (shouldTriggerNidana) {
  triggerNidanaCoin();

  const r = Math.random();

  const effect =
    r < 0.33 ? "CLARITY" :
    r < 0.66 ? "DISTORTION" :
    "TENSION";

  window.setTimeout(() => {

    dispatch({
      type: "SET_NIDANA_EFFECT",
      effect
    });

  }, 5800);
}

  dispatch({
    type: "ROLL"
  });
}}
playDiceSound={playDiceSound}
onReset={() => dispatch({ type: "RESET" })}

onConsciousMove={(option, allOptions) => {
  if (gameMode === "multiplayer" && myRole !== state.turn) return;
  dispatch({
    type: "CONSCIOUS_MOVE",
    option,
    allOptions,
  });
}}

onSelectPiece={(piece: PieceKind) =>
  dispatch({ type: "SELECT_PIECE", player: state.turn, piece })
}

onSendEmoji={(emoji: string) =>
  dispatch({ type: "EMOJI", emoji, player: state.turn })
}

realmDataP1={realmDataP1}
realmDataP2={realmDataP2}
/>


</>
  )}
</ErrorBoundary>
);
}