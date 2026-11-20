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
}
export function isBrunoEraDone(): boolean {
  return brunoEraDone;
}
