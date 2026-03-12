type EvolutionStatusProps = {
  realmLabel: string;
  realmHex: string;
  era: string;
  cyclesDone: number;
  cyclesNeeded: number;
  transitions: number;
};

export function EvolutionStatus({
  realmLabel,
  realmHex,
  era,
  cyclesDone,
  cyclesNeeded,
  transitions,
}: EvolutionStatusProps) {
  return (
    <div style={{ opacity: 0.85, marginTop: 4 }}>
      <div>
        Realm: <span style={{ color: realmHex }}>{realmLabel}</span>
      </div>

      <div>
        Era: <span style={{ color: realmHex }}>{era}</span>
      </div>

      <div>
        Cycles: <b>{cyclesDone}</b> / {cyclesNeeded}
      </div>

      <div>
        Transitions: <b>{transitions}</b>
      </div>
    </div>
  );
}