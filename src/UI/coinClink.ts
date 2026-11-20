// src/UI/coinClink.ts — 20 nov 2026.
//
// Federico: "un CLINC original para aceptar: dos monedas chocando, breve
// y reconocible". Sin archivo de audio: se genera aquí con Web Audio.
// Cada golpe es un puñado de parciales inarmónicos (como un disco de
// metal) con ataque instantáneo y caída rápida; dos golpes a ~85 ms, el
// segundo un poco más agudo y más suave. Dura ~0,5 s.
//
// iPad/iPhone: el AudioContext arranca suspendido hasta que el jugador
// toca la pantalla; se reanuda en cada toque (barato si ya está activo).

type Ctx = AudioContext;
let ctx: Ctx | null = null;

function getCtx(): Ctx | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  try {
    ctx = new C();
  } catch {
    ctx = null;
  }
  return ctx;
}

if (typeof window !== "undefined") {
  const wake = () => {
    const c = getCtx();
    if (c && c.state === "suspended") void c.resume().catch(() => {});
  };
  window.addEventListener("pointerdown", wake, { passive: true });
  window.addEventListener("keydown", wake);
}

// Relaciones de un disco metálico (aprox.), sobre la fundamental.
const PARTIALS: [ratio: number, gain: number, decay: number][] = [
  [1, 0.55, 0.22],
  [2.32, 0.4, 0.16],
  [4.25, 0.28, 0.1],
  [6.63, 0.18, 0.07],
];

function strike(c: Ctx, at: number, base: number, level: number, out: AudioNode) {
  for (const [ratio, g, decay] of PARTIALS) {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(base * ratio, at);
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, at);
    env.gain.exponentialRampToValueAtTime(g * level, at + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, at + decay * 2.2);
    osc.connect(env).connect(out);
    osc.start(at);
    osc.stop(at + decay * 2.4);
  }
  // Chasquido del contacto: ruido muy corto y agudo.
  const len = Math.floor(c.sampleRate * 0.012);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 5000;
  const ng = c.createGain();
  ng.gain.value = 0.25 * level;
  noise.connect(hp).connect(ng).connect(out);
  noise.start(at);
}

/** Dos monedas que chocan: "¡clin, clin!". Silencioso si no hay audio. */
export function playCoinClink(volume = 0.8): void {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  const out = c.createGain();
  out.gain.value = volume;
  out.connect(c.destination);
  const t0 = c.currentTime + 0.02;
  strike(c, t0, 1850, 1, out);
  strike(c, t0 + 0.085, 2150, 0.75, out);
}
