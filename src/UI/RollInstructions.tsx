type RollInstructionsProps = {
  hasRolled: boolean;
  level: number;
  sum: number | null;
};

export function RollInstructions({
  hasRolled,
  level,
  sum,
}: RollInstructionsProps) {
  return (
    <div style={{ opacity: 0.85, margin: "10px 0 6px" }}>
      {hasRolled
        ? "✅ Click A, B, ECO or A+B to choose your move."
        : "ℹ️ Roll the dice to see your options."}

      {level >= 3 && sum != null && (
        <span style={{ marginLeft: 10, opacity: 0.8 }}>
          (A+B = <b style={{ color: "#9aff9a" }}>{sum}</b>)
        </span>
      )}
    </div>
  );
}