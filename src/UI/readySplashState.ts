// Estado del cartel READY TO PLAY (ver ReadySplash.tsx): vive fuera de
// React para durar toda la carga de página aunque GameShell se remonte.
let shown = false;

/** true si el cartel ya se tocó en esta carga de página. */
export function readySplashDone(): boolean {
  return shown;
}

export function markReadySplashDone(): void {
  shown = true;
}
