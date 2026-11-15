// tools/lab/mirrorCheck.ts — 15 nov 2026. ¿Son simétricos el motor y Buddha?
// Toma posiciones reales, construye su espejo (P1<->P2 y pos -> 21-pos, que
// deja Humanos en su sitio) y compara jugadas legales, valoración y resultado.
import { reducer } from "../../src/game/state/reducer";
import { initialState } from "../../src/game/state/state";
import { chooseBotMove, applyBotAction, getBotActions, evaluate, type BotAction } from "../../src/game/bot/buddhaBot";
import type { GameState, PlayerId } from "../../src/game/types";
console.log = () => {}; console.warn = () => {}; console.info = () => {};
if (process.env.FIX) (globalThis as { __SG_RELOC_FWD?: boolean }).__SG_RELOC_FWD = true;
const act = (s: GameState, a: object) => reducer(s, a as never);
const R = (p: number) => (p < 0 ? p : (21 - p + 24) % 24);
const SW: Record<string, string> = { P1: "P2", P2: "P1" };
const PLAYER_KEYS = new Set(["turn", "byPlayer", "fromPlayer", "winner", "player", "mover", "owner", "by"]);
function mirror(x: unknown, key = ""): unknown {
  if (Array.isArray(x)) return x.map((v) => mirror(v));
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    const hasP = "P1" in o && "P2" in o;
    for (const [k, v] of Object.entries(o)) {
      let nk = k;
      if (hasP && (k === "P1" || k === "P2")) nk = SW[k];
      if (key === "boardNidanas" && /^\d+$/.test(k)) nk = String(R(Number(k)));
      out[nk] = mirror(v, k);
    }
    return out;
  }
  if (typeof x === "number" && /pos$/i.test(key)) return R(x);
  if (typeof x === "string" && PLAYER_KEYS.has(key) && SW[x]) return SW[x];
  return x;
}
const sig = (a: BotAction, f: (n: number) => number) =>
  `${a.kind}|${a.move.avatar}|${a.move.venom}|${a.move.option.pieceKind}|${f(a.move.option.fromPos)}|${f(a.move.option.toPos)}|${a.kind === "dharma777" ? a.target : ""}`;

let randomMoves = 0;
let states = 0, legalMismatch = 0, evalMismatch = 0, resultMismatch = 0, chosenDiffer = 0;
const examples: string[] = [];
for (let g = Number(process.argv[2] ?? 0); g < Number(process.argv[3] ?? 10); g++) {
  let s = { ...initialState, gameStartedAt: 1, gameId: "m" } as GameState;
  s = act(s, { type: "SET_TUTORIAL_MODE", on: true }); s = act(s, { type: "SET_GENESIS_UI_COMPLETE" });
  for (let t = 0; t < 300 && !s.winner; t++) {
    const p = s.turn; const q = SW[p] as PlayerId;
    s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
    if (t % 4 === 0) {
      const ms = mirror(s) as GameState;
      states++;
      const A = getBotActions(s, p), B = getBotActions(ms, q);
      const sa = new Set(A.map((a) => sig(a, R))), sb = new Set(B.map((b) => sig(b, (n) => n)));
      const same = sa.size === sb.size && [...sa].every((k) => sb.has(k));
      if (!same) { legalMismatch++; if (examples.length < 6) examples.push(`jugadas t=${t} ${p}: ${A.length} vs espejo ${B.length}; sobran ${[...sa].filter((k) => !sb.has(k)).slice(0, 2).join(" ; ")} / faltan ${[...sb].filter((k) => !sa.has(k)).slice(0, 2).join(" ; ")}`); }
      const e1 = evaluate(s, p), e2 = evaluate(ms, q);
      if (Math.abs(e1 - e2) > 1e-6) { evalMismatch++; if (examples.length < 12) examples.push(`valoración t=${t}: ${e1.toFixed(2)} vs espejo ${e2.toFixed(2)}`); }
      // resultado de cada jugada (sin azar: solo jugadas sin captura)
      if (same) for (const a of A.slice(0, 6)) {
        const b = B.find((x) => sig(x, (n) => n) === sig(a, R))!;
        // ¿Interviene el azar en esta jugada? (la aplicamos dos veces con azar distinto)
        const rnd = Math.random;
        let k = 1; Math.random = () => ((k = (k * 16807) % 2147483647) / 2147483647);
        const v1 = evaluate(applyBotAction(s, p, a), p);
        k = 99991; const v1b = evaluate(applyBotAction(s, p, a), p);
        k = 1; const v2 = evaluate(applyBotAction(ms, q, b), q);
        Math.random = rnd;
        if (Math.abs(v1 - v1b) > 1e-6) { randomMoves++; continue; }
        if (Math.abs(v1 - v2) > 1e-6) { resultMismatch++; if (examples.length < 18) { const A1 = applyBotAction(s, p, a), B1 = applyBotAction(ms, q, b); const diff: string[] = []; for (const f of ["pieces","realmPieces","consolidatedAvatars","avatarNidana","boardNidanas","realmProgress"]) if (JSON.stringify(mirror((A1 as unknown as Record<string, unknown>)[f], f)) !== JSON.stringify((B1 as unknown as Record<string, unknown>)[f])) diff.push(f); examples.push(`resultado t=${t} ${sig(a, (n) => n)}: ${v1.toFixed(2)} vs ${v2.toFixed(2)} difiere en [${diff.join(",")}]`);
          if (process.env.DETAIL && examples.length <= 2) {
            const bef = (st: GameState, pl: PlayerId) => JSON.stringify({ venoms: st.pieces[pl], av: Object.fromEntries(Object.entries(st.realmPieces[pl] ?? {}).map(([k2, v]) => [k2, v && { pos: v.pos, l: v.inLimbo }])) });
            examples.push("  ANTES  original " + p + ": " + bef(s, p) + "\n  ANTES  espejo   " + q + ": " + bef(ms, q));
            examples.push("  DESPUÉS original (reflejado) " + JSON.stringify((mirror(A1, "") as GameState).pieces[q]) + " av " + JSON.stringify(Object.fromEntries(Object.entries((mirror(A1, "") as GameState).realmPieces[q] ?? {}).map(([k2, v]) => [k2, v && v.pos]))));
            const mA = mirror(A1, "") as GameState;
            examples.push("  RIVAL después original(refl) " + JSON.stringify(mA.pieces[p]) + " av " + JSON.stringify(mA.realmPieces[p]) + " nid " + JSON.stringify(mA.avatarNidana));
            examples.push("  RIVAL después espejo         " + JSON.stringify(B1.pieces[p]) + " av " + JSON.stringify(B1.realmPieces[p]) + " nid " + JSON.stringify(B1.avatarNidana));
            examples.push("  DESPUÉS espejo               " + JSON.stringify(B1.pieces[q]) + " av " + JSON.stringify(Object.fromEntries(Object.entries(B1.realmPieces[q] ?? {}).map(([k2, v]) => [k2, v && v.pos]))));
          } } break; }
      }
      const c1 = null as ReturnType<typeof chooseBotMove>, c2 = null as ReturnType<typeof chooseBotMove>;
      if (c1 && c2 && sig(c1.action, R) !== sig(c2.action, (n) => n)) chosenDiffer++;
    }
    const c = chooseBotMove(s, p, "normal");
    s = c ? applyBotAction(s, p, c.action) : act(s, { type: "PASS_NO_MOVES", player: p });
  }
}
process.stdout.write(JSON.stringify({ randomMoves, states, legalMismatch, evalMismatch, resultMismatch, chosenDiffer }) + "\n" + examples.join("\n") + "\n");
