# RFC v0.x — Cosmic Clock (Aplazado)

## Estado

Decisión aprobada: la funcionalidad completa del Cosmic Clock queda aplazada hasta que Samsaragammon sea completamente jugable.

No debe implementarse todavía el componente visual, las animaciones, ni la cronología narrativa.

Sin embargo, la arquitectura del juego debe quedar preparada desde ahora para que el sistema pueda añadirse posteriormente sin modificar el Karma Engine, el Orquestador ni el Reducer.

> **Nota de disciplina arquitectónica** (por qué existe este documento): este contrato existe para que un colaborador —humano o IA— no rellene los huecos por iniciativa propia. Este sistema ya está diseñado conceptualmente, pero deliberadamente no se desarrolla todavía. Eso evita inventar cronologías, animaciones o dependencias que luego habría que desmontar.

## Objetivo filosófico

El Cosmic Clock no es un cronómetro.

No mide tiempo de juego. No mide turnos. No mide duración de una partida.

Representa visualmente la inmensidad del tiempo evolutivo recorrido por la humanidad entre una transformación (Avatar) y la siguiente.

Su finalidad es reforzar una de las ideas centrales de Samsaragammon:

La evolución biológica necesitó millones de años. Las estructuras culturales capaces de modificar profundamente la mente humana aparecieron en una fracción mínima de ese tiempo.

El reloj existe para comunicar esa diferencia de escala.

Nunca debe alterar la mecánica del juego.

## Responsabilidades

Cuando el sistema sea implementado en el futuro, tendrá únicamente responsabilidades visuales.

Podrá:

- representar la Era actual;
- representar el progreso dentro de la Era;
- mostrar el tiempo aproximado asociado a dicha Era;
- reproducir transiciones cinematográficas;
- mostrar hitos narrativos.

Nunca podrá:

- decidir cuándo aparece un Avatar;
- modificar el Karma Engine;
- modificar el Orquestador;
- generar eventos;
- disparar acciones del Reducer;
- bloquear la partida.

El Cosmic Clock será un consumidor de estado, nunca un productor de estado.

## Fuente de la verdad

Toda la lógica continuará perteneciendo al sistema actual.

```
Karma Engine
↓
Orquestador
↓
Reducer
↓
Estado del Juego
↓
Cosmic Clock (solo representación)
```

Esta dirección nunca debe invertirse.

## Lo que debe existir desde ahora

El estado global del juego deberá incluir únicamente la información mínima necesaria para soportar el sistema futuro.

Ejemplo conceptual:

```ts
cosmicClock: {
    era: AvatarId,
    progress: number,
    transitionSequence: number
}
```

Descripción:

**era** — Avatar actualmente activo.

**progress** — Valor normalizado entre 0 y 1 que representa cuánto se ha recorrido dentro de la Era.

**transitionSequence** — Contador incremental que aumenta únicamente cuando comienza una nueva Era. Su finalidad será permitir que la interfaz detecte transiciones sin depender de comparaciones complejas.

No debe almacenarse ninguna información visual. No deben almacenarse animaciones. No deben almacenarse años. No deben almacenarse textos.

## Información que NO debe existir todavía

Queda expresamente prohibido implementar en esta fase:

- componente CosmicClock;
- CSS;
- requestAnimationFrame;
- overlays;
- efectos visuales;
- cronología histórica;
- barras de progreso;
- sonidos;
- narraciones;
- textos evolutivos;
- cálculo de millones de años;
- cambio de escalas;
- formateo temporal.

Todo ello pertenece a una fase posterior.

## Cronología futura

La cronología definitiva será definida una vez el Canon quede estabilizado.

Los intervalos temporales estarán asociados a las Eras, no a los turnos.

Ejemplo conceptual:

- Bruno ≈ millones de años
- Margot ≈ cientos de miles de años
- Oriol ≈ decenas de miles de años
- Marino ≈ miles de años
- Rufus ≈ historia reciente
- Whitman ≈ presente

Estas cifras no deben codificarse todavía.

## Razón del aplazamiento

Actualmente el proyecto se encuentra en fase de consolidación de la jugabilidad.

La prioridad absoluta consiste en validar:

- Karma Engine;
- aparición de Avatares;
- revelación del tablero;
- Director;
- capturas;
- Mara;
- Whitman;
- ritmo de las partidas.

Solo cuando el juego resulte sólido y divertido tendrá sentido construir una capa narrativa de alta complejidad como el Cosmic Clock.

Implementarlo antes produciría iteraciones innecesarias y aumentaría el riesgo de acoplar elementos visuales a una mecánica que todavía puede evolucionar.

## Requisitos para la futura implementación

Cuando llegue el momento, el Cosmic Clock deberá cumplir las siguientes condiciones:

1. Ser completamente determinista.
2. No modificar nunca el estado del juego.
3. Derivar toda la información desde el estado existente.
4. Ser eliminable sin afectar la jugabilidad.
5. Respetar la separación entre Canon, lógica y presentación.
6. Mantener un impacto emocional elevado sin introducir nuevas reglas.

## Nota abierta — Génesis y comienzo del Cosmic Clock

Existe una hipótesis narrativa que todavía no debe implementarse.

Es posible que el Cosmic Clock no comience con la manifestación de Bruno, sino con un periodo previo denominado Génesis, durante el cual únicamente existen los Tres Venenos.

En esta interpretación:

- el Génesis representa aproximadamente el proceso evolutivo que conduce a Bruno;
- los Tres Venenos son fuerzas anteriores a la aparición de los Avatares;
- Bruno emerge como culminación de ese proceso, no necesariamente como el inicio del reloj.

Esta idea queda pendiente de validación cuando se diseñe definitivamente el Cosmic Clock.

**No modificar la arquitectura actual ni la lógica del juego basándose en esta nota.**

## Acción requerida en esta fase

Implementar únicamente el estado mínimo descrito anteriormente.

Verificar que el Orquestador actualiza correctamente dicho estado cuando cambia la Era.

No desarrollar ninguna funcionalidad visual adicional.

Una vez completado este trabajo, continuar inmediatamente con el desarrollo del núcleo jugable de Samsaragammon.

---

## Estado de implementación (actualizado por Claude, 2026-08-05)

El estado mínimo ya existe en el código, sin ningún componente visual:

- `GameState.cosmicClock: { era: ActorId; progress: number; transitionSequence: number }` — ver `src/game/types.ts`.
- Valor inicial `{ era: "bruno", progress: 0, transitionSequence: 0 }` — ver `src/game/state/state.ts`. `RESET` vuelve a este valor porque simplemente devuelve `initialState`.
- Actualización — ver `src/game/state/reducer.ts`, caso `CONSCIOUS_MOVE`: cuando `evaluateOrchestrator` (el Orquestador ya existente, `src/game/orchestrator/Orchestrator.ts`) emite `REVEAL_NEXT_AVATAR`, se traduce `avatarStep` (1=Bruno..6=Whitman) a `ActorId` y se escribe `cosmicClock: { era, progress: 0, transitionSequence: transitionSequence + 1 }`. No se agregó ninguna condición de progresión nueva — es un reflejo de una decisión que el Orquestador ya toma por su cuenta.
- `progress` se deja siempre en 0: no existe todavía la cronología definitiva, así que no hay fórmula legítima para calcularlo sin inventar contenido prohibido por este RFC.
- No existe componente `CosmicClock`, ni CSS, ni animaciones, ni textos evolutivos, ni cálculo de años — tal como pide este documento.
