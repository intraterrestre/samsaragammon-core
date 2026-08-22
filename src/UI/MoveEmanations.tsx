import type { MoveOption, PieceKind, PlayerId } from "../game/types";
import { piecePosition, RING_SIZE } from "./geometry";

type Props = {
  options: MoveOption[];
  player: PlayerId;
  trackSize: number;
  selectedPiece: PieceKind;
  onChoose: (option: MoveOption, allOptions: MoveOption[]) => void;
  onHoverOption?: (option: MoveOption | null) => void;
};

function meaningColor(meaning: MoveOption["meaning"]) {
  if (!meaning) return "rgba(0, 220, 120, 0.75)";

  switch (meaning) {
    case "IMPACT":
      return "rgba(255, 60, 60, 1)";
    case "RISK":
      return "rgba(255, 170, 0, 1)";
    case "PROGRESS":
      return "rgba(0, 220, 120, 1)";
    case "SAFE":
      return "rgba(80, 180, 255, 0.9)";
    case "SAME":
      return "rgba(255, 255, 255, 0.9)";
    default:
      return "rgba(0, 220, 120, 0.75)";
  }
}

function choiceDash(choice: MoveOption["choice"]) {
  switch (choice) {
    case "A":
      return "";
    case "B":
      return "6 4";
    case "AB":
      return "";
    case "ECO":
      return "2 3";
    default:
      return "";
  }
}

function choiceWidth(choice: MoveOption["choice"]) {
  switch (choice) {
    case "AB":
      return 4;
    case "ECO":
      return 2.5;
    default:
      return 3;
  }
}

function buildCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bend = 0.18
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  const dx = x2 - x1;
  const dy = y2 - y1;

  const nx = -dy;
  const ny = dx;

  const len = Math.max(1, Math.hypot(nx, ny));
  const ux = nx / len;
  const uy = ny / len;

  const dist = Math.hypot(dx, dy);
  const strength = dist * bend;

  const cx = mx + ux * strength;
  const cy = my + uy * strength;

  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function MoveEmanations({
  options,
  player,
  trackSize,
  selectedPiece,
  onChoose,
  onHoverOption,
}: Props) {
  const filteredOptions = options.filter(
    (opt) => opt.pieceKind === selectedPiece
  );

  if (!filteredOptions.length) return null;

  const animationStyles = `
    @keyframes emanationFade {
      from { opacity: 0; }
      to { opacity: 0.92; }
    }

    @keyframes emanationPulse {
      0% { opacity: 0.72; }
      50% { opacity: 1; }
      100% { opacity: 0.72; }
    }

@keyframes emanationDot {
  0% {
    transform: scale(0.96);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.08);
    opacity: 0.9;
  }
  100% {
    transform: scale(0.96);
    opacity: 0.6;
  }
}
  `;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: RING_SIZE,
        height: RING_SIZE,
        pointerEvents: "none",
        zIndex: 32,
      }}
    >
      <style>{animationStyles}</style>

      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "visible",
          pointerEvents: "none",
        }}
      >
        {filteredOptions.map((opt, i) => {
          const from = piecePosition(opt.fromPos, trackSize);
          const to = piecePosition(opt.toPos, trackSize);

          const x1 = (from.left as number) + 18;
          const y1 = (from.top as number) + 18;
          const x2 = (to.left as number) + 18;
          const y2 = (to.top as number) + 18;

          const color = meaningColor(opt.meaning);
          const dash = choiceDash(opt.choice);
          const width = choiceWidth(opt.choice);

          const d = buildCurve(
            x1,
            y1,
            x2,
            y2,
            opt.choice === "AB" ? 0.24 : 0.16
          );

          return (
            <g key={`${player}-${opt.pieceKind}-${opt.choice}-${opt.toPos}-${i}`}>
              <path
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.001)"
                strokeWidth={18}
                strokeLinecap="round"
                style={{ pointerEvents: "stroke", cursor: "pointer" }}
                onMouseEnter={() => onHoverOption?.(opt)}
                onMouseLeave={() => onHoverOption?.(null)}
                onClick={() => onChoose(opt, filteredOptions)}
              />

              <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth={width}
                strokeLinecap="round"
                strokeDasharray={dash}
                opacity={0.92}
                style={{
                  pointerEvents: "none",
                  filter: `drop-shadow(0 0 6px ${color})`,
                  animation:
                    "emanationFade 0.35s ease-out, emanationPulse 2.6s ease-in-out infinite",
                  transformOrigin: "50% 50%",
                }}
              />

              <circle
                cx={x2}
                cy={y2}
                r={opt.choice === "AB" ? 6 : 4.5}
                fill={color}
                opacity={0.95}
                style={{
                  pointerEvents: "none",
                  animation: "emanationDot 2s ease-in-out infinite",
                  filter: `drop-shadow(0 0 6px ${color})`,
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}