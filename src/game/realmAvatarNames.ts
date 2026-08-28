// src/game/realmAvatarNames.ts
// v74 (28 agosto 2026) — nombre de Avatar para cada RealmPieceKind.
// Existía duplicado inline en FandangoWindow.tsx (v72); al agregar
// DevNidanaTool.tsx (que necesita exactamente lo mismo) se extrajo acá
// como única fuente de verdad en vez de mantener dos copias sincronizadas
// a mano. Mismo mapeo que REALM_TOKEN_MAP en Board.tsx (ahí es
// realm→imagen por jugador, acá es realm→nombre, incondicional al
// jugador).
import type { RealmPieceKind } from "./types";

export const REALM_AVATAR_NAME: Record<RealmPieceKind, string> = {
  hungry_ghost: "Bruno",
  hell: "Margot",
  animals: "Oriol",
  humans: "Marino",
  asura: "Rufus",
  deva: "Whitman",
};
