# NIDANA CIRCUMSTANCES LAB — Auditoría y propuesta experimental

> **ESTADO: AUDITORÍA Y PROPUESTA EXPERIMENTAL. NO ES UNA ESPECIFICACIÓN APROBADA.**
> Nada de este documento está implementado ni debe implementarse hasta que Federico apruebe el modelo mecánico.
> Las consecuencias y grados aquí descritos son **posibilidades técnicas**, no reglas del termómetro.
> La biblioteca doctrinal y narrativa (216 textos) se diseña por separado. Aquí no hay textos de relleno.

- Fecha: 17 nov 2026
- Código auditado: `main` @ `5007cec` (16 nov 2026)
- Alcance: 12 Nidanas × 6 Avatares × 3 Venenos = 216 combinaciones narrativas, con pocas consecuencias jugables, inmediatas y legibles.

---

## 0. Modelo de dos interacciones (decisión de Federico, 17 nov)

| Momento | Qué ocurre | Naturaleza |
|---|---|---|
| **Antes de recoger** | Un signo **?** sobre la Nidana alcanzable informa qué circunstancia asumiría ese Avatar (sus 3 filas, una por Veneno). | Solo informativo. No cambia nada. |
| **Mientras la porta** | Cada vez que el Avatar portador **actúa con un Veneno**, la combinación Avatar + Nidana + Veneno determina una consecuencia que se resuelve **dentro de esa misma jugada**. | Mecánico. Sin efectos pendientes, sin contadores, sin turnos extra. |

La Nidana es una **circunstancia persistente**: la consecuencia no se dispara una vez al recogerla, sino en cada acción del portador mientras la lleve.

---

## 1. Inventario del motor actual (reutilizable)

### 1.1 Ciclo de vida de una Nidana (`src/game/state/reducer.ts`)

- **Aparición**
  - Cada 3 lances globales (`ROLL`, `nextRollCount % 3 === 0`), en casilla al azar.
  - Por eventos `avatar_sent_to_mara` / `realm_stuck` del Pattern Engine, cerca de `finalToPos`.
  - `pickUnusedNidana` evita repetidas: nunca más de 12 en el mundo.
- **Recogida** (`CONSCIOUS_MOVE`, bloque "Paso 1 — recoleccion"): exige tres cosas.
  1. El Avatar aterriza **exacto** en la casilla (`finalToPos`).
  2. `canonicalRealmFromPos(casilla) === Avatar` (recogida por reino).
  3. El Avatar no porta ya otra.
  - Los Venenos nunca recogen.
- **Transporte**: `avatarNidana[player][avatar]`, una por Avatar.
- **Pérdida y transferencia**
  - **Escudo**: si se captura a un Avatar portador, no va a Mara. Se reubica hacia delante (`findEmptySpawnPos` + `forwardStep(color)`), pierde la Nidana y no recibe `everCaptured`.
  - **Robo**: la Nidana pasa al atacante si es un Avatar sin Nidana. Si no, queda suelta en `finalToPos`.
  - **Trade de Fandango** (`ACCEPT_TRADE_OFFER`): intercambio 1×1.
  - **Square Karma 666**: el stake de 2 Nidanas se identifica, pero el pago **no está resuelto** (TODO en `snakeBet.ts`).
- **Links** (`FORM_LINK`): solo declarativos, sin efecto mecánico.
- **Límite conocido**: `findEmptySpawnPos` no sabe de Nidanas, así que una que nace puede pisar a otra suelta.

### 1.2 Avatar y Veneno de cada movimiento

- `MoveOption.pieceKind` indica el Avatar que se mueve.
- `MoveOption.venomId` indica el Veneno cuyo origen generó el destino. Ese Veneno **viaja con el Avatar** (reducer, bloque "v3 — Actualización Crítica").
- `LastMove` guarda `avatarId`, `venomUsed`, `fromRealm` y `toRealm`.
- ⚠️ **Colisión de nombres.** El *impulso posicional* ROOSTER/SNAKE/PIG (`rules/venomImpulse.ts`) depende del apilamiento y no del Veneno elegido. El "Veneno" de este laboratorio es siempre `option.venomId`, que es también lo que usa Square Karma 666.

### 1.3 Opciones legales antes de jugar

`getAllLegalMoves(state, player)` (`rules/legalMoves.ts`) devuelve `{avatar, venom, option}`, donde `option` incluye `choice` (A/B/ECO/AB), `value`, `fromPos`, `toPos` y `meaning` (IMPACT/RISK/SAME).

Filtros que ya aplica `getMoveOptionsForPlayer`:
- Bloqueo con 2+ Avatares enemigos.
- ROOSTER: no puede volver a apilarse.
- SNAKE: no puede capturar si estaba solo.
- PIG: Avatar forzado tras volver de Mara.
- AB solo con `level >= 3`.

El reducer revalida cada jugada con esa misma función. **Todo efecto que cambie la legalidad debe vivir ahí**, para que UI, bot y reducer coincidan.

### 1.4 Ganchos de UI para el "?"

- `boardNidanaTokens` (`Board.tsx`) dibuja cada Nidana suelta y abre `enlargedNidana` al hacer clic.
- `hoveredOption` marca la casilla destino, pero **solo está activo en `beginnerMode`** (`GameShell.tsx`).
- `MoveOptionsPanel` lista las opciones.

---

## 2. Dato de laboratorio: las Nidanas ya son el freno principal

Simulación Buddha contra Buddha (`tools/lab/labVariants.ts`, nivel normal, semillas desde 1, tope de 3000 turnos):

| Variante | Partidas | Con ganador | Turnos (mediana) | Capturas de Avatar (mediana) |
|---|---|---|---|---|
| `base` | 40 | 31 | 1338 | 235 |
| `sinNidanas` | 33\* | 10 | 3000 (tope) | 914 |

\* Se cortó por tiempo a las 33 partidas.

**Lectura.** Hoy el escudo de las Nidanas reduce las capturas de Avatar a una cuarta parte, y es lo que permite que las partidas terminen.

**Consecuencia para el diseño.** Toda consecuencia que **aumente capturas o visitas a Mara, o que quite escudos**, alargará la partida de forma desproporcionada. El termómetro debe estar centrado, o ligeramente sesgado, hacia la contención.

Las cifras son turnos de bot y solo sirven como **comparación relativa**, no como duración real con humanos.

---

## 3. Variables existentes que pueden formar un termómetro

Criterio: cada palanca se calcula a partir del estado **al inicio de la jugada** (`avatarNidana` del portador + `venomId` de la opción) y se resuelve dentro de `CONSCIOUS_MOVE` o al generar opciones. Ninguna requiere contador, estado temporal ni turno nuevo.

| # | Palanca | Dónde vive hoy | Tipo | Efecto en duración | Riesgo principal |
|---|---|---|---|---|---|
| L1 | **Opciones de destino**: qué choices A/B/ECO/AB se generan para el portador | `pushOptionsFromOrigin` | Legalidad (visible antes de jugar) | Neutro o leve | AB depende de `level`. Menos opciones puede llevar a PASS. |
| L2 | **Permiso de captura**: el portador puede o no producir IMPACT con ese Veneno (puede quitar o levantar la restricción SNAKE) | `pushMoveIfLegal` (ya filtra SNAKE) | Legalidad | Quitar captura acorta; levantar SNAKE alarga | Sin IMPACT no hay oportunidad de **Dharma 777** con esa opción |
| L3 | **Destino de la víctima**: Mara normal, Mara con estancia más corta (`maraLevel` de entrada > 1; hoy entra en 1 y sale al pasar de 6) o reubicación sin Mara (camino del escudo) | Bloque de captura de `CONSCIOUS_MOVE` | Post-jugada | Más corto o sin Mara acorta | Decidir `everCaptured` (hoy solo con Mara real) |
| L4 | **Escudo y robo**: qué pasa con la Nidana de la víctima (robo, caída o destrucción) | Bloque "Paso 2 — escudo Nidana" | Post-jugada | Destruir alarga (menos escudos) | Stake de 666 y trades pendientes |
| L5 | **Viaje del Veneno**: el Veneno de la opción acompaña al Avatar o se queda en su origen | Bloque "v3", `nextPieces[me][venomId].pos` | Post-jugada | Neutro (cambia los orígenes del próximo turno) | Sutil: poco legible para el jugador |
| L6 | **Persistencia de la propia Nidana**: el portador la conserva, o la deposita en `finalToPos` tras actuar | `nextAvatarNidana` / `nextBoardNidanas` | Post-jugada | Perder el escudo alarga | Afecta la elegibilidad de 666 (`carriedCount >= 2`) y los links |
| L7 | **Empuje**: reubicar hacia delante una pieza rival suelta y adyacente (±1) | `findEmptySpawnPos` + `forwardStep(color)` | Post-jugada | Neutro | Limitarlo a **Venenos**, nunca Avatares (para no tocar Humans ni la victoria) |

### Variables excluidas a propósito (no tocar)

- Umbral de bloqueo 2+: protege el apilamiento final en Humans.
- `consolidatedAvatars`, auto-consolidación y `everCaptured` directos.
- `snakeBet`, `pendingSnakeBet` y `DECLARE_DHARMA_777`.
- `checkNirvana` y `countNirvanaFormationProgress`.
- Cadencia global de spawn (cada 3 lances): no es por combinación.
- Posición de renacimiento de Mara (siempre fuera de Humans).
- `justReturnedFromMara` (PIG): es un estado temporal y no debe reutilizarse.

---

## 4. Borrador de termómetro de 5 grados (hipótesis, no regla)

Cada una de las 216 combinaciones tendría **un grado**. Como el Veneno se elige en cada jugada, el portador ve sus tres grados posibles (uno por Veneno) y **elige la tensión al elegir el Veneno**.

| Grado | Nombre provisional | Palancas candidatas | Duración esperada |
|---|---|---|---|
| 1 | Contención | L2: el portador no puede capturar con este Veneno | Acorta |
| 2 | Suavidad | Captura permitida, pero la víctima se reubica hacia delante sin Mara (L3) | Acorta |
| 3 | Neutral | Reglas actuales (grupo de control) | — |
| 4 | Presión | L2 inverso (puede capturar aunque esté solo) **o** L7 (empuje de un Veneno adyacente) | Alarga |
| 5 | Ruptura | Acción normal y luego el portador suelta su Nidana en `finalToPos` (L6): pierde el escudo | Alarga |

Antes de fijar la escala hay que medir **cada grado por separado** como variante uniforme (por ejemplo, "todo portador actúa en G4") contra `base`. El reparto final de los 216 grados se ajusta con esas cifras para que la media quede cerca de la duración actual.

---

## 5. Reglas de resolución propuestas (para cualquier grado)

1. **Quién actúa**: solo `CONSCIOUS_MOVE` con `pieceKind` igual a un Avatar que porta Nidana **al inicio de la jugada** (`state.avatarNidana`) y `option.venomId` definido.
   - Quedan fuera PASS, Dharma 777 (es una renuncia, no una acción con Veneno), los trades y los Venenos moviéndose solos (Fase 1).
2. **La jugada de recogida se resuelve normal.** La circunstancia empieza a actuar en la **siguiente** acción del portador. Así el "?" es puramente informativo y la legalidad se calcula siempre sobre el estado previo.
3. **Legalidad (L1, L2)** en `getMoveOptionsForPlayer`, para que el "?", el bot y la validación del reducer coincidan.
4. **Efectos post-jugada (L3–L7)** en un único punto de `CONSCIOUS_MOVE`: después del movimiento, la captura y la recogida, y **antes** de `checkNirvana`.
5. **Prohibido**: marcar `didCapture` sin captura real, tocar Avatares que estén en Humans, escribir en `snakeBet` o `consolidatedAvatars`, o crear campos persistentes.
6. **Simetría**: toda reubicación usa `forwardStep(color)` (protegido por `symmetry.test.ts`).

---

## 6. El signo "?" (antes de recoger)

Se puede calcular con una **función pura**, sin estado nuevo:

```ts
// Para una Nidana suelta en la casilla c:
const avatar = canonicalRealmFromPos(c);            // el único Avatar que puede recogerla
const rows = (["pig", "snake", "rooster"] as const)
  .map((venom) => CIRCUMSTANCES[`${nidana}:${avatar}:${venom}`]); // 3 grados

// ¿Alcanzable ahora? Para cada move de getAllLegalMoves(state, player):
const reachable = move.avatar === avatar
  && move.option.toPos === c
  && !state.avatarNidana[player][avatar];
```

Estados útiles del "?":
- **Alcanzable ahora**, y con qué Veneno.
- **Ese Avatar ya porta otra Nidana**: no puede recogerla.
- **Ese Avatar todavía no ha nacido**: típico de Deva/Whitman y Humans/Marino.

Hace falta que `hoveredOption`, o un marcador propio, funcione también fuera de `beginnerMode`.

---

## 7. Posibilidades técnicas catalogadas (auditoría anterior)

Siguen siendo opciones, no reglas. Cada una corresponde a una o varias palancas:

| Posibilidad | Palanca |
|---|---|
| Sin efecto (solo escudo) | Control (G3) |
| Empuje de un Veneno rival adyacente | L7 |
| Mara breve para un Veneno rival adyacente | L3 aplicado a un Veneno no capturado (alarga: requiere medición) |
| Regreso inmediato de un Veneno propio desde Mara | Fuera de Humans y **sin** marca PIG |
| Desnudar al Avatar espejo rival (su Nidana cae) | L4 / L6 |

---

## 8. Interferencias

- **Square Karma 666**
  - Hoy *cualquier* captura con `venomId === "snake"` del apostador gana la apuesta, no solo una sobre el objetivo. Los grados que conserven la captura (incluida la reubicación de G2, igual que el escudo actual) mantienen `didCapture`, igual que hoy.
  - L6 y L4 pueden dejar el `stake` apuntando a Nidanas ya no portadas, o bajar de 2 Nidanas portadas, lo que afecta a la elegibilidad. Hoy no rompe nada porque el pago no está resuelto, pero condiciona esa decisión.
- **Dharma 777**: exige una opción IMPACT legal sobre un Avatar rival en Humans. **G1 (L2) elimina esas oportunidades** para ese Veneno. Hay que decidir si G1 hace excepción a esa situación o si se acepta.
- **Consolidación**: una víctima Avatar reubicada sin Mara (G2) **no** pierde el camino al loto. En el final hace que capturar en Humans sea inofensivo, con menos tensión final. Una víctima enviada a Mara sí pierde el loto (`everCaptured`).
- **Victoria**: ninguna palanca debe mover Avatares dentro o fuera de Humans. L7 queda restringida a Venenos.
- **Bot**: `buddhaBot` ve los efectos porque simula con el reducer, pero `sideScore` no valora las Nidanas ni el escudo.

---

## 9. Riesgos de equilibrio y duración

- El escudo ya es la mecánica de Nidana más fuerte (ver sección 2). Los grados 4 y 5 se suman a quitarle peso y pueden disparar la duración.
- **Cobertura desigual de las 216**: Deva/Whitman y Humans/Marino nacen tarde, así que sus 72 combinaciones (2 Avatares × 12 × 3) apenas se verán. Las de Bruno serán las más frecuentes.
- **Frecuencia alta**: spawn cada 3 lances y consecuencia en *cada* acción del portador. Un grado extremo mal colocado se repetirá muchas veces por partida.
- **Legibilidad**: L5 (viaje del Veneno) es casi invisible para un humano. Conviene preferir palancas que se vean en la casilla.

---

## 10. Vestigium (solo hechos, sin inferencias)

Hoy Vestigium solo guarda agregados en localStorage (`FinalVestigium`). Eventos factuales candidatos:

- `NIDANA_SPAWNED { nidana, pos, realm, trigger }`
- `NIDANA_PREVIEW_AVAILABLE { player, nidana, avatar, venoms[] }` (había un "?" alcanzable)
- `NIDANA_PICKED { player, avatar, venom, nidana, pos, globalRoll }`
- `NIDANA_STOLEN | NIDANA_DROPPED | NIDANA_TRADED { from, to, nidana, pos }`
- `CIRCUMSTANCE_APPLIED { player, avatar, nidana, venom, grade, effect, target?, pos }`
- `CIRCUMSTANCE_OPTIONS { player, gradesAvailable[], gradeChosen }` (qué grados tenía a mano y cuál usó)

Deben quedar separados del Pattern Engine, que sí etiqueta psicológicamente (por ejemplo, capture_bias → CRAVING).

---

## 11. Forma de datos propuesta (sin textos)

```ts
type TensionGrade = 1 | 2 | 3 | 4 | 5;
type CircumstanceKey = `${NidanaId}:${RealmPieceKind}:${BasePieceKind}`; // 216 claves

// Tabla mecánica: solo el grado
export const CIRCUMSTANCE_GRADE: Partial<Record<CircumstanceKey, TensionGrade>>;

// Tabla narrativa: archivo aparte, diseñado por separado
export const CIRCUMSTANCE_TEXT: Partial<Record<CircumstanceKey, string>>;
```

Las combinaciones que falten equivalen a G3 (neutral). Así se puede probar una sola Nidana sin rellenar las 216.

---

## 12. Prueba mínima: 1 Nidana × 18

1. Rellenar `CIRCUMSTANCE_GRADE` solo para una Nidana (18 claves: 6 Avatares × 3 Venenos). Elegir el grado por Veneno para empezar.
2. Activar con un flag en `GameConfig` (por ejemplo `nidanaLab`). Desactivado, el juego queda idéntico.
3. Implementar solo las palancas de los grados usados en esas 18 filas.
4. Añadir el "?" con la función pura de la sección 6.
5. Medir:
   - **vitest**: los 18 casos con `createState` + overrides; espejo P1/P2; que 666/777/victoria no cambian.
   - **Laboratorio**: primero cada grado como variante uniforme contra `base`; luego la variante "1 Nidana" contra `base`. Medir turnos, capturas, Mara, combinaciones realmente vistas y frecuencia del "?".

---

## 13. Decisiones abiertas (para Federico)

1. ¿La escala de 5 grados va de **contención a ruptura** (como en la sección 4) o mide otra cosa?
2. ¿Qué palancas son aceptables como "lenguaje" del termómetro? (L5 probablemente no, por invisible.)
3. ¿G1 respeta las oportunidades de Dharma 777 o las elimina?
4. ¿La víctima reubicada sin Mara (G2) conserva su camino al loto, igual que con el escudo actual?
5. ¿El grado depende del Veneno (3 verbos fijos) o se reparte libremente en las 216?
6. ¿Qué Nidana se usa para la prueba de 18?
