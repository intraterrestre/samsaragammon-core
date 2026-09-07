# Inventario — el "cerebro" detrás del Buda Azul

Catálogo exacto de todo lo que el código ya calcula, jugada a jugada, y que podría alimentar el panel del Buda. No es un plan de diseño — es el material crudo para diseñarlo.

## Resumen: hay 4 sistemas separados, no uno

El juego trackea comportamiento con **cuatro motores independientes**, calculados en cada jugada, que casi no se hablan entre sí. Antes de esta revisión ninguno llegaba a pantalla completo:

| Sistema | ¿Dónde vive? | ¿Llega a algo hoy? |
|---|---|---|
| 1. Oracle + Mirror | `getGameDerivedState.ts` | Sí llega a GameShell, pero muere en un `console.log("BUDDHA MESSAGE:", ...)` |
| 2. Behavior classifier | `state.behavior` (`behavior.ts`) | No. Ni siquiera se pasa como prop a ningún componente |
| 3. KarmaEngine | `karmaRef` en `App.tsx` | No. El propio código lo marca como "cableado muerto confirmado por grep" |
| 4. Pattern Engine → Nidana | `patternEngine.ts` + `nidanaMapping.ts` | **Sí, esto SÍ funciona** — dispara la moneda-Nidana real en el tablero |

Además hay un quinto archivo, `getKarmaMessage.ts`, completo y sin usar en ningún lado, que consume datos que YA existen sin necesitar cableado nuevo.

---

## 1. Oracle + Mirror (lo que hoy es el "BUDDHA MESSAGE" fantasma)

Fuente: `getGameDerivedState.ts`, combina dos funciones.

### 1a. `oracleText` — mensaje sobre LA ÚLTIMA JUGADA

Prioridad real en `getMasterMessage(capturedPieceKind, meaning, pattern)`:

**Si se capturó un Veneno** (pig/snake/rooster) — 3 frases fijas:
- pig → *"The root was cut."*
- snake → *"Anger loosened."*
- rooster → *"Impulse lost ground."*

⚠️ **Hueco real**: si lo capturado fue un Avatar de reino (hell, asura, deva...) en vez de un Veneno, el `switch` no tiene ese caso ni `default` — cae directo a la sección de abajo. O sea: capturar un Avatar rival NUNCA dispara un mensaje de "purificación", solo capturar un Veneno.

**Si no aplica lo anterior**, según `meaning` de la jugada:
- `"IMPACT"` → *"Force was used."*
- `"RISK"` → *"You moved into uncertainty."*
- cualquier otro → *"You remained within your path."*

**Modificador de patrón** (se pega al final del texto de arriba):
- `pattern < 0` → agrega *" Repetition is forming."*
- `pattern > 1` → agrega *" Balance is emerging."*
- `pattern` 0 o 1 → no agrega nada

Total: **12 combinaciones posibles**, todas en inglés, tono seco/aforístico.

⚠️ **`getMasterMessage` nunca devuelve vacío** — así que el fallback a `karmaOracle()` (más abajo) que está programado en `getGameDerivedState.ts` (`|| fallbackOracleText`) **nunca se ejecuta**. Todo ese sistema, con sus poison/nidana/multiplier, está calculado pero inalcanzable tal como está cableado hoy.

### 1b. `karmaOracle()` — el fallback que nunca se ve (pero tiene MÁS metadata)

Devuelve `{ poison, nidana, multiplier, realm, summary }`. Solo 5 de los 6 `summary` posibles se alcanzan hoy en la práctica (el orden de prioridad es: captura > WANDERING > REACTIVE > STEADY > default):

| Condición | poison | nidana | summary |
|---|---|---|---|
| hubo captura | aversion | Sparsha | "A cutting move sharpens karmic tension." |
| patrón WANDERING | desire | Trishna | "Restless movement feeds craving." |
| patrón REACTIVE | aversion | Bhava | "Reaction hardens into becoming." |
| patrón STEADY | ignorance | Vijnana | "Steady awareness softens the wheel." |
| default (patrón desconocido) | ignorance | Avidya | "The wheel turns in silence." |

Overrides que se aplican DESPUÉS (pueden pisar lo de arriba):
- si `choice === "ECO"` → poison=ignorance, nidana=Avidya, summary="An echo of choice conceals the same outcome."
- si `realm === "HELL"` → solo sube el multiplier +0.05 (no cambia texto)
- si `realm === "HUMANS"` y patrón STEADY → baja el multiplier -0.05
- si `realm === "BUDDHA"` → multiplier fijo 0.9, summary="The wheel loosens its grip."

`multiplier` siempre queda clampeado entre 0.7 y 1.4.

Nota: el tipo `OracleNidana` declara 10 valores posibles (Avidya, Samskara, Vijnana, Sparsha, Vedana, Trishna, Upadana, Bhava, Jati, Jara-Marana) pero la función solo produce 5 de esos 10. Los otros 5 están reservados en el tipo pero sin ninguna rama de código que los genere todavía.

### 1c. `mirrorData` — el patrón GENERAL de juego (no la última jugada)

Fuente: `getMirrorPatternReading({ pattern: state.lastKarma.pattern, decisionSignature })`.

5 lecturas posibles, con título + cuerpo + tags:

| Condición (pattern numérico) | Título | Cuerpo | Tags |
|---|---|---|---|
| `<= -2` | Mirror of Fixation | "One force is beginning to dominate your decisions. Repetition is shaping the path more than awareness." | rigidity, repetition, imbalance |
| `>= 3` | Mirror of Balance | "Your three forces are beginning to move with unusual equilibrium. Variety is no longer random." | balance, variety, coherence |
| `1` o `2` | Mirror of Variation | "You are not trapped in a single creature. Movement is opening into more than one tendency." | variation, opening, shift |
| `-1` o `0`, con >60% de uso de una sola pieza | Mirror of Dependence | "You rely too often on one creature. It may feel efficient, but it narrows the inner field." | dependence, habit, narrowing |
| resto | Mirror of Formation | "The wheel notes your movement, but your pattern is still forming." | forming |

⚠️ La función calcula internamente los **porcentajes reales** de uso de Pig/Snake/Rooster (`pigPct`, `snakePct`, `roosterPct`) para decidir la última rama — pero esos porcentajes NO se devuelven al que llama. Se tiran después de usarlos. Si quisieran una barra tipo "68% Snake / 20% Pig / 12% Rooster" en el panel, hay que exponerlos (cambio de una línea).

`decisionSignature` (por jugador) trae `pigTrace`, `snakeTrace`, `roosterTrace` — contadores acumulados reales, ya en `state.avatarNidana`... digo, en `state.decisionSignature[player]`.

---

## 2. `state.behavior` — el clasificador que nunca se muestra (y es el más rico)

Fuente: `behaviorAfterMove()` en `game/behavior/behavior.ts`, se llama en CADA jugada desde el reducer. Clasifica por **ciclo completado** (una vuelta entera al tablero), no por jugada individual.

Clasificación (prioridad: REACTIVE > AGGRESSIVE > WANDERING > STEADY):
- `reactivityScore >= 0.25` (% de aterrizajes en Naraka) → **REACTIVE**
- si no, `aggressionScore >= 0.25` (% de capturas) → **AGGRESSIVE**
- si no, `wanderingScore >= 0.40` (% de cambios de reino) → **WANDERING**
- si no → **STEADY**

Además trackea, por jugador: `stableStreak` (ciclos seguidos con el mismo patrón) y `lifeStabilized` (true cuando `stableStreak >= 7`) — un logro narrativo real ("tu vida se estabilizó") que hoy no se anuncia en ningún lado.

**Este patrón (STEADY/AGGRESSIVE/REACTIVE/WANDERING) tiene su propio texto ya escrito, en DOS niveles de profundidad**, en `patternCopy.ts`, función `explainPattern(pattern, level)`:

| Patrón | Nivel A (1 línea) | Nivel B (3 líneas) |
|---|---|---|
| STEADY | "You tend to choose stable, low-drama progress." | + "You don't chase constant captures or constant switching." + "This usually creates consistency — but can miss high-impact moments." |
| AGGRESSIVE | "You resolve tension through direct action." | + "Captures and confrontations show up often in your cycle." + "This can be efficient — but it also creates backlash and resets." |
| REACTIVE | "You react strongly when pressure rises." | + "Naraka landings (or returning to Naraka) happen more than usual." + "This can be sharp awareness — or a loop if it repeats." |
| WANDERING | "You explore options and change realms frequently." | + "Realm-switching is high — curiosity drives your movement." + "This finds opportunities, but may reduce long-term stability." |

Ninguna de estas 8 líneas se muestra hoy en ningún lado — ni `explainPattern` se llama desde ninguna parte de la UI, ni `state.behavior` se pasa como prop a nada.

(Hay una SEGUNDA función `explainPattern` en `explain.ts`, con texto distinto — párrafo único en vez de 2 niveles — también sin usar. Duplicado, probablemente una versión vieja.)

---

## 3. KarmaEngine — confirmado muerto por el propio código

`App.tsx` lo instancia (`new KarmaEngine(["P1","P2"])`) y lo alimenta (`.ingest(...)`, `.snapshot(0)`) en cada ROLL, guardando el resultado en `karmaSnap`. Pero el propio comentario en el código dice literalmente: *"karmaSnap (el valor) solo se pasaba a GameShell, que nunca lo declaró en Props ni lo leyó — cableado muerto confirmado por grep"*. No lo catalogué en detalle (363 líneas) porque ya está marcado como descartado — si les interesa reactivarlo en vez de usar los otros 3 sistemas, aviso y lo reviso a fondo.

---

## 4. Lo único que YA funciona: Pattern Engine → Nidana

`patternEngine.ts` trackea 9 tipos de evento real (`capture_bias`, `avoidance_bias`, `realm_stuck`, `realm_hopping`, `naraka_entry`, `avatar_sent_to_mara`, `stability_streak`, `volatility_spike`, `cycle_completed`). De esos, 7 tienen mapeo a una de las 12 Nidanas canónicas (`nidanaMapping.ts`):

| Evento | Nidana |
|---|---|
| avatar_sent_to_mara | DEATH |
| capture_bias | CRAVING |
| avoidance_bias | FEELING |
| realm_stuck | CLINGING |
| stability_streak | FORMATIONS |
| realm_hopping | CONSCIOUSNESS |
| volatility_spike | BECOMING |

(IGNORANCE, NAME_AND_FORM, SIX_SENSES, CONTACT y BIRTH quedan deliberadamente sin mapear — decisión de diseño ya tomada, documentada en el propio archivo.)

Este es el sistema que hace aparecer la moneda-Nidana real en el tablero cuando el motor detecta uno de estos eventos — con enfriamiento (no dos Nidanas seguidas) y usando solo eventos nuevos de la jugada actual. Es la prueba de que este patrón de "evento real → recompensa narrativa visible" ya se hizo bien una vez en este código.

---

## 5. Bonus encontrado: `getKarmaMessage.ts` — listo para usar, cero cableado extra

Función pura, completa, sin ningún uso en el proyecto. Consume `state.lastKarma` (el mismo objeto que YA se calcula cada jugada vía `computeKarmaTurn` — `{ combo, context, realm, total }`), sin necesitar ningún dato nuevo:

| Condición | Título | Cuerpo | Tono |
|---|---|---|---|
| `combo >= 8` | Explosive combination | "Two strong forces met. Power rose fast." | high |
| `context > 0 && total >= 4` | Impact with gain | "You acted with force and the turn gained weight." | high |
| `realm < 0 && total <= 0` | Heavy terrain | "The realm resisted you. Not every move can bloom here." | low |
| `realm > 0 && total >= 1` | Favorable passage | "The realm supported your move. Flow increased." | mid |
| `combo > 0 && total > 0` | Useful combination | "Your forces combined with some coherence." | mid |
| `total <= 0` | Low-yield move | "The move happened, but little opened." | low |
| resto | Small shift | "A modest move. The wheel still turns." | mid |

`combo` mide si encadenaste piezas distintas jugada tras jugada (pig+rooster=3, pig+snake=5, snake+rooster=8 — combos crecientes). Es información nueva, no se solapa con nada de arriba.

---

## Duplicados / código muerto notado de paso

- `getPurificationMessage.ts`: reimplementa exactamente las mismas 3 frases pig/snake/rooster que ya están inline en `getMasterMessage`. No aporta nada nuevo, es redundante.
- `explain.ts` vs `patternCopy.ts`: dos funciones `explainPattern` con el mismo nombre, contenido distinto, ninguna usada.

---

## Para la conversación de diseño

Con esto ya se puede decidir con datos reales en la mano:
- **ORACLE** (paso del flujo que propusiste) = `oracleText` (sistema 1a), 12 variantes, sobre la última jugada.
- **MIRROR** = `mirrorData` (sistema 1c), 5 lecturas, sobre el patrón general — PERO el clasificador de `state.behavior` (sistema 2) es más rico y más preciso (4 categorías con nombre propio + 2 niveles de profundidad + streak + "vida estabilizada"). Vale la pena decidir cuál de los dos "espejos" quieren mostrar, o si se combinan.
- Nada de esto trae automáticamente imágenes/iconos de Pig/Snake/Rooster — eso hay que armarlo aparte, con la data de `decisionSignature` (los conteos reales) como fuente.
