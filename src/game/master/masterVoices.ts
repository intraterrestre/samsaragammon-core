export const MASTER_LINES = {
  neutral: [
    "The wheel still turns.",
    "Not all movement is progress.",
    "You moved. The pattern remained.",
    "The move was not random.",
  ],

  impact: [
    "Force was used. Balance will answer.",
    "You struck… but what did you remove?",
    "Something ended. Something follows.",
    "Victory outside. Question inside.",
  ],

  setbackImpact: [
    "The obstacle returned to its root.",
    "You struck true. The wheel held.",
    "Something fell away. You remain where you are.",
    "Impulse lost ground. The path did not yet open.",
  ],

  pattern: [
    "You chose this twice.",
    "Again… the same hand.",
    "You already knew this path.",
    "The pattern is learning you.",
  ],

  illusion: [
    "You saw… but not clearly.",
    "Understanding is not freedom.",
    "That felt right. Be careful.",
    "The illusion refined itself.",
  ],

  flow: [
    "The movement softened.",
    "Less resistance… less return.",
    "For a moment… no weight.",
    "Almost no trace.",
  ],
};

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getMasterLine(params: {
  didCapture: boolean;
  patternScore: number;
  realm: string;
  fromPos?: number;
  toPos?: number;
}) {
  const samePlace =
    params.fromPos != null &&
    params.toPos != null &&
    params.fromPos === params.toPos;

  if (params.didCapture && samePlace) {
    return pick(MASTER_LINES.setbackImpact);
  }

  if (params.didCapture) {
    return pick(MASTER_LINES.impact);
  }

  if (params.patternScore < 0) {
    return pick(MASTER_LINES.pattern);
  }

  if (params.patternScore > 2) {
    return pick(MASTER_LINES.flow);
  }

  if (params.realm === "ASURA") {
    return pick(MASTER_LINES.illusion);
  }

  return pick(MASTER_LINES.neutral);
}