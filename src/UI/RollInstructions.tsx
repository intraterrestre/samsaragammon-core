type RollInstructionsProps = {
  hasRolled: boolean;
  level: number;
  sum: number | null;
  moveA?: number | null;
  moveB?: number | null;
  moveAB?: number | null;
};

export function RollInstructions({
  hasRolled,
  level,
  moveA,
  moveB,
  moveAB,
}: RollInstructionsProps) {
  return (
    <div
      style={{
        width: "min(560px, 92vw)",
        margin: "10px auto 14px",
        padding: "12px 14px",
        borderRadius: 14,
        background: "rgba(0,0,0,0.14)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: 14,
      }}
    >
      {!hasRolled ? (
        <div style={{ textAlign: "center", opacity: 0.8 }}>
          Roll the dice to reveal your available paths.
        </div>
      ) : (
        <>
          <div
            style={{
              textAlign: "center",
              fontWeight: 800,
              marginBottom: 10,
            }}
          >
            Available Moves
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <div>
              <b>A</b> → {moveA ?? "-"}
            </div>

            <div>
              <b>B</b> → {moveB ?? "-"}
            </div>

            {level >= 3 && (
              <div>
                <b>A+B</b> → {moveAB ?? "-"}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}