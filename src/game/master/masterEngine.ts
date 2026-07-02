// src/game/master/masterEngine.ts
import data from "./yingyang.en.json";
import type { KarmaOracleReading } from "../Karma/KarmaOracle";

export type MasterWhen =
  | "start"
  | "roll"
  | "cross"
  | "capture"
  | "karma"
  | "dharma"
  | "realm_up"
  | "realm_repeat"
  | "victory"
  | "defeat"
  | "vestigium";

type Phrase = { when: MasterWhen; text: string };

type MasterPack = {
  meta?: { name?: string; version?: string; lang?: string };
  phrases: Phrase[];
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function masterLine(
  when: MasterWhen,
  vars: { from?: number; to?: number; dif?: number; evento?: string } = {}
): string {
  const pack = data as MasterPack;
  const pool = (pack.phrases ?? []).filter((p) => p.when === when);

  const base = pool.length ? pick(pool).text : "Observe… and play.";

  return fill(base, {
    from: String(vars.from ?? ""),
    to: String(vars.to ?? ""),
    dif: String(vars.dif ?? ""),
    evento: String(vars.evento ?? ""),
  });
}

export function masterOracleLine(
  oracle: KarmaOracleReading,
  level: number = 1
): string {
  if (level <= 1) {
    return `The Master observes. ${oracle.summary}`;
  }

  if (level === 2) {
    return `The Master opens the book.\n\nPoison sensed: ${oracle.poison}.\n${oracle.summary}`;
  }

  if (level === 3) {
    return `The Master consults the ledger.\n\nPoison: ${oracle.poison}\nNidana: ${oracle.nidana}\nRealm: ${oracle.realm}\n\n${oracle.summary}`;
  }

  return `📖 The Ledger of Karma\n\nPoison: ${oracle.poison}\nNidana: ${oracle.nidana}\nRealm: ${oracle.realm}\nMultiplier: ×${oracle.multiplier.toFixed(
    2
  )}\n\n${oracle.summary}`;
}