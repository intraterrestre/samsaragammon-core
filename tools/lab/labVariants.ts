// tools/lab/labVariants.ts — 15 nov 2026. Variantes del final de partida
// (solo simulación, el juego no cambia):
//   estable  A: Avatar con loto en Humanos queda fijo (no sale); capturable.
//   pasar    B: se puede pasar si TODAS las jugadas sacan de Humanos a un Avatar con loto.
//   retiro   C: Avatar que florece en Humanos se retira: fijo e incapturable.
//   perdon   la primera captura de cada Avatar no le quita el loto.
//   gracia   las capturas ANTES de destaparse Humanos (Marino) no cuentan: no se
//            puede perder un loto que todavía no existe.
//   siempre  ninguna captura quita el derecho al loto (protección hasta el primer loto).
//   apuestas Square Karma 666; con "coste" perderla cuesta 2 Nidanas y solo se
//            apuesta con la Serpiente a tiro; con "rechazo" el rival acepta el 50 %.
//   p2empieza  mueven primero las negras.
//   simetrico  salida de las blancas en 9/8/7 (misma distancia a Humanos que las negras).
//   brunoEspejo  el Bruno blanco nace en la casilla espejo del Bruno negro
//                (reflexión pos -> 21 - pos, que deja Humanos en su sitio).
//   sinNidanas sin Nidanas en el tablero ni portadas.
//   (env ZONES) disposición alternativa de los reinos.
//   espejo     intercambia la geometría entre colores: salida Y sentido de giro
//              (requiere el parche __SG_SWAP_DIR en la copia del laboratorio).
// Uso: node labVariants.cjs <variante> <nivelP1> <nivelP2> <partidas> [semillaInicial]
// Cada partida usa una semilla fija (se imprime): se puede repetir idéntica.
// Con TRACE=archivo, las partidas de más de 800 turnos se vuelcan turno a turno.
import { reducer } from "../../src/game/state/reducer";
import { initialState } from "../../src/game/state/state";
import { applyBotAction, getBotActions, evaluate, chooseBotMove, type BotAction, type BotLevel } from "../../src/game/bot/buddhaBot";
import { appendFileSync } from "fs";
import { humansRevealed } from "../../src/game/rules/humansReveal";
import { previewMove } from "../../src/game/rules/preview";
import { realmFromPos } from "../../src/UI/realm";
import { REALM_PIECE_ORDER, type GameState, type PlayerId, type RealmPieceKind } from "../../src/game/types";

const [variant = "base", l1 = "normal", l2 = "normal", nStr = "10", seedStr = "1"] = process.argv.slice(2);
const TRACE = process.env.TRACE;
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const V = { estable: variant.includes("estable"), pasar: variant.includes("pasar"), retiro: variant.includes("retiro"), perdon: variant.includes("perdon"), gracia: variant.includes("gracia"), siempre: variant.includes("siempre"),
  apuestas: variant.includes("apuestas"), coste: variant.includes("coste"), rechazo: variant.includes("rechazo"),
  p2empieza: variant.includes("p2empieza"), simetrico: variant.includes("simetrico"), espejo: variant.includes("espejo") };
if (V.espejo) (globalThis as { __SG_SWAP_DIR?: boolean }).__SG_SWAP_DIR = true;
// ZONES=PRETA,ASURA,DEVA,NARAKA,ANIMAL → reinos de las casillas 1-4,5-8,9-12,13-16,17-20 (Humanos fijo en 21-0).
const ZONES = process.env.ZONES;
if (ZONES) (globalThis as { __SG_ZONES?: string[] }).__SG_ZONES = [...ZONES.split(","), "HUMAN"];
const sinNidanas = variant.includes("sinNidanas");
const brunoEspejo = variant.includes("brunoEspejo");
console.log = () => {}; console.warn = () => {}; console.info = () => {};
const MAX_TURNS = Number(process.env.MAXT ?? 3000);
const act = (s: GameState, a: object) => reducer(s, a as never);
const H = (pos: number) => realmFromPos(pos) === "HUMAN";
const other = (p: PlayerId): PlayerId => (p === "P1" ? "P2" : "P1");

const bloomedIn = (s: GameState, p: PlayerId, k: RealmPieceKind) => {
  const a = s.realmPieces[p]?.[k];
  return !!a && a.unlocked && !a.inLimbo && H(a.pos) && !!s.consolidatedAvatars[p]?.[k];
};
const bloomedCount = (s: GameState, p: PlayerId) => REALM_PIECE_ORDER.filter((k) => bloomedIn(s, p, k)).length;
const movesAvatar = (a: BotAction) => (a.move.avatar ?? a.move.option.pieceKind) as RealmPieceKind;
function bloomedLeaves(b: GameState, a: GameState, p: PlayerId) {
  return REALM_PIECE_ORDER.some((k) => bloomedIn(b, p, k) && !bloomedIn(a, p, k) && !a.realmPieces[p]?.[k]?.inLimbo);
}
function passState(s: GameState, p: PlayerId): GameState {
  return { ...s, turn: other(p), turnIndex: s.turnIndex + 1, cycleIndex: p === "P2" ? s.cycleIndex + 1 : s.cycleIndex,
    selectedPiece: { ...s.selectedPiece, [p]: "pig" }, selectedVenom: { ...s.selectedVenom, [p]: null }, phase: "idle", rollOptions: null } as GameState;
}

const dirOf = (p: PlayerId) => ((p === "P1") !== V.espejo ? "clockwise" : "counterclockwise");
function snakeHasTarget(s: GameState, p: PlayerId): boolean {
  const opp = other(p); const sn = s.pieces[p].snake;
  if (!sn || sn.inLimbo) return false;
  const occ = new Map<number, number>();
  for (const k of REALM_PIECE_ORDER) { const a = s.realmPieces[opp]?.[k]; if (a && a.unlocked && !a.inLimbo) occ.set(a.pos, (occ.get(a.pos) ?? 0) + 1); }
  for (let d = 1; d <= 6; d++) if (occ.get(previewMove(sn.pos, d, s.trackSize, dirOf(p))) === 1) return true;
  return false;
}

// Mismo criterio que chooseBotMove (Fácil/Normal), sobre un conjunto de acciones dado, con "pasar" opcional.
function choose(s: GameState, p: PlayerId, level: BotLevel, actions: BotAction[], canPass: boolean): BotAction | "pass" {
  if (actions.length === 0) return "pass";
  if ((level as string) === "azar") return actions[Math.floor(Math.random() * actions.length)];
  if (level === "hard" && !V.estable && !V.retiro) {
    // Difícil real (con lookahead) y, si se puede pasar, compara con pasar.
    const c = chooseBotMove(s, p, "hard");
    if (!c) return "pass";
    if (canPass && evaluate(passState(s, p), p) > evaluate(applyBotAction(s, p, c.action), p)) return "pass";
    return c.action;
  }
  const rnd = level === "easy" ? 0.5 : level === "normal" ? 0.12 : 0;
  if (Math.random() < rnd) return actions[Math.floor(Math.random() * actions.length)];
  const noise = level === "easy" ? 25 : level === "normal" ? 6 : 0;
  let best: BotAction | "pass" = actions[0]; let bestV = -Infinity;
  for (const a of actions) {
    const v = evaluate(applyBotAction(s, p, a), p) + (Math.random() * 2 - 1) * noise;
    if (v > bestV) { bestV = v; best = a; }
  }
  if (canPass) {
    const v = evaluate(passState(s, p), p) + (Math.random() * 2 - 1) * noise;
    if (v > bestV) best = "pass";
  }
  return best;
}

function playOne(seed: number) {
  Math.random = mulberry32(seed);
  let s = { ...initialState, gameStartedAt: 1, gameId: "v" } as GameState;
  s = act(s, { type: "SET_TUTORIAL_MODE", on: true }); s = act(s, { type: "SET_GENESIS_UI_COMPLETE" });
  if (V.p2empieza) s = { ...s, turn: "P2" } as GameState;
  if (V.espejo) s = { ...s, pieces: { P1: s.pieces.P2, P2: s.pieces.P1 } } as GameState; // blancas salen de 12-14 y giran al revés; negras de 0-2 en sentido horario
  if (V.simetrico) s = { ...s, pieces: { ...s.pieces, P1: { pig: { ...s.pieces.P1.pig, pos: 9 }, snake: { ...s.pieces.P1.snake, pos: 8 }, rooster: { ...s.pieces.P1.rooster, pos: 7 } } } } as GameState;
  const levels: Record<PlayerId, BotLevel> = { P1: l1 as BotLevel, P2: l2 as BotLevel };
  const caps: Record<string, number> = {};
  const retired: Record<string, number> = {}; // clave -> pos
  const m = { turns: 0, winner: null as PlayerId | null, avatarCaptures: 0, bloomedCaptured: 0,
    forcedExits: 0, chosenPasses: 0, lockedPasses: 0, k5: -1, k6: -1,
    seed, forgivenAvatars: 0, forgiveViolations: 0, maxPassStreak: 0,
    starter: "" as string, betsRequested: 0, betsRefused: 0, betsWon: 0, betsLost: 0, betWins: { P1: 0, P2: 0 } as Record<PlayerId, number> };
  m.starter = s.turn;
  const prog = { P1: 0, P2: 0, P1b: 0, P2b: 0 };
  const birthDist: Record<string, number> = {};
  const distH = (pos: number, pl: PlayerId) => { for (let k = 0; k < 24; k++) if (H(previewMove(pos, k, s.trackSize, dirOf(pl)))) return k; return 24; };
  const forgiven: Record<string, number> = {};
  const passStreak: Record<PlayerId, number> = { P1: 0, P2: 0 };
  const trace: string[] = [];
  let turn = 0;
  while (!s.winner && turn < MAX_TURNS) {
    const p = s.turn; let before = s;
    if (V.apuestas) {
      if (s.pendingSnakeBet && s.pendingSnakeBet.byPlayer !== p) {
        if (V.rechazo && Math.random() < 0.5) { s = act(s, { type: "REFUSE_SNAKE_BET" }); m.betsRefused++; }
        else s = act(s, { type: "ACCEPT_SNAKE_BET" });
      }
      if (!s.pendingSnakeBet && !s.snakeBet && (!V.coste || snakeHasTarget(s, p))) {
        for (const k of REALM_PIECE_ORDER) {
          const t = act(s, { type: "REQUEST_SNAKE_BET", player: p, targetAvatar: k });
          if (t !== s && t.pendingSnakeBet) { s = t; m.betsRequested++; break; }
        }
      }
      before = s;
    }
    const betBefore = s.snakeBet && s.snakeBet.byPlayer === p ? s.snakeBet : null;
    s = act({ ...s, phase: "idle", rollOptions: null } as GameState, { type: "ROLL" });
    let actions = getBotActions(s, p);
    const legalExisted = actions.length > 0;
    if (V.estable || V.retiro) actions = actions.filter((a) => !bloomedIn(s, p, movesAvatar(a)) && !retired[p + movesAvatar(a)]);
    let canPass = false;
    if (V.pasar && actions.length > 0 && actions.every((a) => bloomedLeaves(s, applyBotAction(s, p, a), p))) canPass = true;
    const c = choose(s, p, levels[p], actions, canPass);
    passStreak[p] = c === "pass" && legalExisted ? passStreak[p] + 1 : 0;
    m.maxPassStreak = Math.max(m.maxPassStreak, passStreak[p]);
    if (c === "pass") {
      if (legalExisted && actions.length === 0) m.lockedPasses++;
      else if (legalExisted) m.chosenPasses++;
      s = legalExisted ? passState(s, p) : act(s, { type: "PASS_NO_MOVES", player: p });
    } else {
      const after = applyBotAction(s, p, c);
      if (bloomedLeaves(s, after, p) && actions.every((a) => bloomedLeaves(s, applyBotAction(s, p, a), p))) m.forcedExits++;
      s = after;
    }
    if (betBefore && !s.snakeBet) {
      if (s.consolidatedAvatars[p]?.[betBefore.targetAvatar] && !before.consolidatedAvatars[p]?.[betBefore.targetAvatar]) { m.betsWon++; m.betWins[p]++; }
      else {
        m.betsLost++;
        if (V.coste) {
          const an = { ...(s.avatarNidana[p] ?? {}) } as Record<string, unknown>;
          Object.keys(an).filter((k) => an[k]).slice(0, 2).forEach((k) => { an[k] = null; });
          s = { ...s, avatarNidana: { ...s.avatarNidana, [p]: an } } as GameState;
        }
      }
    }
    if (brunoEspejo && birthDist["P1:hungry_ghost"] === undefined) {
      const b1 = s.realmPieces.P1?.hungry_ghost, b2 = s.realmPieces.P2?.hungry_ghost;
      if (b1 && b2 && b1.unlocked && b2.unlocked && !b1.inLimbo && !b2.inLimbo) {
        const target = (21 - b2.pos + 24) % 24;
        const busy = ["P1", "P2"].some((pl) => ["pig", "snake", "rooster"].some((v) => { const x = s.pieces[pl as PlayerId][v as "pig"]; return !x.inLimbo && x.pos === target; }));
        if (!busy) s = { ...s, realmPieces: { ...s.realmPieces, P1: { ...s.realmPieces.P1, hungry_ghost: { ...b1, pos: target } } } } as GameState;
      }
    }
    for (const pl of ["P1", "P2"] as PlayerId[]) for (const k of REALM_PIECE_ORDER) {
      const a = s.realmPieces[pl]?.[k];
      if (a && a.unlocked && birthDist[pl + ":" + k] === undefined) birthDist[pl + ":" + k] = a.inLimbo ? -1 : distH(a.pos, pl);
    }
    if (sinNidanas) s = { ...s, boardNidanas: {}, avatarNidana: { P1: {}, P2: {} } } as GameState;
    // Capturas, perdón y retiro.
    for (const pl of ["P1", "P2"] as PlayerId[]) {
      for (const k of REALM_PIECE_ORDER) {
        const a0 = before.realmPieces[pl]?.[k]; const a1 = s.realmPieces[pl]?.[k];
        if (!a0 || !a1 || !a0.unlocked) continue;
        const key = pl + k;
        if (!a0.inLimbo && a1.inLimbo) {
          if (V.retiro && retired[key] !== undefined) {
            // incapturable: vuelve a su sitio
            s = { ...s, realmPieces: { ...s.realmPieces, [pl]: { ...s.realmPieces[pl], [k]: { ...a1, inLimbo: false, maraLevel: null, pos: retired[key] } } } } as GameState;
            continue;
          }
          m.avatarCaptures++;
          if (bloomedIn(before, pl, k)) m.bloomedCaptured++;
          if (V.siempre || (V.gracia && !humansRevealed(before))) {
            s = { ...s, realmPieces: { ...s.realmPieces, [pl]: { ...s.realmPieces[pl], [k]: { ...s.realmPieces[pl]![k]!, everCaptured: false } } } } as GameState;
            continue;
          }
          caps[key] = (caps[key] ?? 0) + 1;
          if (V.perdon && caps[key] === 1) {
            s = { ...s, realmPieces: { ...s.realmPieces, [pl]: { ...s.realmPieces[pl], [k]: { ...s.realmPieces[pl]![k]!, everCaptured: false } } } } as GameState;
            forgiven[key] = (forgiven[key] ?? 0) + 1;
            if (forgiven[key] === 1) m.forgivenAvatars++;
          }
          // Auditoría: perdón como máximo una vez; desde la 2.ª captura, sin loto automático.
          if ((forgiven[key] ?? 0) > 1) m.forgiveViolations++;
          if (caps[key] >= 2 && s.realmPieces[pl]![k]!.everCaptured !== true) m.forgiveViolations++;
        }
      }
      if (V.retiro) for (const k of REALM_PIECE_ORDER) if (bloomedIn(s, pl, k) && retired[pl + k] === undefined) retired[pl + k] = s.realmPieces[pl]![k]!.pos;
    }
    for (const pl of ["P1", "P2"] as PlayerId[]) {
      prog[pl] += REALM_PIECE_ORDER.filter((k) => { const a = s.realmPieces[pl]?.[k]; return a && a.unlocked && !a.inLimbo && H(a.pos); }).length;
      prog[(pl + "b") as "P1b"] += bloomedCount(s, pl);
    }
    const b = Math.max(bloomedCount(s, "P1"), bloomedCount(s, "P2"));
    if (b >= 5 && m.k5 < 0) m.k5 = turn + 1;
    if (b >= 6 && m.k6 < 0) m.k6 = turn + 1;
    if (TRACE) {
      const st = (pl: PlayerId) => REALM_PIECE_ORDER.map((k) => { const a = s.realmPieces[pl]?.[k]; if (!a || !a.unlocked) return "-";
        const tag = a.inLimbo ? "M" : H(a.pos) ? "H" : String(a.pos); return tag + (s.consolidatedAvatars[pl]?.[k] ? "*" : "") + (a.everCaptured ? "x" : ""); }).join(",");
      trace.push(`${turn + 1} ${p} ${c === "pass" ? "PASA" : c.kind} b=${bloomedCount(s, "P1")}/${bloomedCount(s, "P2")} P1[${st("P1")}] P2[${st("P2")}]`);
    }
    turn++;
  }
  m.turns = turn; m.winner = s.winner;
  (m as unknown as { births: Record<string, number> }).births = birthDist;
  (m as unknown as { prog: object }).prog = { humanosP1: prog.P1 / turn, humanosP2: prog.P2 / turn, lotosP1: prog.P1b / turn, lotosP2: prog.P2b / turn };
  if (TRACE && turn > 800) appendFileSync(TRACE, `### ${variant} seed=${seed} turns=${turn} winner=${s.winner}\n` + trace.join("\n") + "\n");
  return m;
}
for (let i = 0; i < Number(nStr); i++) {
  const r = playOne(Number(seedStr) + i);
  process.stdout.write(JSON.stringify({ variant, zones: ZONES ?? "actual", l1, l2, ...r }) + "\n");
}
