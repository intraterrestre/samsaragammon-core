import type { PieceKind, MoveMeaning } from "../types";
import type { RealmId } from "../realms";
import type { NidanaId } from "../nidanas";

export type NidanaOutcome =
  | "IMPACT"
  | "DEFLECTED"
  | "LOOP"
  | "FLOW"
  | "RISK";

export type NidanaResolution = {
  outcome: NidanaOutcome;
  line: string;
};

function clampToTacticalReality(
  desired: NidanaResolution,
  tacticalMeaning: MoveMeaning
): NidanaResolution {
  // Si la lectura nidánica quiere IMPACT pero la jugada real no impacta,
  // la bajamos a algo compatible con la realidad táctica.
  if (desired.outcome === "IMPACT" && tacticalMeaning !== "IMPACT") {
    if (tacticalMeaning === "RISK") {
      return {
        outcome: "RISK",
        line: "The link leans toward danger, but no strike lands.",
      };
    }

    if (tacticalMeaning === "SAME") {
      return {
        outcome: "FLOW",
        line: "The pattern folds back into itself.",
      };
    }

    return {
      outcome: "FLOW",
      line: "The link passes lightly.",
    };
  }

  return desired;
}

export function resolveNidanaOutcome(params: {
  realm: RealmId;
  nidana: NidanaId;
  creature: PieceKind;
  tacticalMeaning: MoveMeaning;
}): NidanaResolution {
  const { realm, nidana, creature, tacticalMeaning } = params;

  let result: NidanaResolution = {
    outcome: "FLOW",
    line: "The link passes lightly.",
  };

  if (realm === "ANIMALS" && nidana === "CRAVING" && creature === "pig") {
    result = {
      outcome: "LOOP",
      line: "Instinct seeks without seeing.",
    };
  } else if (
    realm === "ANIMALS" &&
    nidana === "CONTACT" &&
    creature === "snake"
  ) {
    result = {
      outcome: "RISK",
      line: "Reaction rises before reflection.",
    };
  } else if (
    realm === "ANIMALS" &&
    nidana === "FEELING" &&
    creature === "rooster"
  ) {
    result = {
      outcome: "IMPACT",
      line: "Impulse strikes from sensation.",
    };
  } else if (
    realm === "HUNGRY_GHOST" &&
    nidana === "CLINGING" &&
    creature === "pig"
  ) {
    result = {
      outcome: "LOOP",
      line: "Hunger closes its own hand.",
    };
  } else if (
    realm === "HUNGRY_GHOST" &&
    nidana === "CRAVING" &&
    creature === "rooster"
  ) {
    result = {
      outcome: "RISK",
      line: "Desire lunges toward what cannot satisfy.",
    };
  } else if (
    realm === "ASURA" &&
    nidana === "CLINGING" &&
    creature === "snake"
  ) {
    result = {
      outcome: "DEFLECTED",
      line: "Conflict hardens the strike.",
    };
  } else if (
    realm === "ASURA" &&
    nidana === "BECOMING" &&
    creature === "rooster"
  ) {
    result = {
      outcome: "IMPACT",
      line: "Ambition sharpens the blow.",
    };
  } else if (
    realm === "DEVA" &&
    nidana === "IGNORANCE" &&
    creature === "pig"
  ) {
    result = {
      outcome: "FLOW",
      line: "Comfort hides the chain.",
    };
  } else if (
    realm === "DEVA" &&
    nidana === "FEELING" &&
    creature === "snake"
  ) {
    result = {
      outcome: "DEFLECTED",
      line: "Pleasure recoils from loss.",
    };
  } else if (realm === "HUMANS") {
    if (creature === "pig") {
      result = {
        outcome: "FLOW",
        line: "The human path still allows correction.",
      };
    } else if (creature === "snake") {
      result = {
        outcome: "RISK",
        line: "The mind tightens around reaction.",
      };
    } else {
      result = {
        outcome: "IMPACT",
        line: "Choice becomes action.",
      };
    }
  }

  return clampToTacticalReality(result, tacticalMeaning);
}