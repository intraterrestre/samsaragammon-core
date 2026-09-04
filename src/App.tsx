// src/App.tsx
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import "./App.css";

import { getGameDerivedState } from "./game/getGameDerivedState";
import type { PieceKind } from "./game/types";
import { findNewlySpawnedNidana, findNewlyCarriedNidana } from "./game/nidanaDiff";
import { NIDANA_LIST } from "./game/nidanas";
import { reducer } from "./game/state/reducer";
import { initialState } from "./game/state/state";
import { saveVestigium, makeGameId } from "./game/Vestigium";

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
const marinoIntro = new URL("./assets/cinematics/realms/marino_human_intro.mp4", import.meta.url).href;
const rufusIntro = new URL("./assets/cinematics/realms/rufus_titan_intro.mp4", import.meta.url).href;
const whitmanIntro = new URL("./assets/cinematics/realms/whitman_deva_intro.mp4", import.meta.url).href;

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
  // v (26 agosto 2026) — bug real encontrado investigando la aparicion
  // fisica de Nidanas: el archivo real en disco para la cara frontal
  // de IGNORANCE tiene un espacio antes de ".jpg"
  // ("nidana_01_ignorance_front .jpg"), asi que el patron generico de
  // abajo nunca la encontraba (imagen rota, src undefined). No se
  // habia notado porque IGNORANCE nunca dispara el sistema narrativo
  // (queda sin mapear a proposito en NIDANA_BY_PATTERN_EVENT) — pero
  // la aparicion fisica nueva SI puede elegirla al azar entre las 12.
  const filename =
    id === 1 && side === "front"
      ? "nidana_01_ignorance_front .jpg"
      : `nidana_${num}_${name}_${side}.jpg`;
  return nidanaImages[`./assets/nidanas/${filename}`];
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

// v68 (27 agosto 2026) — Vestigium (v0, stamps cada 30 tiradas) y
// FinalVestigium (resumen de fin de partida) viven en un único lugar
// ahora: src/game/Vestigium.ts. Esto estaba duplicado a mano acá
// (mismo tipo/funciones, redefinidos) mientras el módulo quedaba sin
// importar — dead code. saveVestigium importado arriba (loadVestigia
// también está exportado ahí si en algún momento hace falta acá).

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
  // v68 (27 agosto 2026) — inicializador perezoso: initialState es
  // estático (se evalúa una sola vez al cargar el módulo), así que sin
  // esto la PRIMERA partida de la sesión quedaría con gameStartedAt=0
  // y gameId="". Las partidas siguientes ya los pisan bien en el
  // reducer (case "RESET"); esto solo cubre el primer render.
  const [state, dispatchBase] = useReducer(
    reducer,
    initialState,
    (init) => ({ ...init, gameStartedAt: Date.now(), gameId: makeGameId() })
  );
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
  // 2026-08-22: karmaSnap (el valor) solo se pasaba a GameShell, que
  // nunca lo declaró en Props ni lo leyó — se deja de leer ese slot;
  // setKarmaSnap sigue en uso real (ROLL, sincronización de Karma).
  const [, setKarmaSnap] = useState<any>(null);

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
  //
  // 2026-08-23: mismo ajuste que en GameShell (ver ese comentario) — se
  // saca 'touchstart' y se deja solo 'click', por higiene: cualquier
  // listener global en 'touchstart' es candidato a competir con el click
  // real del usuario en algunos navegadores. No es la causa confirmada
  // del botón "TAP TO START" que no respondía, pero es el mismo patrón
  // de riesgo y no cuesta nada sacarlo también.
  React.useEffect(() => {
    const unlockAudio = () => {
      const silence = new Audio();
      silence.play().catch(() => {});
      document.removeEventListener("click", unlockAudio);
    };
    document.addEventListener("click", unlockAudio, { once: true });
  }, []);

  const DICE_AUDIO_POOL_SIZE = 4;
  const diceAudioPoolWhiteRef = useRef<HTMLAudioElement[]>([]);
  const diceAudioPoolBlackRef = useRef<HTMLAudioElement[]>([]);
  const diceAudioPoolIndexRef = useRef(0);
  // 2026-08-24 — Federico reportó "el sonido de los dados blancos no
  // suena" jugando una partida real. Medido con ffmpeg (volumedetect):
  // dice_roll.mp3 (blanco/P1) tenía un pico real de apenas -7.0dB
  // contra -4.5dB de blackdice-rolling.mp3 (negro/P2) — no estaba
  // silencioso (no es el mismo caso que capture_white.mp3 v22), pero
  // sí bastante más flojo que el negro al lado del cual se compara
  // todo el rato. Se renormalizaron ambos archivos en el propio
  // asset (+6dB blanco, +3.5dB negro — mismo pico final ≈ -1.4dB los
  // dos, ver src/assets/sounds/) y se sube el volumen JS a 1.0 (tope)
  // para aprovechar ese margen.
  useEffect(() => {
    const makePool = (src: string) =>
      Array.from({ length: DICE_AUDIO_POOL_SIZE }, () => {
        const a = new Audio(src);
        a.volume = 1.0;
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

  const [, setProfile] = useState<any>(null);
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

  // 2026-08-22: debugPrintRunExport se borra — era una herramienta de
  // debug (imprime el RunExport en consola) que solo se invocaba vía
  // onExportRun={debugPrintRunExport} pasado a GameShell.tsx, pero
  // GameShell nunca declaró onExportRun en su Props ni la llamó desde
  // ningún botón — cero call sites reales, confirmado por grep, tanto
  // antes como después de este cleanup. ensureRunExport (la función
  // que sí se usa de verdad, línea ~443) queda intacta.

  /** =========================
   *  Vestigium
   *  ========================= */
  const [showVestigium, setShowVestigium] = useState(false);
  // 2026-08-22: mismo caso — rollsCount (el valor) solo se pasaba a
  // GameShell, que nunca lo declaró en Props ni lo leyó; setRollsCount
  // sigue en uso real más abajo.
  const [, setRollsCount] = useState(0);
  const prevPhaseRef = useRef<string>(state.phase);

  const [activeNidanaId, setActiveNidanaId] = useState<number | null>(null);
const [nidanaSide, setNidanaSide] = useState<"front" | "back">("front");
const [showNidana, setShowNidana] = useState(false);

const nidanaTimersRef = useRef<number[]>([]);

// v38 (13 agosto 2026) — a pedido de Federico/Chat: este disparador
// ya NO elige la Nidana al azar. Ahora solo reproduce la presentacion
// visual (moneda front/back + banner) para el "id" que le pasen — la
// decision de CUAL Nidana y CUANDO viene unicamente de
// state.currentNidana (Pattern Engine + cooldown, ver el useEffect
// mas abajo que la dispara). triggerNidanaCoin no decide nada, solo
// anima.
const triggerNidanaCoin = (id: number) => {
  nidanaTimersRef.current.forEach((t) => window.clearTimeout(t));
  nidanaTimersRef.current = [];

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

// v38 (13 agosto 2026) — UNICA fuente de verdad para "que Nidana
// aparece y cuando": state.currentNidana (Pattern Engine real +
// cooldown, calculado en reducer.ts). Este efecto solo REPRODUCE la
// presentacion visual existente (triggerNidanaCoin) cuando ese valor
// cambia por un evento nuevo de verdad.
//
// currentNidana NUNCA vuelve a null (ver reducer.ts: nextCurrentNidana
// = shouldShowNewNidana ? mappedNidana! : state.currentNidana) — se
// queda pegado en la ultima Nidana real hasta que otro evento lo
// reemplace. Por eso NO alcanza con mirar solo currentNidana en las
// dependencias del efecto: la MISMA Nidana puede repetirse mas
// adelante en la partida (ej. CRAVING dos veces, con cooldown de por
// medio) y ese caso no cambiaria el string, pero SI es una aparicion
// nueva. lastNidanaAtTurn (el turno exacto del ultimo evento real) es
// la señal correcta para detectar "esto es nuevo" — se compara contra
// un ref, no se dispara en cada render ni en cambios no relacionados.
const lastAnimatedNidanaTurnRef = useRef<number | null>(null);

// v39 (13 agosto 2026) — bug reportado por Federico: salio una Nidana
// EN MEDIO DE GENESIS, sin avatares todavia. El Pattern Engine
// (recordMove, reducer.ts) no tiene ningun gate de era — puede marcar
// state.currentNidana desde el primer movimiento de un Veneno, mucho
// antes de Oriol. Antes esto no se notaba porque la UNICA fuente
// visual (el viejo triggerNidanaCoin() al azar en onRoll) SI tenia su
// propio gate (shouldTriggerNidana, currentRealmStep >= 3) — pero ese
// gate nunca protegio a este efecto, que escucha state.currentNidana
// directo. No se toca el Pattern Engine ni el reducer (fuera del
// alcance acordado) — se agrega el mismo gate de "Oriol ya entro" que
// ya usa GameShell.tsx (oriolEntered, derivado de state.cosmicClock.era)
// solo del lado de la presentacion visual.
const ERA_ORDER_FOR_NIDANA = ["bruno", "margot", "oriol", "marino", "rufus", "whitman"] as const;
const oriolEnteredForNidana =
  ERA_ORDER_FOR_NIDANA.indexOf(
    state.cosmicClock.era as (typeof ERA_ORDER_FOR_NIDANA)[number]
  ) >= ERA_ORDER_FOR_NIDANA.indexOf("oriol");

useEffect(() => {
  if (!oriolEnteredForNidana) {
    // Antes de Oriol: no se anima nada, pero SI se sincroniza el ref
    // con el turno actual — asi ningun evento de Genesis queda
    // "pendiente" para dispararse de golpe apenas Oriol entre (eso
    // repetiria el bug de 12 agosto: "salta a una foto vieja con todo
    // el juego andando", esta vez con una Nidana vieja en vez de un
    // efecto viejo).
    lastAnimatedNidanaTurnRef.current = state.lastNidanaAtTurn;
    return;
  }
  if (!state.currentNidana) return;
  if (lastAnimatedNidanaTurnRef.current === state.lastNidanaAtTurn) return;

  lastAnimatedNidanaTurnRef.current = state.lastNidanaAtTurn;

  const id = NIDANA_LIST.indexOf(state.currentNidana) + 1;
  if (id < 1) return; // no deberia pasar, pero mejor no animar basura

  triggerNidanaCoin(id);
}, [oriolEnteredForNidana, state.currentNidana, state.lastNidanaAtTurn]);

// ===========================================================
// Paso 1 (26 agosto 2026) — Nidanas fisicas: reutiliza la MISMA
// moneda grande (triggerNidanaCoin, arriba) para anunciar la
// aparicion/recoleccion fisica en el tablero (state.boardNidanas /
// state.avatarNidana), pero como sistema separado del narrativo de
// arriba — decision explicita de Federico (26 agosto 2026): pueden
// coincidir en el mismo turno y mostrar Nidanas distintas, no se
// unifican. Sin gate de Oriol (oriolEnteredForNidana) a proposito:
// la aparicion fisica ya tiene su propio gate real en el reducer
// (los dos eventos que la disparan, avatar_sent_to_mara y
// realm_stuck, solo existen una vez que hay Avatares en juego).
//
// Los refs se inicializan con el valor ACTUAL de state (no con {})
// para que el primer render (o una partida multiplayer que carga con
// Nidanas fisicas ya en curso) no dispare la moneda por "aparecer" lo
// que en realidad ya estaba ahi desde antes.
const prevBoardNidanasRef = useRef(state.boardNidanas);
const prevAvatarNidanaRef = useRef(state.avatarNidana);

useEffect(() => {
  const prev = prevBoardNidanasRef.current;
  const current = state.boardNidanas;

  const spawnedNidana = findNewlySpawnedNidana(prev, current);

  prevBoardNidanasRef.current = current;
  if (!spawnedNidana) return;

  const numericId = NIDANA_LIST.indexOf(spawnedNidana) + 1;
  if (numericId < 1) return;
  triggerNidanaCoin(numericId);
}, [state.boardNidanas]);

useEffect(() => {
  const pickedUp = findNewlyCarriedNidana(
    prevAvatarNidanaRef.current,
    state.avatarNidana
  );

  prevAvatarNidanaRef.current = state.avatarNidana;
  if (!pickedUp) return;

  const numericId = NIDANA_LIST.indexOf(pickedUp) + 1;
  if (numericId < 1) return;
  triggerNidanaCoin(numericId);
}, [state.avatarNidana]);

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
    // 2026-08-22: hasRolled, "sum" (a + b), realmDataP1, realmDataP2,
    // cyclesDone, cyclesNeeded y transitions se desestructuraban acá y
    // se pasaban a <GameShell>, pero GameShell.tsx nunca las declaró en
    // su Props ni las usó en ningún lado (confirmado por grep) —
    // cableado muerto de punta a punta. Se dejan de desestructurar
    // aquí; getGameDerivedState() sigue calculándolas por si algún
    // consumidor futuro las necesita.
    a,
    b,
    activeRealmData,
    activeEra,
    oracleText,
    mirrorData,
  } = getGameDerivedState({
    state,
    selectedPos,
  });
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
  // v55 (17 agosto 2026) — revertido el disparo de fanfarria acá (v53):
  // la fanfarria no va con el fin del video de Whitman, va con la
  // formación física completa (6/6 en Humans, ver GameShell). Vuelve al
  // handler original.
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
      // 2026-08-22: hasta acá llegaban también hasRolled, rollsCount,
      // karmaSnap, cyclesDone, cyclesNeeded y transitions — cableado
      // muerto confirmado por grep: GameShell.tsx nunca las declaró en
      // su Props ni las desestructuró (TS no lo comprobaba porque
      // Props tampoco las tenía, así que no había excess-property
      // error hasta llegar a "sum", el primero de la lista). Ninguna
      // se usa en ningún otro lado de App.tsx tampoco. Se retira el
      // paso de esas 6 props; los estados/cálculos de origen se dejan
      // intactos por si algún consumidor futuro los necesita.
      avatarVideoPlaying={activeRealmIntro !== null}
      activeRealmData={activeRealmData}
      activeEra={activeEra}
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
      // v54 (17 agosto 2026) — revertido el disparo directo de
      // whitmanIntroEndSignal que este botón tenía (v53): Federico lo
      // probó y la foto de la luna se destapaba ANTES de que él
      // "coronara" al 6to Avatar de verdad — ese momento tiene que
      // salir del juego real (video de Whitman → fanfarria → campana),
      // nunca de un atajo de dev. El atajo ahora se llama
      // DEV_SKIP_TO_RUFUS y se detiene un Avatar antes (ver reducer.ts)
      // para que Federico pueda jugar el último tramo a mano.
      onDevSkipToRufus={() => dispatch({ type: "DEV_SKIP_TO_RUFUS" })}
      // v69 (27 agosto 2026) — atajo pedido por Federico: deja al
      // jugador activo en 5/6 fichas en Humans (ver reducer.ts, case
      // "DEV_SKIP_TO_5_HUMANS") para probar el aviso "ONE MORE TO GET
      // OUT" sin jugar toda la partida.
      onDevSkipTo5Humans={() => dispatch({ type: "DEV_SKIP_TO_5_HUMANS" })}
      // v74 (28 agosto 2026) — DEV — FANDANGO / NIDANA TEST TOOL, pedido
      // de Federico/Chaty: forzar Nidanas en Avatares de P1/P2 sin
      // depender del azar, para probar Fandango de forma repetible.
      // GameShell solo monta el panel si import.meta.env.DEV además de
      // recibir estos callbacks (ver GameShell.tsx) — acá se pasan
      // siempre, el gate real vive ahí y espejado dentro del reducer.
      onDevSetAvatarNidana={(player, realm, nidana) =>
        dispatch({ type: "DEV_SET_AVATAR_NIDANA", player, realm, nidana })
      }
      onDevSetAllAvatarNidanas={(avatarNidana) =>
        dispatch({ type: "DEV_SET_ALL_AVATAR_NIDANAS", avatarNidana })
      }
      // v76 (28 agosto 2026) — FORM LINK, pedido de Federico: primer
      // gesto real de Fandango, ya no dev-only (ver reducer.ts, case
      // "FORM_LINK"). GameShell arma "player" con state.turn antes de
      // llamar acá (ver GameShell.tsx, handleFormLink).
      onFormLink={(player, low) =>
        dispatch({ type: "FORM_LINK", player, low })
      }
      // v77 (28 agosto 2026) — Fandango: FORM DEAL, pedido de Federico.
      // Ver reducer.ts (SEND_TRADE_OFFER/ACCEPT_TRADE_OFFER/
      // REFUSE_TRADE_OFFER) y FandangoWindow.tsx.
      onSendTradeOffer={(player, offer, want) =>
        dispatch({ type: "SEND_TRADE_OFFER", player, offer, want })
      }
      onAcceptTrade={() => dispatch({ type: "ACCEPT_TRADE_OFFER" })}
      onRefuseTrade={() => dispatch({ type: "REFUSE_TRADE_OFFER" })}
      // v84 (4 septiembre 2026) — Square Karma 666 (Snake Bet) y Round
      // Dharma 777, pedido de Federico. Ver reducer.ts
      // (REQUEST_SNAKE_BET/ACCEPT_SNAKE_BET/REFUSE_SNAKE_BET/
      // DECLARE_DHARMA_777).
      onRequestSnakeBet={(player, targetAvatar) =>
        dispatch({ type: "REQUEST_SNAKE_BET", player, targetAvatar })
      }
      onAcceptSnakeBet={() => dispatch({ type: "ACCEPT_SNAKE_BET" })}
      onRefuseSnakeBet={() => dispatch({ type: "REFUSE_SNAKE_BET" })}
      onDeclareDharma777={(player, option, allOptions, targetAvatar) =>
        dispatch({
          type: "DECLARE_DHARMA_777",
          player,
          option,
          allOptions,
          targetAvatar,
        })
      }
      onVestigiumDone={() => setShowVestigium(false)}
      onCloseLedger={() => dispatch({ type: "CLOSE_LEDGER" })}
      // 2026-08-22: onIntroDone (dispatch INTRO_DONE → state.introSeen =
      // true) y onExportRun (debugPrintRunExport) también se pasaban
      // acá, pero GameShell.tsx nunca las declaró en Props ni las llamó
      // — nada las invocaba nunca. Además state.introSeen resultó no
      // leerse en ningún otro lado del código (grep), así que ni
      // siquiera dejaba de cumplir una función silenciosa. Se retiran
      // ambas; INTRO_DONE sigue existiendo en el reducer y
      // debugPrintRunExport sigue definida por si se recablean después.
      onLogout={async () => {
        await supabase.auth.signOut();
        setRunId(null);
        setProfile(null);
      }}
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
  // v38 (13 agosto 2026) — ya NO se dispara la moneda de Nidana aca.
  // Antes esto elegia una al azar en CADA tirada valida, en paralelo
  // (y sin ninguna relacion) con state.currentNidana, el sistema real
  // basado en Pattern Engine — el jugador podia ver una Nidana sin
  // ninguna conexion con lo que el motor detecto. Ver el useEffect que
  // escucha state.currentNidana/lastNidanaAtTurn mas abajo: esa es
  // ahora la UNICA fuente de verdad para decidir que Nidana aparece.
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

// 2026-08-22: realmDataP1/realmDataP2 (de getGameDerivedState) también
// se pasaban acá — mismo patrón, GameShell.tsx nunca las declaró en
// Props ni las usó. Se retiran; getGameDerivedState sigue
// calculándolas.
/>


</>
  )}
</ErrorBoundary>
);
}