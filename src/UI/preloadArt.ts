// src/UI/preloadArt.ts — 21 nov 2026.
//
// Federico, en Safari del iPhone: "salía el tablero sin fondo y luego
// vino esa foto". Los murales del tablero pesan ~3 MB cada uno; con datos
// móviles el tablero se dibujaba antes de que el mural terminara de
// bajar. Aquí se bajan y se decodifican por adelantado, y quien los
// muestra puede esperar a que estén listos.

const ready = new Map<string, Promise<void>>();

/** Baja y decodifica una imagen una sola vez. Nunca falla: si no carga,
 *  resuelve igual (mejor un tablero sin fondo que un juego colgado). */
export function preloadImage(url: string): Promise<void> {
  const known = ready.get(url);
  if (known) return known;
  const p = new Promise<void>((resolve) => {
    if (typeof Image === "undefined") return resolve();
    const img = new Image();
    img.decoding = "async";
    const done = () => resolve();
    img.onload = () => {
      if (typeof img.decode === "function") img.decode().then(done, done);
      else done();
    };
    img.onerror = done;
    img.src = url;
  });
  ready.set(url, p);
  return p;
}

/** Como preloadImage, pero no espera más de `ms` (red muy lenta). */
export function preloadWithin(url: string, ms: number): Promise<void> {
  return Promise.race([preloadImage(url), new Promise<void>((r) => window.setTimeout(r, ms))]);
}
