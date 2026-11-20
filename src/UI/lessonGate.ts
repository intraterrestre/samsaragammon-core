// src/UI/lessonGate.ts — 20 nov 2026.
// Federico: "otra vez el video de Bruno se disparó antes de que terminara
// la explicación de Buddha". App (que lanza los videos) y GameShell (que
// muestra los carteles) no comparten estado; esta señal mínima le dice a
// App cuándo Buddha ya terminó de explicar la llegada de Bruno.
let brunoEraDone = false;

export function markBrunoEraDone(): void {
  brunoEraDone = true;
}
export function resetLessonGate(): void {
  brunoEraDone = false;
  videoPending = false;
}
export function isBrunoEraDone(): boolean {
  return brunoEraDone;
}

// 20 nov 2026 — Federico: "el video de Margot volvió a aparecer mientras
// Buddha todavía estaba hablando". Mientras un video de Avatar espera su
// turno (a que Buddha calle), no empieza ninguna lección nueva: si no, una
// lección podía colarse justo antes y el video la cortaba a media frase.
let videoPending = false;
export function setVideoPending(on: boolean): void {
  videoPending = on;
}
export function isVideoPending(): boolean {
  return videoPending;
}
