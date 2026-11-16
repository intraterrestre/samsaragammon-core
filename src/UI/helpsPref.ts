// 16 nov 2026 — preferencia "Ayudas" (pedido de Federico: el jugador que
// ya se sabe las lecciones puede quitarlas). Se recuerda en este navegador.
// Apagadas: sin carteles de lección, sin pulsos de ayuda en piezas/dado y
// sin instrucciones del Buda Azul en el cartel superior. El turno, tu color
// y las jugadas del rival se siguen mostrando siempre.
const KEY = "sg.helpsOff";

export function loadHelpsOff(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function saveHelpsOff(off: boolean): void {
  try {
    localStorage.setItem(KEY, off ? "1" : "0");
  } catch {
    // sin almacenamiento: vale para esta sesión
  }
}
