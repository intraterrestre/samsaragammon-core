// src/UI/updateCheck.ts — 21 nov 2026.
//
// Federico juega desde el icono de la pantalla de inicio (app web, sin
// barra de Safari). El iPhone deja esa app dormida y, al volver, sigue
// con la versión vieja. Aquí: al volver a la app (y cada 10 minutos
// mientras está abierta) se mira si la versión publicada es otra. Si lo
// es, aparece un aviso discreto con "Actualizar". Nunca se recarga sola:
// quien juega decide cuándo (por ejemplo, al terminar la partida).
//
// Cómo se sabe la versión: cada publicación cambia el nombre del script
// principal (/assets/index-XXXX.js). Se compara el de esta página con el
// del index.html publicado ahora.

import { getLang } from "../i18n";

const SCRIPT_RE = /\/assets\/index-[\w-]+\.js/;

function currentScript(): string | null {
  for (const s of Array.from(document.querySelectorAll("script[src]"))) {
    const m = (s as HTMLScriptElement).src.match(SCRIPT_RE);
    if (m) return m[0];
  }
  return null;
}

async function publishedScript(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return null;
    const m = (await res.text()).match(SCRIPT_RE);
    return m ? m[0] : null;
  } catch {
    return null; // sin red: nada que decir
  }
}

let shown = false;
function showNotice() {
  if (shown) return;
  shown = true;
  const es = getLang() === "es";
  const box = document.createElement("div");
  box.setAttribute("role", "status");
  box.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:calc(max(10px, env(safe-area-inset-bottom)) + 6px)",
    "transform:translateX(-50%)",
    "z-index:2000000",
    "display:flex",
    "align-items:center",
    "gap:10px",
    "padding:8px 10px 8px 16px",
    "border-radius:999px",
    "background:rgba(20,14,2,0.88)",
    "border:1px solid #ffd24a",
    "color:#fff3c4",
    "font-family:Georgia,'Times New Roman',serif",
    "font-size:14px",
    "box-shadow:0 4px 18px rgba(0,0,0,0.5)",
  ].join(";");
  const text = document.createElement("span");
  text.textContent = es ? "Hay una versión nueva" : "A new version is ready";
  const update = document.createElement("button");
  update.type = "button";
  update.textContent = es ? "Actualizar" : "Update";
  update.style.cssText =
    "border:1px solid #ffd24a;background:#ffd24a;color:#1a1200;border-radius:999px;padding:4px 12px;font-weight:700;font-size:13px;cursor:pointer";
  update.onclick = () => window.location.reload();
  const later = document.createElement("button");
  later.type = "button";
  later.textContent = "✕";
  later.setAttribute("aria-label", es ? "Más tarde" : "Later");
  later.style.cssText =
    "border:none;background:transparent;color:#fff3c4;font-size:15px;padding:2px 6px;cursor:pointer;opacity:0.8";
  later.onclick = () => {
    box.remove();
    shown = false;
    snoozedUntil = Date.now() + 30 * 60 * 1000; // vuelve a avisar en 30 min
  };
  box.append(text, update, later);
  document.body.appendChild(box);
}

let snoozedUntil = 0;
let checking = false;
async function check() {
  if (checking || shown || Date.now() < snoozedUntil) return;
  const mine = currentScript();
  if (!mine) return;
  checking = true;
  try {
    const live = await publishedScript();
    if (live && live !== mine) showNotice();
  } finally {
    checking = false;
  }
}

export function startUpdateCheck(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void check();
  });
  window.addEventListener("focus", () => void check());
  window.setInterval(() => {
    if (document.visibilityState === "visible") void check();
  }, 10 * 60 * 1000);
  window.setTimeout(() => void check(), 15000);
}
