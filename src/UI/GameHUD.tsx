type GameHUDProps = {
  state: any;
  rollsCount: number;
  karmaSnap: any;
  realmDataP1: any;
  realmDataP2: any;
};

export function GameHUD({
  state,
  rollsCount,
  karmaSnap,
  realmDataP1,
  realmDataP2,
}: GameHUDProps) {
  return (
    <div className="miniStatus">
      <span>
        Turn: <b>{state.turn === "P1" ? "⚪ White" : "⚫ Black"}</b>
      </span>

      <span className="sep">•</span>

      <span>
        Current Position → <b>⚪ White</b>: {state.pieces.P1.pos} | <b>⚫ Black</b>:{" "}
        {state.pieces.P2.pos}
      </span>

      <span className="sep">•</span>

      <span>
        Captures → <b>⚪ White</b>: {state.captures.P1} | <b>⚫ Black</b>:{" "}
        {state.captures.P2}
      </span>

      <span className="sep">•</span>

      <span>
        Realms → <b>⚪ White</b>: {realmDataP1.label} | <b>⚫ Black</b>:{" "}
        {realmDataP2.label}
      </span>

      <span className="sep">•</span>

      <span>
        Rolls: <b>{rollsCount}</b>
      </span>

      {karmaSnap && (
        <>
          <span className="sep">•</span>

          <span>
            Karma → <b>⚪ White</b>: {karmaSnap.players.P1.karmaTotal.toFixed(2)} |{" "}
            <b>⚫ Black</b>: {karmaSnap.players.P2.karmaTotal.toFixed(2)}
          </span>

          <span className="sep">•</span>

          <span>
            Levels → <b>⚪ White</b>: {karmaSnap.players.P1.level} | <b>⚫ Black</b>:{" "}
            {karmaSnap.players.P2.level}
          </span>
        </>
      )}
    </div>
  );
}