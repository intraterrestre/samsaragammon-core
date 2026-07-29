export type ActorId =
  | "bruno"
  | "margot"
  | "marino"
  | "oriol"
  | "rufus"
  | "whitman";

export type VenomId = "pig" | "snake" | "rooster";

export type ActorProfile = {
  id: ActorId;
  name: string;

  desire: string;
  fear: string;
  virtue: string;

  // Peso del Veneno según el Avatar que lo usa (0..1)
  // El mismo Veneno tiene distinto significado según la conciencia que lo expresa.
  // Bruno + Gallo = hambre/acumulación instintiva
  // Whitman + Gallo = amor universal, deseo de bien ajeno
  animalAffinity: Record<VenomId, number>;

  // Modificador de karma cuando este Avatar usa cada Veneno
  // Positivo = más peso kármico, Negativo = menos peso
  venomKarmaModifier: Record<VenomId, number>;

  description: string;
  eraDescription: string;
};

export const ACTOR_PROFILES: Record<ActorId, ActorProfile> = {
  bruno: {
    id: "bruno",
    name: "Bruno",

    desire: "survival",
    fear: "unknown",
    virtue: "instinct",

    animalAffinity: {
      pig: 0.9,    // ignorancia pura — acto sin comprender
      snake: 0.6,  // huida animal ante el peligro
      rooster: 0.8, // hambre, acumulación instintiva
    },

    venomKarmaModifier: {
      pig: 1.4,    // máximo peso — Bruno es ignorancia encarnada
      snake: 1.0,
      rooster: 1.2,
    },

    description: "Se mueve por supervivencia pura. No anticipa. Reacciona.",
    eraDescription: "Humanidad prehistórica profunda. Origen de la mitología y la dependencia.",
  },

  margot: {
    id: "margot",
    name: "Margot",

    desire: "security",
    fear: "loss",
    virtue: "prudence",

    animalAffinity: {
      pig: 0.9,    // ignorancia del dolor — no sabe por qué sufre
      snake: 0.8,  // miedo religioso, aversión al desconocido
      rooster: 0.3, // poca codicia — más miedo que deseo
    },

    venomKarmaModifier: {
      pig: 1.2,
      snake: 1.4,  // máximo peso — Margot es miedo encarnado
      rooster: 0.7,
    },

    description: "Prefiere proteger lo conseguido antes que arriesgarlo todo.",
    eraDescription: "Nacimiento del Homo Religiosus. Neolítico. La religión como anestesia del miedo.",
  },

  oriol: {
    id: "oriol",
    name: "Oriol",

    desire: "control",
    fear: "weakness",
    virtue: "organization",

    animalAffinity: {
      pig: 0.7,    // ignorancia del vacío interno
      snake: 0.5,  // control agresivo, no miedo
      rooster: 1.0, // acumulación de poder — máxima afinidad
    },

    venomKarmaModifier: {
      pig: 1.0,
      snake: 0.9,
      rooster: 1.5, // máximo peso — Oriol es deseo de control encarnado
    },

    description: "Persigue el control y la acumulación. La alegría le dura poco.",
    eraDescription: "Era de los Metales. Primer alejamiento entre el ser humano y su naturaleza curva.",
  },

  marino: {
    id: "marino",
    name: "Marino",

    desire: "connection",
    fear: "isolation",
    virtue: "empathy",

    animalAffinity: {
      pig: 0.4,    // ignorancia casi superada
      snake: 0.9,  // bloqueo emocional — siente pero no expresa
      rooster: 0.6, // Amort no expresado — deseo de conexión
    },

    venomKarmaModifier: {
      pig: 0.8,
      snake: 1.3,  // máximo — Marino es apego y bloqueo emocional
      rooster: 1.0,
    },

    description: "Siente algo enorme que no puede nombrar. Lo llama Amort.",
    eraDescription: "Antigüedad Clásica. Descubre el amor pero no sabe decirlo.",
  },

  rufus: {
    id: "rufus",
    name: "Rufus",

    desire: "expression",
    fear: "repression",
    virtue: "passion",

    animalAffinity: {
      pig: 0.2,    // ignorancia casi disuelta
      snake: 0.7,  // rechazo consciente de dogmas
      rooster: 1.0, // pasión expresada — máxima afinidad
    },

    venomKarmaModifier: {
      pig: 0.6,
      snake: 1.0,
      rooster: 1.2, // Rufus expresa el deseo con conciencia
    },

    description: "Ama y puede expresarlo. Por primera vez la transformación es consciente.",
    eraDescription: "Edad Media / Renacimiento. El Paraíso no porque el mundo cambió, sino él.",
  },

  whitman: {
    id: "whitman",
    name: "Whitman",

    desire: "unity",
    fear: "separation",
    virtue: "wisdom",

    animalAffinity: {
      pig: 0.1,    // ignorancia casi eliminada
      snake: 0.4,  // compasión activa — no aversión
      rooster: 0.3, // amor universal — no deseo personal
    },

    venomKarmaModifier: {
      pig: 0.4,    // poco peso — Whitman casi no la usa
      snake: 0.6,  // compasión, no miedo
      rooster: 0.5, // amor universal, no codicia
    },

    description: "Ve a Dios en todo. La separación es la trampa del ego.",
    eraDescription: "Edad Moderna / Iluminación. La iluminación no es escapar del Samsara sino jugar con otra conciencia.",
  },
};

// Calcula el modificador de intensidad kármica
// para una acción de un Avatar usando un Veneno específico
export function getVenomKarmaWeight(
  actorId: ActorId,
  venomId: VenomId
): number {
  const profile = ACTOR_PROFILES[actorId];
  if (!profile) return 1.0;
  return profile.venomKarmaModifier[venomId] ?? 1.0;
}

// Calcula la afinidad del Avatar con el Veneno (0..1)
// Afecta qué tan naturalmente fluye esa combinación
export function getVenomAffinity(
  actorId: ActorId,
  venomId: VenomId
): number {
  const profile = ACTOR_PROFILES[actorId];
  if (!profile) return 0.5;
  return profile.animalAffinity[venomId] ?? 0.5;
}
