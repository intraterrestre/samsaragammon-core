import type { BasePieceKind } from "./types";

import pigWhite from "../assets/pieces/pig_white.webp";
import roosterWhite from "../assets/pieces/rooster_white.webp";

// v58 (18 agosto 2026) — pedido de Federico: cuando un jugador escoge un
// Veneno, muchos no distinguen bien la ficha en pantallas chicas ni saben
// qué representa cada una de los Tres Venenos. Este mapa alimenta el
// banner de selección (ver VenomBanner.tsx) con ícono + palabra corta.
//
// Snake: no existe ningún asset de imagen en el repo (busqué .png/.webp
// en src/assets/pieces y en todo src, no hay ninguno) — Federico pidió
// "poner una culebra, la que tenga" como solución provisoria, así que
// se usa el emoji 🐍 en vez de una imagen. Reemplazable después: basta
// con importar el archivo real y asignarlo a `icon` cuando exista.
export type PoisonMeta = {
  label: string;
  // Ruta de imagen importada (pig/rooster) o un emoji de texto plano
  // (snake, provisorio). VenomBanner.tsx distingue cuál es con isEmoji().
  icon: string;
};

export const POISON_META: Record<BasePieceKind, PoisonMeta> = {
  pig: { label: "IGNORANCE", icon: pigWhite },
  snake: { label: "ANGER", icon: "🐍" },
  rooster: { label: "IMPULSE", icon: roosterWhite },
};
