# Recovery Manifest — samsaragammon-core
**Fecha de recuperación:** 30 junio 2026  
**Rama de recuperación:** `recovery-30-june`  
**Stash original:** `refs/stash` (NO eliminado — intacto)  
**Origen del trabajo perdido:** GitHub Desktop auto-stash del 28 jun 2026 a las 21:36

---

## Historia de commits en esta rama

```
bc05ec8  recovery: stash copies of important files
06bf125  recovery: stash copies of critical files
e8d5574  recovery: new files extracted from stash (styles, SacredProgress, actorProfiles)
882d297  Add animated Dharma bubble and living connector  ← último commit real
```

Para volver a cualquier punto: `git reset --hard <hash>`

---

## PASO 1 — Archivos NUEVOS (extraídos directamente, ya activos en el proyecto)

Estos archivos no existían en el working tree. Se extrajeron tal cual del stash y se añadieron al proyecto. **Están listos para usar.**

| Archivo | Líneas | Estado |
|---------|--------|--------|
| `src/styles/base.css` | 70 | ✅ Activo |
| `src/styles/board.css` | 292 | ✅ Activo |
| `src/styles/coins.css` | 119 | ✅ Activo |
| `src/styles/layout.css` | 44 | ✅ Activo |
| `src/styles/mobile.css` | 17 | ✅ Activo |
| `src/styles/overlays.css` | 608 | ✅ Activo |
| `src/UI/SacredProgress.tsx` | 82 | ✅ Activo |
| `src/UI/SacredProgress.css` | 80 | ✅ Activo |
| `src/game/actors/actorProfiles.ts` | 134 | ✅ Activo |

**Total: 9 archivos nuevos, 1.446 líneas recuperadas.**

---

## PASO 2 — Archivos CRÍTICOS (versión `.stash` para comparación manual)

Estos archivos existen en el working tree con cambios respecto al stash. Se extrajeron con sufijo `.stash` para que puedas compararlos sin sobrescribir nada.

| Archivo actual | Archivo recuperado | Actual | Stash | Δ líneas | Criticidad |
|---|---|---|---|---|---|
| `src/game/Board.tsx` | `src/game/Board.stash.tsx` | 665L | 919L | **+254** | 🔴 Alta |
| `src/game/rules/getMoveOptionsForPlayer.ts` | `...getMoveOptionsForPlayer.stash.ts` | 202L | 223L | +21 | 🔴 Alta |
| `src/game/state/reducer.ts` | `src/game/state/reducer.stash.ts` | 664L | 677L | +13 | 🔴 Alta |
| `src/game/state/state.ts` | `src/game/state/state.stash.ts` | 224L | 238L | +14 | 🔴 Alta |
| `src/game/types.ts` | `src/game/types.stash.ts` | 232L | 242L | +10 | 🔴 Alta |
| `src/UI/GameShell.tsx` | `src/UI/GameShell.stash.tsx` | 480L | 456L | −24 | 🔴 Alta |
| `src/UI/LoginScreen.tsx` | `src/UI/LoginScreen.stash.tsx` | 16L | 57L | +41 | 🟠 Media |

### Qué cambia en cada uno

**`Board.tsx`** (+254L en stash): La versión del stash tiene la lógica completa de stacking de tokens (función `buildStackMap`), rendering de realm pieces en el tablero, y sistema de posicionamiento visual. La versión actual (665L) es significativamente más simple. _Nota: `Board.before-clean.tsx` (958L, también en el proyecto) es incluso más completa que el stash — es probablemente la versión más avanzada del trabajo._

**`getMoveOptionsForPlayer.ts`** (+21L): El stash añade soporte para que las piezas de reino desbloqueadas participen en el movimiento (`activePieceKinds` incluye realm pieces). La versión actual solo mueve las 3 piezas base.

**`reducer.ts`** (+13L): El stash propaga el actor Bruno junto con las piezas base en cada movimiento. Se añade `nextActors` al estado final del reducer.

**`state.ts`** (+14L): El stash inicializa el actor Bruno en el estado inicial y lo incluye en `makeInitialState`.

**`types.ts`** (+10L): El stash añade `ActorPieceState`, `ActorPiecesState` y el campo `actors` a `GameState`. Requiere `actorProfiles.ts` (ya recuperado).

**`GameShell.tsx`** (−24L en stash, es decir el stash es 24 líneas más corto): El stash tiene `SacredProgress` integrado, estados `usedPoisons` y `brunoAwakened`, y la lógica de `handleMove` conectada a ellos. La versión actual tiene una refactorización diferente.

**`LoginScreen.tsx`** (+41L en stash): El stash tiene la pantalla de login completamente rediseñada: imagen de intro, tipografía Cinzel, botón "PROVE IT", fondo negro. La versión actual es un placeholder de 16 líneas.

---

## PASO 3 — Archivos IMPORTANTES (versión `.stash` para comparación manual)

| Archivo actual | Archivo recuperado | Cambio principal |
|---|---|---|
| `src/UI/MaraPanel.tsx` | `src/UI/MaraPanel.stash.tsx` | +11L de lógica en panel Mara |
| `src/fandango/fandango.css` | `src/fandango/fandango.stash.css` | Refactorización de clases CSS |
| `src/App.css` | `src/App.stash.css` | Stash tiene 13L (migrado a `src/styles/`); actual tiene 1094L |
| `vite.config.ts` | `vite.config.stash.ts` | Stash añade `host: true, allowedHosts: true` |
| `index.html` | `index.stash.html` | Stash mejora meta viewport y estructura HTML |

---

## Diffs para revisión manual

Todos los diffs están en `recovery_diffs/`. Ábrelos en cualquier visor (VS Code, GitHub Desktop, FileMerge):

| Diff | Tamaño | Para comparar |
|------|--------|---------------|
| `recovery_diffs/Board.diff` | 14K | El más importante — 254 líneas de diferencia |
| `recovery_diffs/App.css.diff` | 23K | Migración CSS masiva (1081 líneas movidas a src/styles/) |
| `recovery_diffs/GameShell.diff` | 8.8K | SacredProgress + usedPoisons + brunoAwakened |
| `recovery_diffs/getMoveOptionsForPlayer.diff` | 2.1K | Realm pieces en el movimiento |
| `recovery_diffs/LoginScreen.diff` | 1.8K | Pantalla de login rediseñada |
| `recovery_diffs/MaraPanel.diff` | 2.0K | Lógica Mara |
| `recovery_diffs/reducer.diff` | 1.5K | Sistema de actores en reducer |
| `recovery_diffs/state.diff` | 649B | Estado inicial del actor Bruno |
| `recovery_diffs/types.diff` | 1.1K | Tipos del sistema de actores |
| `recovery_diffs/vite.config.diff` | 322B | Host config |
| `recovery_diffs/index.html.diff` | 1.2K | Meta tags |

---

## Versiones de Board.tsx disponibles en el proyecto

| Archivo | Líneas | Origen | Recomendación |
|---------|--------|--------|---------------|
| `src/game/Board.tsx` | 665 | Edición de hoy (15:55) | ⚠️ Incompleta |
| `src/game/Board.old-before-recovery.tsx` | 707 | = commit 882d297 (12 jun) | Referencia del estado base |
| `src/game/Board.stash.tsx` | 919 | Stash de GitHub Desktop (28 jun) | ✅ Trabajo recuperado |
| `src/game/Board.recovered.tsx` | 919 | Intento de hoy a las 12:20 | ≈ igual al stash |
| `src/game/Board.before-clean.tsx` | 958 | Edición de hoy a las 12:33 | ⭐ Más completa de todas |

**Recomendación para Board.tsx:** usar `Board.before-clean.tsx` (958L) como base — tiene 39 líneas extra respecto al stash que probablemente son el trabajo más reciente.

---

## Próximos pasos sugeridos

1. **Revisar `recovery_diffs/Board.diff`** y decidir si `Board.stash.tsx` o `Board.before-clean.tsx` es la versión correcta.
2. **Integrar manualmente los 4 archivos del sistema de actores** (`types.ts`, `state.ts`, `reducer.ts`, usando los `.stash` como guía) — son cambios pequeños y bien delimitados.
3. **Restaurar `LoginScreen.tsx`** desde `LoginScreen.stash.tsx` — es un reemplazo directo.
4. **Revisar `GameShell.stash.tsx`** para recuperar `SacredProgress` + `usedPoisons`.
5. **Merge de `vite.config.stash.ts`** — añadir las 4 líneas de `host/allowedHosts`.
6. Cuando estés satisfecho, hacer `git commit` con los cambios finales en `recovery-30-june` y luego merge a `main`.

---

## Seguridad del stash

```
refs/stash → 6c3fd65 (On main: !!GitHub_Desktop<main>)
```

El stash NO fue tocado en ningún momento de esta recuperación. Para verificar en cualquier momento:
```bash
git log -1 --format="%H %ai %s" refs/stash
# 6c3fd65... 2026-06-28 21:36:14 +0100 On main: !!GitHub_Desktop<main>
```
