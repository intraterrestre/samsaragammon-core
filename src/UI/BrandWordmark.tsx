// src/UI/BrandWordmark.tsx — 22 nov 2026.
//
// Federico: la S verde del logo (la misma del icono de la app) delante de
// "AMSARAGAMMON", para que el nombre del juego tenga la misma imagen en
// todas partes. Solo para títulos visibles: dentro de frases y en lo que
// lee el narrador se sigue escribiendo "Samsaragammon" con letras.
import sVerde from "../assets/brand/s_verde.png";

type Props = {
  /** Tamaño de las letras en px; la S mide ~1.9 veces esa altura. */
  size?: number;
  color?: string;
  style?: React.CSSProperties;
};

export function BrandWordmark({ size = 18, color = "#f5d76e", style }: Props) {
  return (
    <span
      role="img"
      aria-label="Samsaragammon"
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        lineHeight: 1,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      <img
        src={sVerde}
        alt=""
        aria-hidden="true"
        style={{ height: size * 1.9, width: "auto", marginRight: -size * 0.12, marginBottom: -size * 0.18 }}
      />
      <span
        aria-hidden="true"
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: size,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color,
        }}
      >
        AMSARAGAMMON
      </span>
    </span>
  );
}

export default BrandWordmark;
