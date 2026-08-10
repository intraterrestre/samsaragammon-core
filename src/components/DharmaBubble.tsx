import { forwardRef } from "react";
import "./DharmaBubble.css";

type DharmaBubbleProps = {
  message?: string;
};

// v24 (10 agosto 2026) — revertido el ícono del buda que se agregó
// hace un rato: Board.tsx ya tiene su propio buda fijo y clicable
// (mismo archivo, buda-karma-er.webp), siempre visible en el tablero.
// Con los dos a la vez, se veía duplicado ("doble imagen del buda
// azul", reportado por Federico). El buda del tablero ya cumple ese
// papel — este globo vuelve a ser solo texto.
const DharmaBubble = forwardRef<HTMLDivElement, DharmaBubbleProps>(
  ({ message }, ref) => {
    if (!message) return null;
    return (
      <div ref={ref} className="dharma-bubble">
        <div className="dharma-bubble-text">{message}</div>
      </div>
    );
  }
);

export default DharmaBubble;