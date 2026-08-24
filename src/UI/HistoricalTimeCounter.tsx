import React from "react";
import "./HistoricalTimeCounter.css";
import {
  HISTORICAL_TIMELINE,
  PRESENT_COUNTER,
  PRESENT_LABEL,
  BASE_LED_COLOR,
} from "../game/historicalClock";

type HistoricalTimeCounterProps = {
  currentAvatarIndex: number;
  frozen: boolean;
  moveSignal: number;
  avatarVideoPlaying: boolean;
};

const DIGITS = 7;
const STEP_FRACTION_MIN = 0.02;
const STEP_FRACTION_MAX = 0.04;
const CRUISE_HOLDBACK_FRACTION = 0.002;

// 2026-08-22, a pedido de Federico: contador de milímetros "en
// paralelo" al de años, misma escala de la regla de 1000mm del intro
// de Genesis (GenesisReveal.tsx) — 0mm = Bruno, 1000mm = el presente.
// Se deriva de displayValue (nunca un estado propio) para que ambos
// contadores avancen exactamente juntos, sin lógica duplicada.
const RULER_TOTAL_MM = 1000;

function formatDigits(value: number): string {
  return Math.floor(value).toString().padStart(DIGITS, "0");
}

function formatMm(value: number): string {
  const clamped = Math.max(0, Math.min(RULER_TOTAL_MM, value));
  const rounded = Math.round(clamped * 10) / 10;
  const [intPart, decPart] = rounded.toFixed(1).split(".");
  return `${intPart.padStart(4, "0")}.${decPart}`;
}

function randomStep(legSize: number): number {
  const min = Math.max(1, Math.round(legSize * STEP_FRACTION_MIN));
  const max = Math.max(min, Math.round(legSize * STEP_FRACTION_MAX));
  return min + Math.floor(Math.random() * (max - min + 1));
}

type EraLabel = { text: string; color: string };

export function HistoricalTimeCounter({
  currentAvatarIndex,
  frozen,
  moveSignal,
  avatarVideoPlaying,
}: HistoricalTimeCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0);
  const [activeColor, setActiveColor] = React.useState(BASE_LED_COLOR);
  const [label, setLabel] = React.useState<EraLabel | null>(null);
  const [isPresent, setIsPresent] = React.useState(false);

  const reachedIndexRef = React.useRef(-1);
  const lastMoveSignalRef = React.useRef(moveSignal);
  const hasRolledOnceRef = React.useRef(false);
  const pendingLabelRef = React.useRef<EraLabel | null>(null);
  const prevVideoPlayingRef = React.useRef(avatarVideoPlaying);
  // 2026-08-23 — reportado por Federico: al llegar a Oriol, el cartel
  // de era ("METAL AGE") aparecia un instante DENTRO de la rueda y era
  // ilegible porque el video de Oriol arrancaba encima. Causa real:
  // App.tsx cambia state.cosmicClock.era (currentAvatarIndex acá) en
  // el mismo momento en que se dispara state.realmAscension, pero el
  // video (activeRealmIntro / avatarVideoPlaying) recien arranca
  // 800ms despues (setTimeout en App.tsx, "dejar sonar la fanfarria
  // antes"). Esta condicion `if (avatarVideoPlaying) {...} else {...}`
  // leia avatarVideoPlaying=false durante esos 800ms y mostraba el
  // cartel de inmediato — para taparlo el video un instante despues.
  // No es un cartel DISTINTO del que aparece despues del video: es el
  // MISMO texto (era.toUpperCase()), solo que quedaba cortado por la
  // aparicion del video antes de poder leerse. Fix: siempre guardar en
  // pendingLabelRef primero, y recien decidir mostrarlo de una vez
  // pasado este margen (mayor al setTimeout de 800ms de App.tsx) leyendo
  // el valor MAS RECIENTE de avatarVideoPlaying vía un ref — si para
  // entonces el video ya arranco, se deja pendiente y lo revela el
  // efecto de abajo cuando el video termina, en vez de mostrarlo y
  // taparlo dos veces.
  const avatarVideoPlayingRef = React.useRef(avatarVideoPlaying);

  React.useEffect(() => {
    avatarVideoPlayingRef.current = avatarVideoPlaying;
  }, [avatarVideoPlaying]);

  React.useEffect(() => {
    if (currentAvatarIndex <= reachedIndexRef.current) return;
    if (currentAvatarIndex < 0 || currentAvatarIndex >= HISTORICAL_TIMELINE.length)
      return;

    const entry = HISTORICAL_TIMELINE[currentAvatarIndex];
    reachedIndexRef.current = currentAvatarIndex;

    setDisplayValue(entry.counter);
    if (entry.intensified) setActiveColor(entry.color);

    const newLabel: EraLabel = { text: entry.eraName.toUpperCase(), color: entry.color };
    pendingLabelRef.current = newLabel;

    const revealIfNoVideoYet = window.setTimeout(() => {
      if (!avatarVideoPlayingRef.current && pendingLabelRef.current === newLabel) {
        setLabel(newLabel);
        pendingLabelRef.current = null;
      }
    }, 900);

    return () => window.clearTimeout(revealIfNoVideoYet);
  }, [currentAvatarIndex]);

  React.useEffect(() => {
    const wasPlaying = prevVideoPlayingRef.current;
    prevVideoPlayingRef.current = avatarVideoPlaying;

    if (wasPlaying === true && avatarVideoPlaying === false && pendingLabelRef.current) {
      setLabel(pendingLabelRef.current);
      pendingLabelRef.current = null;
    }
  }, [avatarVideoPlaying]);

  React.useEffect(() => {
    if (moveSignal === 0) return;
    if (moveSignal === lastMoveSignalRef.current) return;
    lastMoveSignalRef.current = moveSignal;

    if (hasRolledOnceRef.current === false) {
      hasRolledOnceRef.current = true;
      const bruno = HISTORICAL_TIMELINE[0];
      setLabel({ text: bruno.eraName.toUpperCase(), color: bruno.color });
      // 2026-08-24 — BUG reportado por Federico: arranca partida nueva
      // y el "0000.0mm" queda en rojo en vez de negro (color de Bruno)
      // apenas se cierra el flash de "PALAEOLITHIC". Causa: este atajo
      // de "primer lance" (dispara ANTES de que state.cosmicClock.era
      // llegue realmente a "bruno" via el Orchestrator — currentAvatarIndex
      // sigue en -1 en ese momento) solo actualizaba `label.color` (el
      // texto del flash), nunca `activeColor` (el color que usa la
      // vista de dígitos una vez el flash se apaga). Antes de que Bruno
      // tuviera color propio esto no se notaba porque activeColor
      // siempre se quedaba en el rojo base de todos modos. Ahora que
      // Bruno es negro, hay que setear activeColor acá también, no solo
      // esperar al efecto que depende de currentAvatarIndex.
      if (bruno.intensified) setActiveColor(bruno.color);
      return;
    }

    if (isPresent) return;

    if (label) {
      setLabel(null);
      return;
    }

    const idx = reachedIndexRef.current;
    if (idx < 0) return;

    const isFinalLeg = idx >= HISTORICAL_TIMELINE.length - 1;
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
          setActiveColor("#ffffff");
          setIsPresent(true);
        }
      } else {
        const maxReach =
          legTarget - Math.max(1, Math.round(legSize * CRUISE_HOLDBACK_FRACTION));
        next = Math.min(next, maxReach);
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveSignal]);

  const showingLabel = label !== null && isPresent === false;
  const currentLabelText = label === null ? "" : label.text;
  const glowColor = isPresent ? "#ffffff" : (label === null ? activeColor : label.color);

  // Misma escala 0-1000mm de la regla del intro de Genesis (996mm
  // Paleolítico+Neolítico, 4mm resto de la historia) — derivado de
  // displayValue, nunca un contador independiente.
  const mmValue = (displayValue / PRESENT_COUNTER) * RULER_TOTAL_MM;

  // "METAL AGE" es el único checkpoint que coincide con el arranque de
  // los últimos 4mm de la regla (ver GenesisReveal.tsx) — el cartel
  // extra solo tiene sentido ahí, no en el resto de las eras.
  const showLast4mmBanner = showingLabel && currentLabelText === "METAL AGE";

  const [hintVisible, setHintVisible] = React.useState(false);
  const showHint = () => setHintVisible(true);
  const hideHint = () => setHintVisible(false);

  return (
    <div
      className={`htc-wrap${frozen ? " htc-frozen" : ""}${hintVisible ? " htc-hint-visible" : ""}`}
      style={{ ["--htc-color" as string]: glowColor }}
      onPointerDown={showHint}
      onPointerUp={hideHint}
      onPointerLeave={hideHint}
      onPointerCancel={hideHint}
    >
      <div className="htc-row htc-row-years">
        <div className="htc-display">
          {isPresent ? (
            <span className="htc-present">{PRESENT_LABEL}</span>
          ) : showingLabel ? (
            <span className="htc-era-flash">{currentLabelText}</span>
          ) : (
            <span className="htc-digits">{formatDigits(displayValue)}</span>
          )}
        </div>
        {!showingLabel && (
          <span className="htc-unit">years</span>
        )}
      </div>

      {showLast4mmBanner && (
        <div className="htc-sub-banner">LAST 4 MILLIMETERS OF HISTORY</div>
      )}

      <div className="htc-row htc-row-mm">
        <div className="htc-display htc-display-mm">
          <span className="htc-digits">{formatMm(mmValue)}</span>
        </div>
        <span className="htc-unit">mm</span>
      </div>

      <div className="htc-hint">Human Evolution Timer</div>
    </div>
  );
}

export default HistoricalTimeCounter;
