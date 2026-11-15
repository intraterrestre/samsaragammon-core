import { reducer } from "../../src/game/state/reducer";
import { initialState } from "../../src/game/state/state";
import { chooseBotMove, applyBotAction, getBotActions } from "../../src/game/bot/buddhaBot";
import { realmFromPos } from "../../src/UI/realm";
import { REALM_PIECE_ORDER, type GameState, type PlayerId } from "../../src/game/types";
console.log = () => {}; console.warn = () => {}; console.info = () => {};
const act = (s: GameState, a: object) => reducer(s, a as never);
const H = (pos: number) => realmFromPos(pos) === "HUMAN";
function leavers(b: GameState, a: GameState, p: PlayerId) {
  return REALM_PIECE_ORDER.filter((k) => { const x = b.realmPieces[p]?.[k], y = a.realmPieces[p]?.[k];
    return x && y && x.unlocked && !x.inLimbo && !y.inLimbo && H(x.pos) && !H(y.pos); });
}
let exits = 0, forced = 0, chosenBloomed = 0, forcedBloomed = 0, allInHumansTurns = 0;
for (let g = 0; g < 8; g++) {
  let s = { ...initialState, gameStartedAt: 1, gameId: "x" } as GameState;
  s = act(s, { type: "SET_TUTORIAL_MODE", on: true }); s = act(s, { type: "SET_GENESIS_UI_COMPLETE" });
  for (let t = 0; t < 1500 && !s.winner; t++) {
    const p = s.turn;
    s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
    const acts = getBotActions(s, p);
    const c = chooseBotMove(s, p, "normal");
    if (!c) { s = act(s, { type: "PASS_NO_MOVES", player: p }); continue; }
    const after = applyBotAction(s, p, c.action);
    const out = leavers(s, after, p);
    if (out.length) {
      exits++;
      const bloomed = out.some((k) => s.consolidatedAvatars[p]?.[k]);
      const alt = acts.some((a) => leavers(s, applyBotAction(s, p, a), p).length === 0);
      if (!alt) { forced++; if (bloomed) forcedBloomed++; } else if (bloomed) chosenBloomed++;
    }
    s = after;
  }
}
process.stdout.write(JSON.stringify({ exits, forced, chosenBloomed, forcedBloomed }) + "\n");
