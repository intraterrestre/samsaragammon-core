// src/i18n/index.ts — sistema multilingüe mínimo (2 octubre 2026).
//
// Sin librerías: diccionarios planos (en.ts, es.ts) + una función t().
// El idioma se elige así: el que el jugador eligió antes (localStorage)
// o, si nunca eligió, el idioma del navegador; inglés por defecto.
// Vive fuera de GameState a propósito: cada jugador ve su propio idioma,
// también en una partida multijugador.

import { useSyncExternalStore } from "react";
import { en, type Dictionary, type MessageKey } from "./en";
import { es } from "./es";

export type Lang = "en" | "es";

export const DICTIONARIES: Record<Lang, Dictionary> = { en, es };
export const LANGS: Lang[] = ["en", "es"];

const STORAGE_KEY = "samsara_lang_v1";

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as string[]).includes(saved)) return saved as Lang;
  } catch {
    // sin almacenamiento: se usa el idioma del navegador
  }
  const nav = typeof navigator !== "undefined" ? navigator.language : "en";
  return nav?.toLowerCase().startsWith("es") ? "es" : "en";
}

let current: Lang = detectLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // sin almacenamiento: el cambio dura hasta recargar
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type Vars = Record<string, string | number>;

// Traduce una clave en el idioma pedido, rellenando {marcadores}.
export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = DICTIONARIES[lang][key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`
  );
}

// Hook de React: re-renderiza el componente cuando cambia el idioma.
export function useI18n() {
  const lang = useSyncExternalStore(subscribe, getLang, getLang);
  return {
    lang,
    setLang,
    t: (key: MessageKey, vars?: Vars) => translate(lang, key, vars),
  };
}

export type { MessageKey };
