// src/UI/narrator.ts — servicio único de narración de Buddha.
//
// 18 nov 2026, pedido de Federico tras ver a un director de cine sin poder
// leer los carteles en el móvil: Buddha habla con la voz del propio
// teléfono (Web Speech API). Sin servidor, sin audios grabados, sin coste.
// Solo presentación: no lee ni cambia reglas ni motor del juego.
//
// UN selector global por dispositivo (localStorage, como el idioma; nunca
// viaja por GameState):
//   "both"  — texto + voz (por defecto)
//   "voice" — voz; los carteles de lección se reducen a un botón 🔊 ⟳
//   "text"  — solo texto: narración desactivada
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
  return "both";
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
  if (next !== "text" && synth) voiceFailed = false;
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

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!synth) return undefined;
  const voices = synth.getVoices();
  const base = lang.slice(0, 2).toLowerCase();
  const nav = (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase();
  const sameBase = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  // La variante del propio teléfono (es-AR, es-ES, en-GB…), si coincide
  // con el idioma del juego; luego una voz local; luego cualquiera.
  return (
    sameBase.find((v) => nav.startsWith(base) && v.lang.toLowerCase() === nav) ??
    sameBase.find((v) => v.localService) ??
    sameBase[0]
  );
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
  if (!opts.force && last && last.speech === speech && now - last.at < REPEAT_GAP_MS) {
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
export function useNarration(text: string | null | undefined, opts: NarrateOptions): void {
  const { mode: chosen } = useNarrator();
  const idRef = useRef<number | null>(null);
  const { source, priority } = opts;
  useEffect(() => {
    if (!text || chosen === "text") return;
    idRef.current = narrate(text, { source, priority });
  }, [text, chosen, source, priority]);
  useEffect(() => () => stopNarration(idRef.current), []);
}

// ---------------------------------------------------------------- iPhone

// Safari en iPhone no deja hablar hasta que el jugador toca la pantalla, y
// los mensajes aparecen después (no dentro del toque). Al primer toque se
// desbloquea la voz con una frase muda.
if (synth && typeof window !== "undefined") {
  const unlock = () => {
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    } catch {
      // sin voz: el texto sigue ahí
    }
    window.removeEventListener("pointerdown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true);
  // Algunas voces cargan tarde; pedirlas una vez acelera la primera frase.
  synth.getVoices();
}
