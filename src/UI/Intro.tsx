// src/UI/Intro.tsx — pantalla de entrada.
//
// 25 nov 2026 — "A PAINTING YOU CAN PLAY" (aprobado por Federico). La
// bienvenida es la pintura: fotos reales del proceso, elegidas y ordenadas
// por Federico (src/assets/welcome/01…12), que se suceden a pantalla
// completa la PRIMERA vez que se abre el juego en este aparato. Las
// siguientes veces (o con "reducir movimiento" activado) se ve quieta la
// obra terminada, con el botón directo.
//
// Encima, poco texto: el nombre, A PAINTING YOU CAN PLAY, dos líneas y
// ¡DESPIERTA LA RUEDA! El texto largo (dados, perdón, Vestigium, Buddha)
// queda en "Descubre la experiencia"; la historia completa de la pintura,
// en la web (sección V del archivo curvista). Sin mencionar el Backgammon.
//
// El botón ¡DESPIERTA LA RUEDA! sigue siendo el toque que Safari necesita
// para dejar sonar el audio: el video corto de la rueda arranca DENTRO de
// ese toque (aparece fundiéndose sobre la pintura, que se abre a la obra
// entera) y después el juego.
import BrandWordmark from "./BrandWordmark";
import React from "react";
import introShort from "../assets/video/intro_short.mp4";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { NarratorSwitch } from "./NarratorSwitch";
import { markReadySplashDone } from "./readySplashState";

const PHOTOS = Object.values(
  import.meta.glob("../assets/welcome/*.webp", { eager: true, query: "?url", import: "default" }) as Record<
    string,
    string
  >,
).sort();
const LAST = PHOTOS.length - 1;
const SEEN_KEY = "sg.welcomeSeen";
const STEP_MS = 1900;
// 25 nov 2026 — Federico: el lema es el original, en inglés y literal, en
// todos los idiomas (marca, como en el Kickstarter). Lo demás sí se traduce.
const MOTTO = {
  title: "A PAINTING YOU CAN PLAY.",
  back: "Some games take you back.",
  beyond: "Samsaragammon takes you beyond.",
  go: "WAKE UP THE WHEEL!",
};
const ARCHIVE_URL = "https://federicogarcia.art/curvism-art-archive#from-painting-to-participation";

function firstTime(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== "1";
  } catch {
    return true;
  }
}
function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // sin almacenamiento: se verá animada otra vez, no pasa nada
  }
}
function reducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export default function Intro({ onEnd }: { onEnd: () => void }) {
  const { t } = useI18n();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [animate] = React.useState(() => firstTime() && !reducedMotion() && PHOTOS.length > 1);
  const [index, setIndex] = React.useState(animate ? 0 : LAST);

  // La pintura avanza en su orden real; cada foto espera a estar cargada.
  React.useEffect(() => {
    if (!animate || started) return;
    if (index >= LAST) {
      markSeen();
      return;
    }
    let alive = true;
    let timer = 0;
    const next = new Image();
    next.src = PHOTOS[index + 1];
    const go = () => {
      timer = window.setTimeout(() => alive && setIndex((i) => i + 1), STEP_MS);
    };
    if (next.complete) go();
    else {
      next.onload = go;
      next.onerror = go;
    }
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [animate, index, started]);

  const finish = () => {
    // La bienvenida ya hizo de "READY TO PLAY": no repetir otra pantalla.
    markReadySplashDone();
    onEnd();
  };

  const start = async () => {
    markSeen();
    setSheetOpen(false);
    setIndex(LAST);
    setStarted(true);
    const v = videoRef.current;
    if (!v) return finish();
    try {
      v.muted = false;
      v.volume = 1;
      await v.play();
    } catch {
      finish(); // sin video (o bloqueado): directo al juego
    }
  };

  // 25 nov 2026 — Federico: "no vi las opciones de jugar con Buddha". La
  // primera visita entra directa en JUEGA CON BUDDHA; este enlace lleva en
  // cambio al menú completo (en grupo, a distancia, nivel de Buddha…).
  const startMenu = () => {
    try {
      localStorage.setItem("sg.visited", "1");
    } catch {
      // sin almacenamiento: entra igual que siempre
    }
    void start();
  };

  const bodyLines = t("welcome.body").split("\n").filter(Boolean);

  return (
    <div className={`sgw${started ? " sgw-waking" : ""}${animate ? " sgw-anim" : ""}`}>
      <style>{CSS}</style>
      <div className="sgw-stage" aria-hidden="true">
        {PHOTOS.map((src, i) =>
          // Solo se montan las fotos ya alcanzadas (y la siguiente): la red
          // no baja las 12 de golpe. Cada foto nueva se funde ENCIMA de la
          // anterior. Quieta: solo la obra terminada.
          (animate ? i <= index + 1 : i === LAST) ? (
            <img
              key={src}
              src={src}
              alt=""
              decoding="async"
              className={`sgw-photo${i <= index ? " on" : ""}${i === index ? " cur" : ""}`}
            />
          ) : null,
        )}
        <div className="sgw-shade" />
      </div>

      <video
        ref={videoRef}
        src={introShort}
        playsInline
        preload="auto"
        onEnded={finish}
        onClick={finish}
        className="sgw-video"
      />

      {!started && (
        <>
          {/* Idioma y VOZ / TEXTO / AMBOS, antes de empezar. */}
          <div className="sgw-lang">
            <div><LanguageSwitch /></div>
            <div><NarratorSwitch /></div>
          </div>

          {animate && (
            <div className="sgw-trail" aria-hidden="true">
              {PHOTOS.map((src, i) => (
                <i key={src} className={i <= index ? "done" : ""} />
              ))}
            </div>
          )}

          <main className="sgw-copy">
            <div className="sgw-name">
              <BrandWordmark size={17} />
            </div>
            <h1 className="sgw-title">{MOTTO.title}</h1>
            <p className="sgw-tag">
              <span>{MOTTO.back}</span>
              <span className="sgw-beyond">{MOTTO.beyond}</span>
            </p>
            <button type="button" onClick={start} className="sgw-wake">
              {MOTTO.go}
            </button>
            <nav className="sgw-links">
              <button type="button" onClick={() => setSheetOpen(true)}>
                {t("welcome.more")}
              </button>
              <button type="button" onClick={startMenu}>
                {t("welcome.menu")}
              </button>
              <a href={ARCHIVE_URL} target="_blank" rel="noopener noreferrer">
                {t("welcome.archive")}
              </a>
            </nav>
          </main>

          <section className={`sgw-sheet${sheetOpen ? " open" : ""}`} aria-hidden={!sheetOpen}>
            <div className="sgw-scroll">
              {bodyLines.map((line, i) => {
                const strong = /^\*\*(.*)\*\*$/.exec(line);
                const soft = line.startsWith("~");
                return (
                  <p key={i} className={strong ? "hi" : soft ? "soft" : undefined}>
                    {strong ? strong[1] : soft ? line.slice(1) : line}
                  </p>
                );
              })}
            </div>
            <div className="sgw-foot">
              <button type="button" onClick={start} className="sgw-wake">
                {MOTTO.go}
              </button>
              <button type="button" onClick={() => setSheetOpen(false)} className="sgw-close">
                {t("welcome.close")}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const CSS = `
.sgw { position: fixed; inset: 0; z-index: 9999; background: #000; color: #efe6d2;
  font-family: Georgia, 'Times New Roman', serif; overflow: hidden; }
.sgw-stage { position: absolute; inset: 0; overflow: hidden; }
.sgw-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
  opacity: 0; transition: opacity 1.2s ease; transform: scale(1.02); }
.sgw-photo.on { opacity: 1; }
.sgw-anim .sgw-photo.cur { animation: sgwDrift 3.4s ease-out forwards; }
@keyframes sgwDrift { from { transform: scale(1.12); } to { transform: scale(1.02); } }
.sgw-shade { position: absolute; inset: 0; pointer-events: none; }
.sgw-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain;
  background: #000; opacity: 0; pointer-events: none; transition: opacity .9s ease .35s; z-index: 5; }
.sgw-waking .sgw-video { opacity: 1; pointer-events: auto; }
.sgw-waking .sgw-photo.cur { animation: none; transform: scale(1); transition: transform 1s ease, opacity .3s; }

.sgw-lang { position: absolute; z-index: 3; top: max(12px, env(safe-area-inset-top)); right: max(14px, env(safe-area-inset-right));
  display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.sgw-lang > * { background: rgba(0,0,0,.5); border-radius: 999px; }
.sgw-trail { position: absolute; z-index: 2; display: flex; gap: 4px; }
.sgw-trail i { display: block; width: 12px; height: 2px; background: rgba(239,230,210,.25); transition: background .6s; }
.sgw-trail i.done { background: rgba(245,215,110,.8); }

.sgw-copy { position: absolute; z-index: 2; display: flex; flex-direction: column; gap: 10px; text-align: left; }
.sgw-name { line-height: 1; }
.sgw-title { margin: 0; color: #f5d76e; font-weight: 800; line-height: 1.05; letter-spacing: .01em;
  font-family: Cinzel, Georgia, serif; text-shadow: 0 2px 18px rgba(0,0,0,.7); }
.sgw-tag { margin: 2px 0 6px; line-height: 1.35; text-shadow: 0 1px 10px rgba(0,0,0,.85); }
.sgw-tag span { display: block; }
.sgw-beyond { color: #f5d76e; font-style: italic; }
.sgw-wake { align-self: flex-start; height: 54px; padding: 0 30px; border-radius: 999px;
  border: 1px solid rgba(245,215,110,.85); background: linear-gradient(180deg, #3a3012, #1f1906);
  color: #ffe9a8; font-family: Cinzel, Georgia, serif; font-weight: 800; font-size: 16px; letter-spacing: .1em;
  cursor: pointer; box-shadow: 0 8px 30px rgba(0,0,0,.6), 0 0 26px rgba(245,215,110,.18); }
.sgw-links { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 2px; }
.sgw-links a, .sgw-links button { font: inherit; font-size: 13px; color: rgba(239,230,210,.85); background: none;
  border: 0; padding: 4px 0; cursor: pointer; text-decoration: none; border-bottom: 1px solid rgba(239,230,210,.35);
  text-shadow: 0 1px 8px rgba(0,0,0,.9); }

.sgw-sheet { position: absolute; z-index: 4; background: rgba(8,6,2,.9); border: 1px solid rgba(245,215,110,.25);
  display: flex; flex-direction: column; opacity: 0; transform: translateY(16px); pointer-events: none;
  transition: opacity .35s, transform .35s; }
.sgw-sheet.open { opacity: 1; transform: none; pointer-events: auto; }
.sgw-scroll { overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 20px 22px 6px; }
.sgw-scroll p { margin: 0 0 10px; line-height: 1.45; font-size: 15px; }
.sgw-scroll p.hi { color: #f5d76e; font-weight: 700; letter-spacing: .02em; }
.sgw-scroll p.soft { opacity: .8; margin-top: 14px; }
.sgw-foot { display: flex; gap: 14px; align-items: center; padding: 12px 22px max(14px, env(safe-area-inset-bottom));
  border-top: 1px solid rgba(245,215,110,.15); }
.sgw-close { font: inherit; font-size: 13px; color: rgba(239,230,210,.75); background: none; border: 0;
  cursor: pointer; text-decoration: underline; }

/* Horizontal y ordenador: el texto a la derecha, con un velo que deja ver la pintura. */
@media (min-aspect-ratio: 1/1) {
  .sgw-shade { background: linear-gradient(90deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.55) 58%, rgba(0,0,0,.85) 100%),
    linear-gradient(0deg, rgba(0,0,0,.45), rgba(0,0,0,0) 30%); }
  .sgw-copy { right: max(5vw, env(safe-area-inset-right)); top: 50%; transform: translateY(-50%); width: min(440px, 46vw); }
  .sgw-title { font-size: clamp(24px, min(4.6vw, 9vh), 56px); }
  .sgw-tag { font-size: clamp(14px, min(1.6vw, 3.8vh), 20px); }
  .sgw-trail { left: max(18px, env(safe-area-inset-left)); bottom: max(14px, env(safe-area-inset-bottom)); }
  /* Las pastillas arriba a la izquierda: a la derecha chocaban con el título. */
  .sgw-lang { right: auto; left: max(14px, env(safe-area-inset-left)); align-items: flex-start; }
  .sgw-sheet { right: 0; top: 0; bottom: 0; width: min(460px, 54vw); border-width: 0 0 0 1px; }
}
/* Teléfono horizontal: poca altura */
@media (min-aspect-ratio: 1/1) and (max-height: 500px) {
  .sgw-copy { gap: 6px; }
  .sgw-wake { height: 44px; font-size: 14px; padding: 0 22px; }
}
/* Vertical: la pintura arriba, el texto abajo */
@media (max-aspect-ratio: 1/1) {
  .sgw-shade { background: linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,0) 20%, rgba(0,0,0,0) 40%,
    rgba(0,0,0,.82) 66%, rgba(0,0,0,.95) 100%); }
  .sgw-copy { left: 22px; right: 22px; bottom: max(24px, calc(env(safe-area-inset-bottom) + 12px)); }
  .sgw-title { font-size: clamp(28px, 9.5vw, 46px); }
  .sgw-tag { font-size: 16px; }
  .sgw-wake { align-self: stretch; }
  .sgw-trail { left: 22px; top: max(70px, calc(env(safe-area-inset-top) + 62px)); }
  .sgw-photo { object-position: 28% 50%; }
  .sgw-sheet { left: 0; right: 0; bottom: 0; max-height: 78%; border-radius: 18px 18px 0 0; border-width: 1px 0 0; }
}
@media (prefers-reduced-motion: reduce) {
  .sgw-photo, .sgw-anim .sgw-photo.on, .sgw-waking .sgw-photo.cur { animation: none; transition: none; }
}
`;
