import { forwardRef } from "react";
import "./DharmaBubble.css";

type DharmaBubbleProps = {
  message?: string;
  // v35 (12 agosto 2026) — pedido de Federico: cuando el mensaje es el
  // aviso de "a un Avatar del final" (5 de 6 en Humans), el texto debe
  // verse 3 veces más grande que el mensaje normal — reutiliza el mismo
  // globo, no un cartel aparte.
  big?: boolean;
};

// v24 (10 agosto 2026) — revertido el ícono del buda que se agregó
// hace un rato: Board.tsx ya tiene su propio buda fijo y clicable
// (mismo archivo, buda-karma-er.webp), siempre visible en el tablero.
// Con los dos a la vez, se veía duplicado ("doble imagen del buda
// azul", reportado por Federico). El buda del tablero ya cumple ese
// papel — este globo vuelve a ser solo texto.
const DharmaBubble = forwardRef<HTMLDivElement, DharmaBubbleProps>(
  ({ message, big }, ref) => {
    if (!message) return null;
    return (
      <div
        ref={ref}
        className={`dharma-bubble${big ? " dharma-bubble-big" : ""}`}
      >
        <div
          className={`dharma-bubble-text${big ? " dharma-bubble-text-big" : ""}`}
        >
          {message}
        </div>
      </div>
    );
  }
);

export default DharmaBubble;
