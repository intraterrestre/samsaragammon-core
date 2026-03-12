import type { GameState } from "./types";

export type VestigiumSnapshot = {
  at: number; // Date.now()
  lances: number;
  level: number;
  turn: GameState["turn"];
  pos: { P1: number; P2: number };
  captures: { P1: number; P2: number };
  patterns?: { eco?: number; arrastre?: number; impulso?: number };
};

const KEY = "samsara_vestigia_v0";

export function loadVestigia(): VestigiumSnapshot[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVestigium(s: VestigiumSnapshot) {
  const all = loadVestigia();
  all.push(s);

  // límite sano v0 (no infinito)
  const trimmed = all.slice(-12);

  localStorage.setItem(KEY, JSON.stringify(trimmed));
}