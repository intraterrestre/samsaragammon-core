// src/UI/narrator.ts — servicio único de narración de Buddha.
//
// 18 nov 2026, pedido de Federico tras ver a un director de cine sin poder
// leer los carteles en el móvil: Buddha habla con la voz del propio
// teléfono (Web Speech API). Sin servidor, sin audios grabados, sin coste.
// Solo presentación: no lee ni cambia reglas ni motor del juego.
//
// UN selector global por dispositivo (localStorage, como el idioma; nunca
// viaja por GameState):
//   "both"  — texto + voz
//   "voice" — voz; los carteles de lección se reducen a un botón 🔊 ⟳
//   "text"  — solo texto: narración desactivada (por defecto desde 20 nov)
//
// Reglas para que el juego siga ágil:
//   - Una sola voz a la vez. Lo nuevo corta lo anterior, salvo que lo
//     anterior tenga más prioridad (entonces lo nuevo se descarta, no se
//     encola: nada se dice tarde).
//   - Sin repeticiones automáticas: el mismo texto no se vuelve a decir
//     hasta pasados REPEAT_GAP_MS (el botón "repetir" sí puede forzarlo).
//   - Nada de narrar cada tirada: solo se conecta a mensajes de Buddha que
//     ya aparecen poco (lecciones, consultas, ayuda).
//   - Si la voz falla o no existe, el modo efectivo pasa a "both": el texto
//     vuelve a verse siempre.
//
// Para conectar más adelante otras fuentes (Nidanas, Fandango, eventos):
//   narrate(texto, { source: "nidana" })            — llamada directa
//   useNarration(texto, { source: "fandango" })     — desde un componente
// Las fuentes ya están declaradas en NarrationSource; no hay nada más que
// tocar en este archivo.

import { useSyncExternalStore, useEffect, useRef } from "react";
import { getLang } from "../i18n";

export type NarratorMode = "both" | "voice" | "text";

export type NarrationSource =
  | "lesson" // carteles de JUEGA CON BUDDHA
  | "buddha" // lecturas del Buda Azul (Oracle / Mirror)
  | "help" // panel PREGUNTA A BUDDHA
  | "nidana" // reservado (todavía sin conectar)
  | "fandango" // reservado (todavía sin conectar)
  | "event"; // reservado (todavía sin conectar)

// Más alto = más importante. Una consulta pedida por el jugador no la
// corta un cartel automático.
const DEFAULT_PRIORITY: Record<NarrationSource, number> = {
  buddha: 3,
  help: 3,
  lesson: 2,
  nidana: 1,
  fandango: 1,
  event: 0,
};

export type NarrateOptions = {
  source: NarrationSource;
  priority?: number;
  // Ignora el modo "text" y la regla anti-repetición (botón repetir).
  force?: boolean;
  // Avisos cortos que SÍ deben repetirse (p. ej. "Tu turno"): se salta
  // solo la regla anti-repetición, no el modo elegido.
  repeat?: boolean;
};

const STORAGE_KEY = "samsara_narrator_v1";
export const NARRATOR_MODES: NarratorMode[] = ["both", "voice", "text"];
const REPEAT_GAP_MS = 30_000;

const synth: SpeechSynthesis | null =
  typeof window !== "undefined" && "speechSynthesis" in window
    ? window.speechSynthesis
    : null;

// ---------------------------------------------------------------- estado

function loadMode(): NarratorMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (NARRATOR_MODES as string[]).includes(saved)) return saved as NarratorMode;
  } catch {
    // sin almacenamiento: modo por defecto
  }
  // 20 nov 2026: apagada por defecto; quien quiera voz la elige.
  return "text";
}

let mode: NarratorMode = loadMode();
// La voz falló de verdad en este dispositivo (error del sintetizador, no
// una interrupción nuestra). Dura hasta recargar o elegir modo de nuevo.
let voiceFailed = synth === null;
let snapshot = { mode, effective: effectiveOf(mode), available: !voiceFailed };
const listeners = new Set<() => void>();

function effectiveOf(m: NarratorMode): NarratorMode {
  if (m === "text") return "text";
  return voiceFailed ? "both" : m;
}

function emit() {
  snapshot = { mode, effective: effectiveOf(mode), available: synth !== null && !voiceFailed };
  listeners.forEach((l) => l());
}

export function getNarratorMode(): NarratorMode {
  return mode;
}

export function setNarratorMode(next: NarratorMode): void {
  mode = next;
  // Elegir de nuevo una opción con voz es pedir otro intento.
  if (next !== "text" && synth) {
    voiceFailed = false;
    unlockVoice();
  }
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // el cambio dura hasta recargar
  }
  if (next === "text") stopNarration();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => snapshot;

// mode: lo elegido. effective: lo que de verdad aplica ("voice" vuelve a
// "both" si la voz falló). available: hay voz en este dispositivo.
export function useNarrator() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...s, setMode: setNarratorMode };
}

// ---------------------------------------------------------------- texto

// Los carteles están escritos para leerse: títulos en MAYÚSCULAS en su
// propia línea, emojis, flechas, ™. Para oírlos, cada línea se vuelve una
// frase y se quitan los símbolos que la voz leería en voz alta.
export function toSpeech(text: string): string {
  return text
    .replace(/\p{Extended_Pictographic}/gu, "")
    // 20 nov 2026 — onomatopeyas tipo "Pssss" / "Psst": las voces las
    // deletrean ("pe, ese, ese…"). Nunca se dicen en voz alta.
    .replace(/¡?\bps+t?\b[!…. ]*/giu, "")
    .replace(/\s*·\s*/g, ", ")
    .replace(/[™↗☸]/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    // Algunas voces deletrean las MAYÚSCULAS: solo para la voz, se bajan.
    .map((line) =>
      line === line.toUpperCase() && /\p{Lu}{3}/u.test(line) ? line.toLowerCase() : line
    )
    .map((line) => (/[.!?¡¿:,…]$/.test(line) ? line : `${line}.`))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// 20 nov 2026 — en el Mac de Federico sonaba "terriblemente fea": macOS e
// iOS traen voces de broma también en español (Eddy, Flo, Grandma…) y la
// regla anterior ("la primera voz local") elegía Eddy por orden alfabético.
// Ahora se puntúa cada voz y las de broma quedan fuera.
const NOVELTY = [
  "albert", "bad news", "bahh", "bells", "boing", "bubbles", "cellos", "good news",
  "jester", "organ", "superstar", "trinoids", "whisper", "wobble", "zarvox", "fred",
  "junior", "ralph", "kathy", "eddy", "flo", "grandma", "grandpa", "reed", "rocko",
  "sandy", "shelley",
];
// Voces de sistema que suenan bien (Apple, Google, Microsoft).
const GOOD = [
  "mónica", "monica", "paulina", "jorge", "juan", "diego", "marisol", "francisca",
  "daniel", "samantha", "karen", "serena", "kate", "moira", "arthur", "martha",
];

// 20 nov 2026 — Federico: en inglés salía Samantha (voz de mujer) y "no
// suena a Buddha". La Web Speech API no dice si una voz es de hombre o de
// mujer, así que en inglés se decide por el nombre: primero las voces
// masculinas serias conocidas (Apple, Google, Microsoft), las femeninas
// quedan solo de respaldo. El español no cambia.
const MALE_EN = [
  "daniel", "arthur", "oliver", "aaron", "gordon", "rishi", "evan", "nathan", "tom",
  "alex", "lee", "google uk english male", "microsoft george", "microsoft ryan",
  "microsoft guy", "microsoft david", "microsoft mark", "microsoft andrew",
  "microsoft brian", "microsoft christopher", "microsoft eric", "microsoft thomas",
];
// Orden de preferencia dentro de las masculinas (Daniel: británico, sereno).
function maleRank(name: string): number {
  const i = MALE_EN.findIndex((m) => name === m || name.startsWith(`${m} `) || name.startsWith(`${m}(`));
  return i < 0 ? -1 : MALE_EN.length - i;
}

function voiceScore(v: SpeechSynthesisVoice, nav: string): number {
  const name = v.name.toLowerCase();
  if (NOVELTY.some((n) => name === n || name.startsWith(`${n} `) || name.startsWith(`${n}(`))) {
    return -1;
  }
  let score = 0;
  if (v.lang.toLowerCase().startsWith("en")) {
    const rank = maleRank(name);
    if (rank >= 0) score += 200 + rank;
  }
  if (/premium|enhanced|mejorad|natural|neural/.test(name)) score += 50;
  if (name.startsWith("google")) score += 40;
  if (GOOD.some((g) => name.startsWith(g))) score += 30;
  if (v.lang.toLowerCase().replace("_", "-") === nav) score += 10; // misma variante que el teléfono
  if (v.default) score += 5;
  return score;
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!synth) return undefined;
  const base = lang.slice(0, 2).toLowerCase();
  const nav = (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase();
  let best: SpeechSynthesisVoice | undefined;
  let bestScore = -1;
  for (const v of synth.getVoices()) {
    if (!v.lang.toLowerCase().startsWith(base)) continue;
    const score = voiceScore(v, nav);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  // Si solo hay voces de broma, ninguna: decide el navegador con u.lang.
  return best;
}

// ---------------------------------------------------------------- voz

let nextId = 1;
let current: { id: number; priority: number } | null = null;
let pending: ReturnType<typeof setTimeout> | null = null;
let last: { speech: string; at: number } | null = null;

function isBusy(): boolean {
  return current !== null && (pending !== null || Boolean(synth?.speaking || synth?.pending));
}

// Dice un texto en el idioma del juego. Devuelve un id (para poder callar
// solo lo propio) o null si no se dijo nada.
export function narrate(text: string, opts: NarrateOptions): number | null {
  if (!synth) return null;
  if (!opts.force && (mode === "text" || voiceFailed)) return null;
  const speech = toSpeech(text);
  if (!speech) return null;

  const now = Date.now();
  if (!opts.force && !opts.repeat && last && last.speech === speech && now - last.at < REPEAT_GAP_MS) {
    return null;
  }

  const priority = opts.priority ?? DEFAULT_PRIORITY[opts.source];
  if (!opts.force && isBusy() && current && current.priority > priority) return null;

  const id = nextId++;
  current = { id, priority };
  last = { speech, at: now };

  synth.cancel();
  if (pending) clearTimeout(pending);
  // Chrome a veces descarta un speak() pegado a un cancel(): pausa mínima.
  pending = setTimeout(() => {
    pending = null;
    if (!current || current.id !== id) return;
    const lang = getLang();
    const u = new SpeechSynthesisUtterance(speech);
    u.lang = lang;
    const voice = pickVoice(lang);
    if (voice) u.voice = voice;
    u.rate = 0.95;
    u.onend = () => {
      if (current?.id === id) current = null;
    };
    u.onerror = (e) => {
      if (current?.id === id) current = null;
      // Cortes nuestros (cancel) no son fallos de la voz.
      if (e.error === "interrupted" || e.error === "canceled") return;
      voiceFailed = true;
      emit();
    };
    try {
      synth.speak(u);
    } catch {
      voiceFailed = true;
      emit();
    }
  }, 60);
  return id;
}

// ¿Está Buddha hablando (o a punto de hablar)? GameShell lo usa para no
// retirar un cartel mientras se está leyendo (20 nov 2026).
export function isNarrating(): boolean {
  return isBusy();
}

// Calla. Con id, solo si lo que suena es eso (un cartel que se cierra no
// debe callar una lectura de Buddha que empezó después).
export function stopNarration(id?: number | null): void {
  if (id != null && current?.id !== id) return;
  if (pending) {
    clearTimeout(pending);
    pending = null;
  }
  current = null;
  synth?.cancel();
}

// Para componentes: narra `text` cuando aparece o cambia, y lo calla al
// desmontarse. text null/"" = nada que decir.
export function useNarration(
  text: string | null | undefined,
  opts: NarrateOptions & { delayMs?: number },
): void {
  const { mode: chosen } = useNarrator();
  const idRef = useRef<number | null>(null);
  const { source, priority, delayMs = 0 } = opts;
  useEffect(() => {
    if (!text || chosen === "text") return;
    // 20 nov 2026 — delayMs: deja sonar antes un efecto corto (el siseo de
    // Chat Fandango). En iPad la voz que arranca a la vez lo tapaba.
    if (delayMs <= 0) {
      idRef.current = narrate(text, { source, priority });
      return;
    }
    const timer = window.setTimeout(() => {
      idRef.current = narrate(text, { source, priority });
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [text, chosen, source, priority, delayMs]);
  useEffect(() => () => stopNarration(idRef.current), []);
}

// ---------------------------------------------------------------- iPhone

// Safari en iPhone no deja hablar hasta que el jugador toca la pantalla, y
// los mensajes aparecen después (no dentro del toque). Se desbloquea con
// una frase muda: al elegir VOZ/AMBOS (ese toque ya es el gesto) o, si ya
// venía elegida, en el primer toque. Con TEXTO no se toca la voz para nada.
let unlocked = false;
function unlockVoice(): void {
  if (!synth || unlocked) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    synth.speak(u);
  } catch {
    // sin voz: el texto sigue ahí
  }
}

if (synth && typeof window !== "undefined" && mode !== "text") {
  const onFirstTouch = () => {
    unlockVoice();
    window.removeEventListener("pointerdown", onFirstTouch, true);
  };
  window.addEventListener("pointerdown", onFirstTouch, true);
  try {
    // Algunas voces cargan tarde; pedirlas una vez acelera la primera frase.
    synth.getVoices();
  } catch {
    // ignorar
  }
}
