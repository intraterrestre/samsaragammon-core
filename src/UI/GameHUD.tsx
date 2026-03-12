type GameHUDProps = {
  state: any
  rollsCount: number
  karmaSnap: any
  realmDataP1: any
  realmDataP2: any
}

export function GameHUD({
  state,
  rollsCount,
  karmaSnap,
  realmDataP1,
  realmDataP2
}: GameHUDProps) {

  return (
    <div className="miniStatus">

      <span>
        Turn: <b>{state.turn}</b>
      </span>

      <span className="sep">•</span>

      <span>
        Positions → <b>P1</b>: {state.pieces.P1.pos} | <b>P2</b>: {state.pieces.P2.pos}
      </span>

      <span className="sep">•</span>

      <span>
        Captures → <b>P1</b>: {state.captures.P1} | <b>P2</b>: {state.captures.P2}
      </span>

      <span className="sep">•</span>

      <span>
        Realms → P1: {realmDataP1.label} | P2: {realmDataP2.label}
      </span>

      <span className="sep">•</span>

      <span>
        Rolls: <b>{rollsCount}</b>
      </span>

      {karmaSnap && (
        <>
          <span className="sep">•</span>

          <span>
            Karma → <b>P1</b>: {karmaSnap.players.P1.karmaTotal.toFixed(2)} |
            <b>P2</b>: {karmaSnap.players.P2.karmaTotal.toFixed(2)}
          </span>

          <span className="sep">•</span>

          <span>
            Levels → <b>P1</b>: {karmaSnap.players.P1.level} |
            <b>P2</b>: {karmaSnap.players.P2.level}
          </span>
        </>
      )}

    </div>
  )
}