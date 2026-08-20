import React from "react";
import "./HistoricalTimeCounter.css";
import {
  HISTORICAL_TIMELINE,
  PRESENT_COUNTER,
  PRESENT_LABEL,
  BASE_LED_COLOR,
} from "../game/historicalClock";

type HistoricalTimeCounterProps = {
  // Índice del avatar actual en AVATAR_ORDER, -1 si Bruno no apareció
  // todavía. GameShell.tsx es el único traductor cosmicClock.era -> índice.
  currentAvatarIndex: number;
  // true mientras state.phase === "rolled" — ya no controla si el
  // contador avanza (ver v61 más abajo), solo un leve atenuado visual
  // mientras el dado está en el aire.
  frozen: boolean;
  // v61 (20 agosto 2026) — pedido de Federico: heartbeat de UN lance
  // de dados real ya resuelto. GameShell pasa state.lastMove?.at ?? 0
  // (timestamp que ya existe en el reducer, cambia una vez por cada
  // movimiento real completado) — no hace falta plumbing nuevo en el
  // reducer, es el mismo evento que ya usan el watcher de Jesús y los
  // Nidanas para "algo real acaba de pasar en el juego".
  moveSignal: number;
};

const DIGITS = 7;
const FLASH_MS = 1400;

// v61 (20 agosto 2026) — pedido de Federico: el contador ya NO avanza
// con una animación continua por tiempo. Avanza UNA VEZ por cada lance
// de dados real resuelto (moveSignal), con un salto random — nada de
// números redondos. El tamaño del salto es un % del tramo total (no un
// número fijo), para que el mismo mecanismo sirva para cualquier
// checkpoint sin que Federico tenga que dar un rango a mano por cada
// uno: Bruno→Margot mide 2.500.000 años, 2%-4% de eso da exactamente
// el rango que pidió (50.000–100.000); Margot→Oriol mide apenas
// 10.000, así que el mismo 2%-4% da saltos de 200-400 años — mismo
// "sistema", escalado al tamaño real de cada tramo.
const STEP_FRACTION_MIN = 0.02;
const STEP_FRACTION_MAX = 0.04;

// Igual que antes: el cruise nunca debe tocar solo el checkpoint real
// — se detiene un poco antes y ahí se queda (aunque sigan llegando
// lances) hasta que el Avatar aparece de verdad y dispara el salto
// exacto. Confirmado con la captura de pantalla de Federico: quedó
// parado en 2.495.000 (exactamente holdback 0.2% de 2.500.000 =
// 5.000 antes del checkpoint) mientras seguía jugando.
const CRUISE_HOLDBACK_FRACTION = 0.002;

function formatDigits(value: number): string {
  return Math.floor(value).toString().padStart(DIGITS, "0");
}

function randomStep(legSize: number): number {
  const min = Math.max(1, Math.round(legSize * STEP_FRACTION_MIN));
  const max = Math.max(min, Math.round(legSize * STEP_FRACTION_MAX));
  return min + Math.floor(Math.random() * (max - min + 1));
}

// v59/v61 (20 agosto 2026) — DECISIÓN DE DISEÑO a marcar con Federico:
// el juego no puede saber POR ADELANTADO en qué lance real va a
// aparecer el próximo Avatar. Por eso el contador nunca "planea" una
// animación que termine justo a tiempo. En cambio: cada lance real
// resuelto (moveSignal) SUMA un salto random hacia el checkpoint, pero
// se detiene un poco antes (CRUISE_HOLDBACK_FRACTION) y se queda ahí
// quieto aunque sigan llegando lances. En el instante real en que el
// Avatar aparece (currentAvatarIndex sube), el display SALTA
// exactamente al valor canónico del checkpoint, con flash de nombre
// de era + glow de color. Cumple las dos reglas de Federico: "el
// contador nunca decide cuándo aparece el Avatar" y "debe llegar
// EXACTAMENTE al valor cuando aparece".
//
// v61: el arranque YA NO espera al evento real de "Bruno apareció"
// (eso tarda varios lances — recién ocurre cuando el jugador ya movió
// los 3 Venenos). Ahora arranca en el PRIMER lance real de toda la
// partida: ese primer lance solo "despierta" el contador (queda en
// 0000000, el valor de Bruno de todas formas), y desde el SEGUNDO
// lance en adelante ya suma los saltos random hacia Margot. Cuando el
// evento real de Bruno llega más tarde (currentAvatarIndex pasa a 0),
// ya no reinicia nada — el guard de abajo lo detecta y lo ignora, así
// no hay salto hacia atrás a 0 en medio de la partida.
//
// La ÚNICA excepción sigue siendo el tramo final Whitman → THE
// PRESENT: no hay un séptimo Avatar real que dispare ese salto
// (Whitman es el último de los 6; Nirvana es la condición de
// VICTORIA, un evento aparte). Para ese tramo el cruise SÍ llega hasta
// el final por sí solo y dispara el freeze de "THE PRESENT".
export function HistoricalTimeCounter({
  currentAvatarIndex,
  frozen,
  moveSignal,
}: HistoricalTimeCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [activeColor, setActiveColor] = React.useState(BASE_LED_COLOR);
  const [flash, setFlash] = React.useState<{
    text: string;
    color: string;
  } | null>(null);
  const [isPresent, setIsPresent] = React.useState(false);

  // Último checkpoint YA alcanzado de verdad (no el cruise). -1 =
  // todavía no hubo ningún lance real en la partida.
  const reachedIndexRef = React.useRef(-1);
  const flashTimerRef = React.useRef<number | null>(null);
  const lastMoveSignalRef = React.useRef(moveSignal);
  const hasStartedRef = React.useRef(false);

  function flashEra(text: string, color: string) {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    setFlash({ text, color });
    flashTimerRef.current = window.setTimeout(() => setFlash(null), FLASH_MS);
  }

  // Salto exacto al checkpoint cuando currentAvatarIndex avanza de
  // verdad (Margot en adelante — Bruno se maneja en el efecto de abajo
  // porque su arranque ya no depende de este evento, ver v61 arriba).
  React.useEffect(() => {
    if (currentAvatarIndex <= reachedIndexRef.current) return;
    if (currentAvatarIndex < 0 || currentAvatarIndex >= HISTORICAL_TIMELINE.length)
      return;

    const entry = HISTORICAL_TIMELINE[currentAvatarIndex];
    reachedIndexRef.current = currentAvatarIndex;

    setDisplayValue(entry.counter);
    if (entry.intensified) setActiveColor(entry.color);
    flashEra(entry.eraName.toUpperCase(), entry.color);
  }, [currentAvatarIndex]);

  // Un paso por cada lance real resuelto.
  React.useEffect(() => {
    if (moveSignal === 0) return; // todavía no hubo ningún lance real
    if (moveSignal === lastMoveSignalRef.current) return; // mismo lance, no duplicar
    lastMoveSignalRef.current = moveSignal;

    if (!hasStartedRef.current) {
      // Primer lance real de toda la partida: solo despierta el
      // contador en 0000000 (valor de Bruno) — no incrementa todavía.
      hasStartedRef.current = true;
      reachedIndexRef.current = 0;
      setDisplayValue(HISTORICAL_TIMELINE[0].counter);
      flashEra(HISTORICAL_TIMELINE[0].eraName.toUpperCase(), HISTORICAL_TIMELINE[0].color);
      return;
    }

    if (isPresent) return;

    const idx = reachedIndexRef.current;
    const isFinalLeg = idx >= HISTORICAL_TIMELINE.length - 1; // Whitman → Present

    const legStart = HISTORICAL_TIMELINE[idx]?.counter ?? 0;
    const legTarget = isFinalLeg
      ? PRESENT_COUNTER
      : HISTORICAL_TIMELINE[idx + 1].counter;
    const legSize = legTarget - legStart;

    setDisplayValue((cur) => {
      const diff = legTarget - cur;
      if (diff <= 0) return cur;

      const step = Math.min(diff, randomStep(legSize));
      let next = cur + step;

      if (isFinalLeg) {
        if (next >= legTarget) {
          next = legTarget;
          flashEra(PRESENT_LABEL, "#ffffff");
          setActiveColor("#ffffff");
          window.setTimeout(() => {
            setFlash(null);
            setIsPresent(true);
          }, FLASH_MS);
        }
      } else {
        // Nunca cruzar solo el checkpoint real — se queda a holdback%
        // de la distancia del tramo, esperando el salto exacto
        // disparado por el otro efecto.
        const maxReach =
          legTarget - Math.max(1, Math.round(legSize * CRUISE_HOLDBACK_FRACTION));
        next = Math.min(next, maxReach);
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSignal]);

  React.useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    };
  }, []);

  const showingFlash = !!flash && !isPresent;
  const glowColor = isPresent ? "#ffffff" : flash?.color ?? activeColor;

  return (
    <div
      className={`htc-wrap${frozen ? " htc-frozen" : ""}`}
      style={{ ["--htc-color" as string]: glowColor }}
    >
      <div className="htc-display">
        {isPresent ? (
          <span className="htc-present">{PRESENT_LABEL}</span>
        ) : showingFlash ? (
          <span className="htc-era-flash">{flash!.text}</span>
        ) : (
          <span className="htc-digits">{formatDigits(displayValue)}</span>
        )}
      </div>
    </div>
  );
}

export default HistoricalTimeCounter;
