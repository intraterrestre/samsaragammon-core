type EvolutionStatusProps = {
  player: "P1" | "P2"; 
  realmLabel: string;
  realmHex: string;
  era: string;
  cyclesDone: number;
  cyclesNeeded: number;
  transitions: number;
  isActive?: boolean;

  
};

export function EvolutionStatus({
  player,
  realmLabel,
  realmHex,
  cyclesDone,
  cyclesNeeded,
  isActive
}: EvolutionStatusProps) {
  const progress = cyclesDone / cyclesNeeded;
  const percent = Math.min(100, Math.round(progress * 100));


  return (
   <div
  style={{
    margin: "18px auto 10px",
    width: "min(520px, 92vw)",
    textAlign: "center",
    opacity: isActive ? 1 : 0.35,
    transform: isActive ? "scale(1.02)" : "scale(0.98)",
    transition: "all 0.25s ease",
      boxShadow: isActive
      ? `0 0 22px ${realmHex}`
      : "none",
      borderRadius: 999, 
    padding: "12px 18px",
  }}
>
      {/* TITLE */}
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.12em",
          opacity: 0.7,
          marginBottom: 6,
        }}
      >
        ⚡ ASCENSION PROGRESS
      </div>
{/* PLAYER IDENT */}
<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  }}
>
  <span
    style={{
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: player === "P1" ? "#ffffff" : "#000000",
      display: "inline-block",
      border: "1px solid rgba(255,255,255,0.5)",
      boxShadow:
        player === "P1"
          ? "0 0 8px rgba(255,255,255,0.8)"
          : "0 0 8px rgba(0,0,0,0.8)",
    }}
  />
  <span style={{ fontSize: 12, opacity: 0.75 }}>
    {player === "P1" ? "White" : "Black"}
  </span>
</div>
      {/* REALM */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          color: realmHex,
          marginBottom: 6,
        }}
      >
        {realmLabel.toUpperCase()} REALM
      </div>

      {/* BAR */}
      <div
        style={{
          height: 14,
          borderRadius: 999,
          background: "rgba(255,255,255,0.12)",
          overflow: "hidden",
          boxShadow: "inset 0 0 8px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${realmHex}, #ffffff)`,
            boxShadow: `0 0 14px ${realmHex}`,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      {/* NUMBERS */}
      <div
        style={{
          marginTop: 6,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        {cyclesDone} / {cyclesNeeded} cycles
      </div>

      {/* MICRO HINT */}
      <div
        style={{
          marginTop: 4,
          fontSize: 11,
          opacity: 0.6,
        }}
      >
        Reach {cyclesNeeded} to ascend
      </div>
    </div>
  );
}