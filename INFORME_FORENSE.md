# Informe Forense — samsaragammon-core
**Fecha del análisis:** 30 junio 2026  
**Estado:** Solo lectura — ningún archivo fue modificado

---

## Diagnóstico en una línea

**El trabajo NO está perdido.** Está íntegro en el git stash (`refs/stash`). Lo creó GitHub Desktop automáticamente el 28 de junio a las 21:36 y sigue ahí. El problema es que el working tree actual tiene un `Board.tsx` de 665 líneas que es *menos completo* que la versión del stash (919 líneas) o que `Board.before-clean.tsx` (958 líneas, la más completa de todas).

---

## Línea temporal reconstruida

| Fecha | Hora | Evento |
|-------|------|--------|
| 12 jun | 11:51 | Último commit real: `882d297` — "Add animated Dharma bubble and living connector" |
| 12 jun | 17:24–17:58 | Sesiones de Claude Code (checkpoints turn/0 a turn/8) — cambios menores en `GameShell.tsx` y `SacredProgress` |
| 12–28 jun | — | **16 días de trabajo sin hacer commit**: `Board.tsx`, CSS, actores, `SacredProgress`, sistema de actores, 6 archivos CSS nuevos, conversión de assets a .webp, etc. |
| 28 jun | 20:36 | Última modificación registrada en archivos clave (`GameShell.tsx`, `Board.tsx`, `state.ts`, `types.ts`…) |
| 28 jun | **21:36** | **GitHub Desktop crea el stash automáticamente** (`!!GitHub_Desktop<main>`) — 175 archivos, 2.089 inserciones, 1.428 eliminaciones. El working tree vuelve al commit `882d297`. |
| 30 jun | 11:11 | Se crea `Board.old-before-recovery.tsx` (707 líneas = versión del commit) |
| 30 jun | 12:20 | Se crea `Board.recovered.tsx` (919 líneas ≈ versión del stash, con un rename menor) |
| 30 jun | 12:33 | Se crea `Board.before-clean.tsx` (958 líneas — la MÁS completa, 39 líneas extra vs. stash) |
| 30 jun | 15:55 | `Board.tsx` se modifica → 665 líneas (versión actual, la más incompleta) |

---

## ¿Qué contiene el stash?

El stash tiene **todo el trabajo del período 12–28 junio**. Los archivos clave:

### Archivos nuevos (no existen en el working tree actual)

| Archivo | Descripción |
|---------|-------------|
| `src/UI/SacredProgress.tsx` | Componente nuevo de progreso Yin-Yang (82 líneas) |
| `src/UI/SacredProgress.css` | Estilos del componente |
| `src/UI/yin-yang-ascension.webp` | Asset de imagen |
| `src/game/actors/actorProfiles.ts` | Sistema de actores nuevo (133 líneas) — perfiles de Bruno, Margot, Marino, Oriol, Rufus, Whitman |
| `src/styles/base.css` | CSS base nuevo |
| `src/styles/board.css` | CSS del tablero (292 líneas) |
| `src/styles/coins.css` | CSS de monedas (119 líneas) |
| `src/styles/layout.css` | CSS de layout (44 líneas) |
| `src/styles/mobile.css` | CSS mobile (17 líneas) |
| `src/styles/overlays.css` | CSS de overlays (608 líneas) |

**El directorio `src/styles/` entero no existe en el working tree actual.**

### Archivos modificados (diferentes entre stash y working tree)

| Archivo | Stash | Actual | Diferencia |
|---------|-------|--------|------------|
| `src/game/Board.tsx` | 919 líneas | 665 líneas | −254 líneas |
| `src/UI/GameShell.tsx` | 456 líneas | 480 líneas | Tiene `SacredProgress`, `usedPoisons`, `brunoAwakened` |
| `src/game/state/state.ts` | Con sistema `actors` | Sin `actors` | Perdido en working tree |
| `src/game/types.ts` | Tipos nuevos | Sin ellos | — |
| `src/game/rules/getMoveOptionsForPlayer.ts` | Modificado | Diferente | — |
| `src/game/state/reducer.ts` | Modificado | Diferente | — |
| `src/App.css` | 13 líneas (movido a `src/styles/`) | 1.095 líneas | Reorganización CSS |

### Assets optimizados (en el stash, ausentes en working tree)

Todos los PNG/JPG fueron convertidos a .webp. El stash tiene las versiones .webp y elimina los originales pesados. Los archivos .png/.jpg *siguen* en el working tree actual (no se perdieron), pero el trabajo de optimización está en el stash.

---

## Estado del Board.tsx — el archivo más confuso

Hay 4 versiones de `Board.tsx` en el proyecto. De menor a mayor completitud:

| Archivo | Líneas | Origen |
|---------|--------|--------|
| `Board.tsx` (actual) | 665 | Creado hoy a las 15:55 — versión incompleta/limpiada |
| `Board.old-before-recovery.tsx` | 707 | = commit `882d297` (junio 12) |
| `Board.recovered.tsx` | 919 | ≈ versión del stash (diferencia: nombre de función `buildUnifiedStackMap` vs `buildStackMap`) |
| **`Board.before-clean.tsx`** | **958** | **La más completa** — tiene 39 líneas extra respecto al stash, incluyendo lógica de realm pieces |
| stash:`Board.tsx` | 919 | La versión guardada en el stash |

**Conclusión:** `Board.before-clean.tsx` (958 líneas, creado a las 12:33 de hoy) es la versión más completa y posiblemente la más reciente del trabajo real. El `Board.tsx` actual (665 líneas, las 15:55) es un intento de limpieza que eliminó código.

---

## Objetos sueltos en el repositorio

`git fsck` encontró 4 commits y 5 blobs "dangling" (huérfanos):

- Los **4 commits** son stashes de migraciones de agentes (junio 12) — trabajo de Claude Code en ramas separadas que luego se fusionaron. No contienen trabajo perdido relevante.
- Los **5 blobs** son versiones intermedias de `GameShell.tsx` (3 versiones, 11.6–11.8 KB cada una) y `DharmaConnector.tsx` (2 versiones). Son snapshots de trabajo en curso, posiblemente más completos que la versión actual de `GameShell.tsx` en el stash.

---

## Opciones de recuperación

### Opción A — Recuperación completa desde el stash (recomendada)

El stash está intacto en `refs/stash`. Para recuperar archivo por archivo sin afectar el working tree:

```bash
# Archivos nuevos que no existen (extracción segura):
git show refs/stash:src/UI/SacredProgress.tsx > src/UI/SacredProgress.tsx
git show refs/stash:src/UI/SacredProgress.css > src/UI/SacredProgress.css
git show refs/stash:src/game/actors/actorProfiles.ts > src/game/actors/actorProfiles.ts

# Crear el directorio src/styles/ y extraer los 6 CSS:
mkdir -p src/styles
git show refs/stash:src/styles/base.css > src/styles/base.css
git show refs/stash:src/styles/board.css > src/styles/board.css
git show refs/stash:src/styles/coins.css > src/styles/coins.css
git show refs/stash:src/styles/layout.css > src/styles/layout.css
git show refs/stash:src/styles/mobile.css > src/styles/mobile.css
git show refs/stash:src/styles/overlays.css > src/styles/overlays.css

# Versión más completa de Board.tsx:
# Ya existe como Board.before-clean.tsx (958 líneas) — revisar y renombrar si se decide usar
```

Para los archivos con diferencias (GameShell, state.ts, types.ts, reducer.ts…), **no hacer `git stash pop`** directamente porque habrá conflictos con el working tree actual. Mejor revisar manualmente o hacer `git show refs/stash:ruta/archivo` y comparar.

### Opción B — Usar Board.before-clean.tsx como Board.tsx definitivo

`Board.before-clean.tsx` (958 líneas) es la versión más completa. Si el `Board.tsx` actual (665 líneas) está roto o incompleto, se puede reemplazar directamente:

```bash
# Solo como referencia — confirmar antes de ejecutar:
cp src/game/Board.before-clean.tsx src/game/Board.tsx
```

### Opción C — Revisar los blobs sueltos de GameShell.tsx

El blob `37e9c725` (11.784 bytes) es la versión más grande de `GameShell.tsx` encontrada en el repositorio — más grande que la del stash (10.940 bytes) y la actual (11.577 bytes). Incluye `SacredProgress`, `usedPoisons`, `brunoAwakened`, y la lógica de `handleMove` completa. Para ver su contenido:

```bash
git cat-file -p 37e9c7256d8ec3a8d87bbd15fe2c64b524eec013 > /tmp/GameShell_mas_completo.tsx
```

---

## Lo que SÍ se perdió permanentemente

**Nada.** Todo el trabajo está en el stash o en archivos del working tree. No hay ningún commit perdido, no hubo `reset --hard` destructivo, no se eliminaron ramas. El stash de GitHub Desktop capturó todo antes de que el working tree se limpiara.

El único riesgo sería si alguien ejecuta `git stash drop` — eso sí borraría el stash. **No hacer `git stash drop` hasta recuperar el trabajo.**

---

## Causa raíz

GitHub Desktop tiene un comportamiento automático que, en ciertas operaciones (cambio de rama, pull, merge), protege el working tree creando un stash automáticamente. El mensaje `!!GitHub_Desktop<main>` es su firma característica. Esto ocurrió el 28 de junio a las 21:36, probablemente al intentar hacer una operación de sincronización con origin. El resultado fue que 16 días de trabajo no guardado en commits quedó "protegido" en el stash pero invisible en el working tree.

**Lección:** cualquier trabajo que no esté en un commit está en riesgo ante operaciones de GitHub Desktop. Hacer `git commit` (aunque sea un WIP) cada día es suficiente para evitarlo.
