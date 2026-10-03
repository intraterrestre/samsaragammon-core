// src/i18n/en.ts — English (idioma base: todas las claves salen de aquí).
//
// Para añadir un idioma: copiar este archivo (p. ej. it.ts), traducir los
// valores sin tocar las claves ni los {marcadores}, y registrarlo en
// src/i18n/index.ts. TypeScript avisa si falta alguna clave.

export const en = {
  // ---- idioma
  "lang.name": "English",

  // ---- login
  "login.question": "WANT OUT OF THE SAMSARA WHEEL?",
  "login.then": "THEN",
  "login.breakTheBox": "BREAK THE BOX.",
  "login.emailPlaceholder": "Your email",
  "login.sending": "Sending…",
  "login.proveIt": "PROVE IT",
  "login.checkEmail": "Check your email…",
  "login.verifying": "Verifying…",
  "login.enter": "ENTER",
  "login.changeEmail": "← Change email",
  "login.invalidCode": "Invalid code. Try again.",
  "login.couldNotSend": "Could not send the code. Check your connection and try again.",
  "login.couldNotSendDetail": "Could not send: {detail}",
  "login.couldNotVerify": "Could not verify the code. Check your connection and try again.",
  "login.couldNotVerifyDetail": "Could not verify: {detail}",

  // ---- lobby
  "login.back": "← Back",
  "lobby.playOnline": "Play online with someone",
  "lobby.playOnlineSub": "Needs your email",
  "lobby.playWithBuddha": "PLAY WITH BUDDHA",
  "lobby.playWithBuddhaSub": "First time? Buddha will guide you.",
  "lobby.creating": "Creating…",
  "lobby.createGame": "Create game",
  "lobby.shareCode": "Share this code with your opponent:",
  "lobby.copyCode": "Copy code",
  "lobby.waiting": "Waiting for opponent…",
  "lobby.codePlaceholder": "Game code (e.g. KARMA-7X3)",
  "lobby.join": "Join",
  "lobby.playLocal": "Play local (hot-seat)",

  // ---- PASS
  "pass.noPath": "NO PATH THIS ROLL",
  "pass.button": "PASS",

  // ---- ASK BUDDHA (hoja de ayuda)
  "ask.title": "ASK BUDDHA",
  "ask.now": "WHAT CAN I DO NOW?",
  "ask.win": "HOW DO I WIN?",
  "ask.happened": "WHAT JUST HAPPENED?",
  "ask.mirror": "LOOK IN THE MIRROR ({n} LEFT)",
  "ask.close": "CLOSE",

  // ---- lecciones (Buddha las dice una vez, en mayúsculas)
  "lesson.noMove": "No path this roll. Pass, and the wheel turns.",
  "lesson.firstAvatar": "Bruno is your first Avatar. He moves through ignorance, impulse or anger.",
  "lesson.secondAvatar": "Margot is born. Six Avatars will come, one by one.",
  "lesson.phase2": "Now your animals follow. Tap an Avatar, then an animal.",
  "lesson.whitman": "Whitman is here. Six sealed Avatars in Humans wins.",
  "lesson.sealed": "Home and sealed. Six sealed Avatars in Humans wins.",
  "lesson.unsealed": "It was captured once. Seal it with 666 or 777.",
  "lesson.pig": "Back from Mara, this one must move first.",
  "lesson.mara": "Captured! It goes to Mara for six rolls. Then it is reborn in a random realm, never in Humans.",
  "lesson.nidanaSpawn": "That coin is one of the 12 Nidanas (below). Now it waits on a square: an Avatar collects it by landing there inside its own realm.",
  "lesson.nidanaCarry": "Nidana collected! It saves this Avatar from Mara once, but the attacker steals it.",
  "lesson.nidanaMirror": "This coin names a link of your karma. Buddha reads it from the way you play.",
  "lesson.maraReturn": "Back from Mara. To defeat Samsara, it will later have to reach the Realm of Humans.",
  "lesson.capture": "Red line: land alone on a rival to send it to Mara.",
  "lesson.nidanaCollect": "An Avatar collects a Nidana in its own realm.",
  "lesson.block": "Two pieces together are safe. Nobody can land there.",
  "lesson.threeAnimals": "Try all three animals. Something is waiting to wake.",
  "lesson.move": "Tap a glowing piece, then a line.",
  "lesson.threePoisons": "You play with three animals: the Pig (ignorance), the Snake (anger) and the Rooster (impulse). The forces that move every life.",
  "lesson.sixRealms": "As the game goes on, these green squares will turn into six different sections called realms. Your goal is Humans.",
  "lesson.brunoEra": "All that happened in a flash: more than two and a half million years. Then came the first human. We call him Bruno.",
  "lesson.dismiss": "Close",
  "mirror.opens": "THE MIRROR OPENS.",
  "lesson.mirror": "THE MIRROR OPENS\nUntil now, Buddha has taught you how to play.\nNow he can begin to observe how you play.\nYou have 4 looks into the mirror during the game.",
  "lesson.roll": "Your turn. Roll the stones.",

  // ---- nombres
  "venom.pig": "Pig",
  "venom.snake": "Snake",
  "venom.rooster": "Rooster",
  "color.P1": "White",
  "color.P2": "Black",
  "realm.hungry_ghost": "Hungry Ghosts",
  "realm.hell": "Hell",
  "realm.animals": "Animals",
  "realm.humans": "Humans",
  "realm.asura": "Titans",
  "realm.deva": "SemiGods",
  "list.or": "or",

  // ---- ayuda: ¿qué puedo hacer?
  "help.gameOver": "The game is over. {color} reached Nirvana.",
  "help.roll": "Roll the stones: tap the dice.",
  "help.noPath": "No path this roll.",
  "help.pressPass": "Press PASS. The wheel keeps turning.",
  "help.rolled": "You rolled {a} and {b}.",
  "help.tapPiece": "Tap a glowing piece ({pieces}), then a line.",
  "help.pigForced": "{name} just came back from Mara and must move first.",
  "help.tapPigAvatar": "Tap {name}, then one of the animals.",
  "help.tapAvatar": "Tap an Avatar that can move: {names}.",
  "help.thenAnimal": "Then tap an animal. The animal decides where the Avatar lands.",
  "help.avatarChosen": "{name} is chosen.",
  "help.tapVenom": "Now tap {venoms}, then a line.",
  "help.redLine": "A red line captures: it sends that piece to Mara.",
  "help.dharma": "Round Dharma 777: you may spare a rival in Humans and seal one of yours instead.",
  "help.collect": "One of your lines lands on a Nidana in its own realm: it would collect it.",

  // ---- ayuda: ¿cómo gano?
  "win.goal": "Bring your six Avatars to Humans, sealed.",
  "win.autoSeal": "An Avatar seals itself if it reaches Humans without ever being captured.",
  "win.revenge": "If it was captured once, seal it with Square Karma 666 or Round Dharma 777.",
  "win.count": "You have {n} of 6 sealed in Humans.",
  "win.whitmanGate": "Victory opens when Whitman, your sixth Avatar, is born.",
  "win.notBorn": "{name}: not born yet",
  "win.inMara": "{name}: in Mara",
  "win.sealedHere": "{name}: sealed, in Humans",
  "win.sealedAway": "{name}: sealed, must return to Humans",
  "win.hereUnsealed": "{name}: in Humans, not sealed (needs 666 or 777)",
  "win.willNeed": "{name}: will need 666 or 777 to seal",
  "win.onWay": "{name}: on its way",

  // ---- ayuda: ¿qué pasó?
  "happened.nothing": "Nothing yet. The wheel is waiting for the first move.",
  "happened.moved": "{who} moved {mover}{via} from {from} (cell {fromPos}) to {to} (cell {toPos}), using {value}.",
  "happened.via": " with the {venom}",
  "happened.captured": "It captured {victim}'s {piece}.",
  "happened.shielded": "Its Nidana shielded it: it escaped Mara, but lost the Nidana.",
  "happened.toMara": "It waits in Mara for 6 rolls, then is reborn in a random realm, never in Humans.",
  "happened.declined": "A capture was possible, but another path was chosen.",
} as const;

export type MessageKey = keyof typeof en;
export type Dictionary = Record<MessageKey, string>;
