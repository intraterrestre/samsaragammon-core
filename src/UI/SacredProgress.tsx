import "./SacredProgress.css";
import yinYangAscension from "./yin-yang-ascension.webp";


type SacredProgressProps = {
  p1Completed: number;
  p2Completed: number;
};

const REALM_COLORS = [
  "#111111", // black
  "#7b2cbf", // purple
  "#f2c94c", // yellow
  "#dc2626", // red
  "#2563eb", // blue
  "#f5f5f5", // white
];

function clampCompleted(value: number) {
  return Math.max(0, Math.min(6, value));
}

export function SacredProgress({
  p1Completed,
  p2Completed,
}: SacredProgressProps) {
  const p1 = clampCompleted(p1Completed);
  const p2 = clampCompleted(p2Completed);

  return (
    <div className="sacredProgress">
      <div className="sacredCounter sacredCounterTop">{p1}/6</div>

    <div className="sacredYinYang">
<img
  src={yinYangAscension}
  alt=""
  className="sacredYinYangImage"
/>
      <div className="lampCurve lampCurveTop">
          {REALM_COLORS.map((color, index) => {
            const filled = index < p1;

            return (
              <span
                key={`p1-${color}`}
                className={`sacredLamp ${filled ? "isFilled" : ""}`}
                style={
                  filled
                    ? ({ "--lamp-color": color } as React.CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>

      <div className="lampCurve lampCurveBottom">
          {REALM_COLORS.map((color, index) => {
            const filled = index < p2;

            return (
              <span
                key={`p2-${color}`}
                className={`sacredLamp ${filled ? "isFilled" : ""}`}
                style={
                  filled
                    ? ({ "--lamp-color": color } as React.CSSProperties)
                    : undefined
                }
              />
            );
          })}
        </div>
      </div>

      <div className="sacredCounter sacredCounterBottom">{p2}/6</div>
    </div>
  );
}

export default SacredProgress;