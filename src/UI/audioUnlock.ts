// src/UI/audioUnlock.ts — 20 nov 2026.
//
// Federico, en el iPad: "no escuché el arrastre de la ficha cuando Buddha
// movió". Safari en iPhone/iPad solo deja sonar un <audio> sin toque del
// jugador si ESE MISMO elemento ya sonó antes dentro de un toque. Los
// sonidos que dispara Buddha (o el rival a distancia) llegan por un
// temporizador o por la red, no por un toque: si ese sonido todavía no
// había sonado tras un toque tuyo, el iPad lo silenciaba.
//
// Solución global, sin tocar cada sonido: todo `new Audio(...)` del juego
// queda registrado y, en el primer toque (y en los siguientes mientras
// quede alguno pendiente), cada uno se reproduce un instante en silencio y
// se para. Desde ahí iOS lo deja sonar cuando lo pida el juego.
//
// Si el propio toque pide ese sonido mientras se está desbloqueando, no se
// corta: se le quita el silencio y suena desde el principio.

type Tracked = HTMLAudioElement & { __unlocking?: boolean; __wanted?: boolean };

const pending = new Set<Tracked>();

if (typeof window !== "undefined" && typeof window.Audio === "function") {
  const NativeAudio = window.Audio;
  const nativePlay = HTMLMediaElement.prototype.play;

  // Función (no subclase: heredar de Audio falla en algunos navegadores).
  // Con `new`, devolver un objeto hace que ese objeto sea el resultado.
  function TrackedAudio(src?: string): HTMLAudioElement {
    const el = new NativeAudio(src) as Tracked;
    el.play = function play(this: Tracked): Promise<void> {
      if (this.__unlocking) {
        // Ya está sonando en silencio: basta con quitar el silencio.
        this.__wanted = true;
        this.currentTime = 0;
        this.muted = false;
        return Promise.resolve();
      }
      return nativePlay.call(this);
    };
    pending.add(el);
    return el;
  }
  TrackedAudio.prototype = NativeAudio.prototype;
  window.Audio = TrackedAudio as unknown as typeof Audio;

  const unlock = () => {
    for (const el of Array.from(pending)) {
      if (!el.paused) {
        pending.delete(el); // ya está sonando: desbloqueado
        continue;
      }
      el.__unlocking = true;
      el.__wanted = false;
      el.muted = true;
      let p: Promise<void> | undefined;
      try {
        p = nativePlay.call(el);
      } catch {
        p = undefined;
      }
      const done = (ok: boolean) => {
        if (!el.__wanted) {
          el.pause();
          el.currentTime = 0;
        }
        el.muted = false;
        el.__unlocking = false;
        if (ok) pending.delete(el);
      };
      if (p && typeof p.then === "function") p.then(() => done(true), () => done(false));
      else done(false);
    }
    if (pending.size === 0) {
      // Los sonidos que se creen más tarde se desbloquean en el siguiente toque.
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("touchend", unlock, true);
      armed = false;
    }
  };

  let armed = false;
  const arm = () => {
    if (armed) return;
    armed = true;
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("touchend", unlock, true);
  };
  arm();
  // Un sonido creado después de que todo estuviera desbloqueado vuelve a
  // armar la escucha.
  const origAdd = pending.add.bind(pending);
  pending.add = (el: Tracked) => {
    const r = origAdd(el);
    arm();
    return r;
  };
}

export {};
