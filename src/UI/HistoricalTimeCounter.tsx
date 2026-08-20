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
  // true mientras state.phase === "rolled" (lance de dados + resolución
  // en curso) — el contador se congela exactamente en ese tramo.
  frozen: boolean;
};

const DIGITS = 7;
const TICK_MS = 140;
// v59 (20 agosto 2026) — cuánto de la distancia restante recorre cada
// tick (curva de desaceleración natural: al principio los saltos son
// enormes, cerca del target se van achicando solos sin necesidad de
// calcular un tiempo de llegada).
const STEP_FRACTION = 0.12;
const MIN_STEP = 1;
// Para los tramos ligados a un Avatar real (Bruno→Margot,
// Margot→Oriol, etc.): el cruise NUNCA debe llegar solo al checkpoint
// exacto — ver nota de diseño abajo. Se detiene a este % de la
// distancia del tramo, y el salto final EXACTO ocurre recién cuando
// GameShell reporta que currentAvatarIndex avanzó de verdad.
const CRUISE_HOLDBACK_FRACTION = 0.002;
const FLASH_MS = 1400;

function formatDigits(value: number): string {
  return Math.floor(value).toString().padStart(DIGITS, "0");
}

// v59 (20 agosto 2026) — DECISIÓN DE DISEÑO a marcar con Federico:
// el juego no puede saber POR ADELANTADO en qué momento real (dados,
// clics) va a aparecer el próximo Avatar — depende de las tiradas.
// Por eso el contador nunca "planea" una animación que termine justo
// a tiempo (eso requeriría conocer el futuro). En cambio: mientras
// espera al próximo Avatar, el display SE ACERCA (cruise) al valor del
// checkpoint con una curva de desaceleración natural, pero se detiene
// un poco antes (CRUISE_HOLDBACK_FRACTION) y se queda ahí quieto. En
// el instante real en que el Avatar aparece (currentAvatarIndex sube),
// el display SALTA exactamente al valor canónico del checkpoint, con
// el flash de nombre de era + glow de color. Esto cumple las dos
// reglas de Federico a la vez: "el contador nunca decide cuándo
// aparece el Avatar" y "debe llegar EXACTAMENTE al valor cuando
// aparece" — sin inventar tiempos de llegada imposibles de calcular.
//
// La ÚNICA excepción es el tramo final Whitman → THE PRESENT: no hay
// un séptimo Avatar real que dispare ese salto (Whitman es el último
// de los 6; Nirvana es la condición de VICTORIA, un evento aparte, no
// una aparición de Avatar). Para ese tramo el cruise SÍ llega hasta el
// final y dispara el freeze de "THE PRESENT" por sí solo, unos ticks
// después de que aparece Whitman. Avisado en el chat para que Federico
// confirme si prefiere otro disparador para ese último paso.
export function HistoricalTimeCounter({
  currentAvatarIndex,
  frozen,
}: HistoricalTimeCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [activeColor, setActiveColor] = React.useState(BASE_LED_COLOR);
  const [flash, setFlash] = React.useState<{
    text: string;
    color: string;
  } | null>(null);
  const [isPresent, setIsPresent] = React.useState(false);

  // Último checkpoint YA alcanzado de verdad (no el cruise). -1 = Bruno
  // todavía no apareció.
  const reachedIndexRef = React.useRef(-1);
  const flashTimerRef = React.useRef<number | null>(null);
  const tickTimerRef = React.useRef<number | null>(null);

  // Salto exacto al checkpoint cuando currentAvatarIndex avanza de
  // verdad (evento canónico real: state.cosmicClock.era cambió).
  React.useEffect(() => {
    if (currentAvatarIndex <= reachedIndexRef.current) return;
    if (currentAvatarIndex < 0 || currentAvatarIndex >= HISTORICAL_TIMELINE.length)
      return;

    const entry = HISTORICAL_TIMELINE[currentAvatarIndex];
    reachedIndexRef.current = currentAvatarIndex;

    setDisplayValue(entry.counter);
    if (entry.intensified) setActiveColor(entry.color);

    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    setFlash({ text: entry.eraName.toUpperCase(), color: entry.color });
    flashTimerRef.current = window.setTimeout(() => setFlash(null), FLASH_MS);
  }, [currentAvatarIndex]);

  // Cruise: avanza hacia el próximo checkpoint mientras no esté
  // congelado por los dados y todavía no se llegó al final.
  React.useEffect(() => {
    if (isPresent) return;
    if (reachedIndexRef.current < 0) return; // Bruno no apareció aún

    tickTimerRef.current = window.setInterval(() => {
      if (frozen) return; // PAUSE TIME COUNTER — lance de dados en curso

      const idx = reachedIndexRef.current;
      const isFinalLeg = idx >= HISTORICAL_TIMELINE.length - 1; // Whitman → Present

      const legStart = HISTORICAL_TIMELINE[idx]?.counter ?? 0;
      const legTarget = isFinalLeg
        ? PRESENT_COUNTER
        : HISTORICAL_TIMELINE[idx + 1].counter;

      setDisplayValue((cur) => {
        const diff = legTarget - cur;
        if (diff <= 0) return cur;

        const step = Math.max(MIN_STEP, Math.round(diff * STEP_FRACTION));
        let next = cur + step;

        if (isFinalLeg) {
          if (next >= legTarget) {
            next = legTarget;
            if (flashTimerRef.current)
              window.clearTimeout(flashTimerRef.current);
            setFlash({ text: PRESENT_LABEL, color: "#ffffff" });
            setActiveColor("#ffffff");
            window.setTimeout(() => {
              setFlash(null);
              setIsPresent(true);
            }, FLASH_MS);
          }
        } else {
          // Nunca cruzar solo el checkpoint real — se queda a
          // holdback% de la distancia del tramo, esperando el salto
          // exacto disparado por el otro efecto.
          const legSize = legTarget - legStart;
          const maxReach =
            legTarget - Math.max(1, Math.round(legSize * CRUISE_HOLDBACK_FRACTION));
          next = Math.min(next, maxReach);
        }

        return next;
      });
    }, TICK_MS);

    return () => {
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    };
    // reachedIndexRef.current cambia dentro del otro efecto sin
    // re-render propio — currentAvatarIndex como dependencia alcanza
    // para reprogramar el intervalo con el tramo correcto en cada
    // checkpoint nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozen, isPresent, currentAvatarIndex]);

  React.useEffect(() => {
    return () => {
      if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
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
          <span className="htc-digits">
            {reachedIndexRef.current < 0
              ? formatDigits(0)
              : formatDigits(displayValue)}
          </span>
        )}
      </div>
    </div>
  );
}

export default HistoricalTimeCounter;
