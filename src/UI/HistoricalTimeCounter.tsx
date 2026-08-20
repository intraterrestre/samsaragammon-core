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

function formatDigits(value: number): string {
  return Math.floor(value).toString().padStart(DIGITS, "0");
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

  React.useEffect(() => {
    if (currentAvatarIndex <= reachedIndexRef.current) return;
    if (currentAvatarIndex < 0 || currentAvatarIndex >= HISTORICAL_TIMELINE.length)
      return;

    const entry = HISTORICAL_TIMELINE[currentAvatarIndex];
    reachedIndexRef.current = currentAvatarIndex;

    setDisplayValue(entry.counter);
    if (entry.intensified) setActiveColor(entry.color);

    const newLabel: EraLabel = { text: entry.eraName.toUpperCase(), color: entry.color };
    if (avatarVideoPlaying) {
      pendingLabelRef.current = newLabel;
    } else {
      setLabel(newLabel);
    }
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
      <div className="htc-display">
        {isPresent ? (
          <span className="htc-present">{PRESENT_LABEL}</span>
        ) : showingLabel ? (
          <span className="htc-era-flash">{currentLabelText}</span>
        ) : (
          <span className="htc-digits">{formatDigits(displayValue)}</span>
        )}
      </div>
      <div className="htc-hint">Years of Human Evolution</div>
    </div>
  );
}

export default HistoricalTimeCounter;
