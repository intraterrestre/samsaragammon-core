export type ActorId =
  | "bruno"
  | "margot"
  | "marino"
  | "oriol"
  | "rufus"
  | "whitman";

export type ActorProfile = {
  id: ActorId;
  name: string;

  desire: string;
  fear: string;
  virtue: string;

  animalAffinity: {
    pig: number;
    snake: number;
    rooster: number;
  };

  description: string;
};

export const ACTOR_PROFILES: Record<ActorId, ActorProfile> = {
  bruno: {
    id: "bruno",
    name: "Bruno",

    desire: "approval",
    fear: "rejection",
    virtue: "kindness",

    animalAffinity: {
      pig: 0.8,
      snake: 0.4,
      rooster: 0.7,
    },

    description:
      "Se mueve buscando aceptación. Sufre cuando siente que no pertenece.",
  },

  margot: {
    id: "margot",
    name: "Margot",

    desire: "security",
    fear: "loss",
    virtue: "prudence",

    animalAffinity: {
      pig: 0.9,
      snake: 0.6,
      rooster: 0.3,
    },

    description:
      "Prefiere proteger lo conseguido antes que arriesgarlo todo.",
  },

  marino: {
    id: "marino",
    name: "Marino",

    desire: "knowledge",
    fear: "ignorance",
    virtue: "curiosity",

    animalAffinity: {
      pig: 0.4,
      snake: 0.9,
      rooster: 0.5,
    },

    description:
      "Busca comprender el mundo antes de actuar sobre él.",
  },

  oriol: {
    id: "oriol",
    name: "Oriol",

    desire: "pleasure",
    fear: "discomfort",
    virtue: "joy",

    animalAffinity: {
      pig: 0.8,
      snake: 0.5,
      rooster: 0.9,
    },

    description:
      "Persigue experiencias intensas y disfruta explorando posibilidades.",
  },

  rufus: {
    id: "rufus",
    name: "Rufus",

    desire: "power",
    fear: "weakness",
    virtue: "courage",

    animalAffinity: {
      pig: 0.2,
      snake: 0.8,
      rooster: 1.0,
    },

    description:
      "Quiere imponerse a los obstáculos y demostrar fortaleza.",
  },

  whitman: {
    id: "whitman",
    name: "Whitman",

    desire: "liberation",
    fear: "meaninglessness",
    virtue: "wisdom",

    animalAffinity: {
      pig: 0.3,
      snake: 0.7,
      rooster: 0.4,
    },

    description:
      "Busca comprender el Samsara y encontrar la salida del ciclo.",
  },
};