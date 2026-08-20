import "./VenomBanner.css";
import { POISON_META } from "../game/poisonMeta";
import type { BasePieceKind } from "../game/types";

type VenomBannerProps = {
  kind: BasePieceKind | null;
  fading: boolean;
};

// v58 (18 agosto 2026) — pedido de Federico: banner que aparece al
// escoger un Veneno (Pig/Snake/Rooster), mostrando ícono + la palabra
// del Veneno correspondiente (IGNORANCE/ANGER/IMPULSE) — pantallas
// chicas no dejan apreciar bien qué ficha se seleccionó, y la mayoría
// de jugadores no sabe qué representa cada Veneno. Mismo patrón de
// evento efímero que ya usa DharmaBubble (fireDharmaEvent en
// GameShell.tsx), pero componente separado: este dispara mucho más
// seguido (cada selección de Veneno, no un evento narrativo raro), así
// que usa su propio timer más corto en vez de compartir el de 5s del
// buda.
//
// isEmoji(): POISON_META.icon puede ser una ruta de imagen importada
// (pig/rooster, ambos con asset real) o el emoji 🐍 provisorio de
// snake (sin asset real todavía, ver poisonMeta.ts). Las rutas de
// imagen importadas por Vite siempre empiezan con "/" o "data:"; un
// emoji nunca lo hace — suficiente para distinguir sin agregar un
// campo aparte.
function isEmoji(icon: string): boolean {
  return !icon.startsWith("/") && !icon.startsWith("data:") && !icon.startsWith("http");
}

export function VenomBanner({ kind, fading }: VenomBannerProps) {
  if (!kind) return null;
  const meta = POISON_META[kind];

  return (
    <div className={`venom-banner${fading ? " venom-banner-fading" : ""}`}>
      {isEmoji(meta.icon) ? (
        <span className="venom-banner-emoji" aria-hidden="true">
          {meta.icon}
        </span>
      ) : (
        <img src={meta.icon} alt="" className="venom-banner-icon" />
      )}
      <div className="venom-banner-label">{meta.label}</div>
    </div>
  );
}

export default VenomBanner;
