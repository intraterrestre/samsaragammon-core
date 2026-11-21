// src/fandango/FandangoWindow.tsx
// v72 (28 agosto 2026) — la ventana real de Chat Fandango, primera
// fase (solo lectura). Pedido de Federico: "construyamos primero
// únicamente esta ventana de lectura: YOUR NIDANAS / RIVAL NIDANAS /
// AVAILABLE LINKS. Sin trades, sin Vestigium nuevo y sin Big Head
// School todavía." Se abre con un click en el ícono de FandangoKarma.
//
// v73 (28 agosto 2026) — corrección semántica: LINK AVAILABLE y RIVAL
// HAS WHAT YOU NEED NO son la misma categoría. LINK AVAILABLE = ambas
// mitades ya están en tus Avatares. RIVAL HAS WHAT YOU NEED = una es
// tuya, la otra es del rival — todavía NO es un link, es una
// oportunidad de trade. Separadas en el layout, sin título compartido.
//
// v74 (28 agosto 2026) — pedido de Federico tras verlo en el tablero
// real: "ahora Fandango dice 'aquí está el estado de tu base de
// datos'" — la jerarquía de información se queda igual (no toca la
// lógica, no toca el tagline), pero el look administrativo (una barra
// rectangular oscura por Nidana) se cambia por monedas horizontales —
// las mismas NIDANA_NUMBER_IMAGE que ya se usan en el tablero, ahora
// de protagonistas en vez de ir metidas adentro de una fila de texto.
// LINK AVAILABLE y RIVAL HAS WHAT YOU NEED pasan a mostrarse como
// pares de monedas chicas conectadas, no como oraciones largas — así
// no revienta el ancho cuando haya 3-4 Nidanas a la vez (motivo
// explícito de Federico para el cambio). Sigue sin haber botón de
// trade/FORM LINK/DEAL — eso queda para cuando dé permiso explícito.
//
// Montado FUERA de .samsaraScene (mismo nivel que LedgerModal en
// GameShell.tsx) a propósito — es un position:fixed de pantalla
// completa, y un ancestro con transform (.samsaraScene) se vuelve el
// containing block de cualquier descendiente fixed, recortándolo con
// su overflow:hidden. Mismo bug que ya se arregló en VictoryScreen.tsx
// (ver ese archivo) — acá se evita de raíz montando en el lugar
// correcto en vez de portal.
import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { useI18n } from "../i18n";
import type { MessageKey } from "../i18n/en";
import type { NidanaId } from "../game/nidanas";
import { NIDANAS } from "../game/nidanas";
import type { PendingTrade, PlayerId, RealmPieceKind } from "../game/types";
import { NIDANA_NUMBER_IMAGE } from "../game/nidanaNumberAssets";
import { REALM_AVATAR_NAME } from "../game/realmAvatarNames";
import { nidanaLinkLows, nidanaNumber, analyzeTrade, linkLabel } from "../game/rules/nidanaLink";
import { narrate, getNarratorMode, useNarration } from "../UI/narrator";
import {
  listCarriedNidanas,
  computeOwnLinks,
  computeRivalOpportunities,
  type CarriedNidana,
  type OwnLink,
  type RivalOpportunity,
} from "./nidanaLinks";

type Props = {
  open: boolean;
  onClose: () => void;
  myNidanas: Partial<Record<RealmPieceKind, NidanaId>>;
  rivalNidanas: Partial<Record<RealmPieceKind, NidanaId>>;
  myLabel: string;
  rivalLabel: string;

  // v77 (28 agosto 2026) — Fandango: FORM DEAL, pedido de Federico tras
  // corregir el diseño: "RIVAL HAS WHAT YOU NEED" señala la oportunidad
  // sin exigir necesidad mutua — el jugador arma la oferta a mano ("I
  // WANT" la del rival, "I OFFER" cualquiera propia), el rival decide
  // ACCEPT/REFUSE. myPlayer hace falta para saber, cuando hay una
  // pendingTrade, si YO la mandé (espero respuesta) o si me la
  // mandaron a mí (puedo aceptarla/rechazarla) — mismo dato que ya usa
  // GameShell.tsx (state.turn) para decidir "YOUR NIDANAS".
  myPlayer: PlayerId;
  // 20 nov 2026 — false a distancia cuando no es tu turno: ves lo tuyo,
  // pero no puedes ofrecer, apostar ni contestar hasta tu turno.
  canAct?: boolean;
  pendingTrade: PendingTrade | null;
  onSendTradeOffer: (offer: NidanaId, want: NidanaId) => void;
  onAcceptTrade: () => void;
  onRefuseTrade: (skySign?: boolean) => void;

  // v84 (4 septiembre 2026) — Square Karma 666 (Snake Bet), pedido de
  // Federico. Nombre interno del reducer sigue siendo "snake bet" —
  // solo el texto visible cambió. eligibleTargets reutiliza el mismo
  // criterio que ya usa Round Dharma 777 (Avatar propio, en Humans, no
  // consolidated) — mismo dato, dos usos distintos.
  mySnakeBetEligibleTargets: RealmPieceKind[];
  myCarriedNidanaCount: number;
  pendingSnakeBet: { byPlayer: PlayerId; targetAvatar: RealmPieceKind; stake?: readonly NidanaId[] } | null;
  activeSnakeBet: {
    byPlayer: PlayerId;
    targetAvatar: RealmPieceKind;
    roundsLeft: number;
    stake?: readonly NidanaId[];
  } | null;
  onRequestSnakeBet: (targetAvatar: RealmPieceKind, stake: [NidanaId, NidanaId]) => void;
  onAcceptSnakeBet: () => void;
  onRefuseSnakeBet: (skySign?: boolean) => void;
  // Nov 2026 — Señales del cielo: true si a este jugador todavía le
  // queda su única señal de la partida (ver reducer.ts, withSkySign).
  skySignAvailable?: boolean;

  // 4 oct 2026 — JUEGA CON BUDDHA: la primera vez que se abre Fandango,
  // Buddha recorre los tres pisos (lo tuyo / lo del rival → trato /
  // apuesta 666) en vez de explicarlo todo de golpe. onTourDone avisa
  // a GameShell para no repetirlo en esta partida.
  tour?: boolean;
  onTourDone?: () => void;
  // 20 nov 2026 — ayuda de Fandango: Buddha lee en voz alta (solo en
  // JUEGA CON BUDDHA, con VOZ/AMBOS); adviceKey identifica la partida para
  // abrir sola la explicación de la PRIMERA oferta recibida.
  voiceHelp?: boolean;
  adviceKey?: string;
};

type TourStep = "welcome" | "mine" | "rival" | "bet";

const TOUR_TEXT: Record<TourStep, MessageKey> = {
  welcome: "fandangoTour.welcome",
  mine: "fandangoTour.mine",
  rival: "fandangoTour.rival",
  bet: "fandangoTour.bet",
};

// Globo de Buddha dentro de la ventana, justo debajo del piso que
// explica (con flecha ▲ apuntándolo). Se avanza tocándolo.
function TourCallout({
  step,
  last,
  onNext,
  voice = false,
}: {
  step: TourStep;
  last: boolean;
  onNext: () => void;
  voice?: boolean;
}) {
  const { t } = useI18n();
  const [title, ...rest] = t(TOUR_TEXT[step]).split("\n");
  useNarration(voice ? t(TOUR_TEXT[step]) : null, { source: "fandango", priority: 2 });
  return (
    <div
      className="fandangoTourCallout"
      role="button"
      tabIndex={0}
      onClick={onNext}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onNext()}
      ref={(el) => el?.scrollIntoView({ block: "nearest", behavior: "smooth" })}
    >
      {step !== "welcome" && <div className="fandangoTourArrow">▲</div>}
      <div className="fandangoTourTitle">☸ {title}</div>
      {rest.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      <div className="fandangoTourNext">{t(last ? "fandangoTour.done" : "fandangoTour.next")}</div>
    </div>
  );
}

// v84 (4 septiembre 2026) — Square Karma 666 (Snake Bet), pedido de
// Federico. Tres estados posibles, mutuamente excluyentes: apuesta
// activa (muestra rondas restantes), solicitud pendiente (yo espero
// respuesta, o el rival me la mandó y puedo aceptar/rechazar), o sin
// nada — ofrece pedir una nueva si tengo Avatares elegibles y al
// menos 2 Nidanas propias (mismo requisito que ya revalida el
// reducer, ver reducer.ts case REQUEST_SNAKE_BET).
function SquareKarma666Block({
  myPlayer,
  canAct = true,
  eligibleTargets,
  carriedNidanaCount,
  pendingSnakeBet,
  activeSnakeBet,
  myCarried,
  onRequest,
  onAccept,
  onRefuse,
  onRefuseSky,
}: {
  myPlayer: PlayerId;
  canAct?: boolean;
  eligibleTargets: RealmPieceKind[];
  carriedNidanaCount: number;
  pendingSnakeBet: { byPlayer: PlayerId; targetAvatar: RealmPieceKind; stake?: readonly NidanaId[] } | null;
  activeSnakeBet: {
    byPlayer: PlayerId;
    targetAvatar: RealmPieceKind;
    roundsLeft: number;
    stake?: readonly NidanaId[];
  } | null;
  myCarried: CarriedNidana[];
  onRequest: (targetAvatar: RealmPieceKind, stake: [NidanaId, NidanaId]) => void;
  onAccept: () => void;
  onRefuse: () => void;
  onRefuseSky?: () => void;
}) {
  const { t } = useI18n();
  // 20 nov 2026 — el apostador elige el Avatar y sus 2 Nidanas.
  const [target, setTarget] = useState<RealmPieceKind | null>(null);
  const [picks, setPicks] = useState<NidanaId[]>([]);
  const togglePick = (id: NidanaId) =>
    setPicks((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 2 ? cur : [...cur, id]));
  const myIds = myCarried.map((c) => c.nidana);
  const linkLowsNow = nidanaLinkLows(Object.fromEntries(myCarried.map((c) => [c.realm, c.nidana])));
  const inLink = (id: NidanaId) => {
    const n = nidanaNumber(id);
    return linkLowsNow.some((low) => n === low || n === low + 1);
  };
  // Enlaces que se romperían si se pierden las 2 elegidas.
  const brokenLinks =
    picks.length === 2
      ? (() => {
          const rest = Object.fromEntries(
            myCarried.filter((c) => !picks.includes(c.nidana)).map((c) => [c.realm, c.nidana])
          );
          const after = new Set(nidanaLinkLows(rest));
          return linkLowsNow.filter((low) => !after.has(low));
        })()
      : [];
  const warning =
    brokenLinks.length > 0
      ? t("fan.betLinkWarn", { links: brokenLinks.map((l) => `${l}–${l + 1}`).join(", ") })
      : null;
  useEffect(() => {
    if (warning && getNarratorMode() !== "text") narrate(warning, { source: "fandango", priority: 2 });
  }, [warning]);
  const boxStyle: CSSProperties = {
    marginTop: 20,
    padding: "16px 12%",
    borderRadius: "50%",
    border: "1px solid rgba(255,170,120,0.3)",
    background: "rgba(255,170,120,0.06)",
  };
  const buttonStyle: CSSProperties = {
    height: 34,
    padding: "0 14px",
    borderRadius: "50%",
    border: "1px solid rgba(216,196,138,0.28)",
    background: "rgba(255,255,255,0.06)",
    color: "#f2e8d4",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 12,
  };

  if (activeSnakeBet) {
    const isMine = activeSnakeBet.byPlayer === myPlayer;
    return (
      <div style={boxStyle}>
        {/* 21 nov 2026 — qué gana quién y cuántos turnos quedan. */}
        {t(isMine ? "fan.betActiveMine" : "fan.betActiveRival", {
          name: REALM_AVATAR_NAME[activeSnakeBet.targetAvatar],
          color: t(activeSnakeBet.byPlayer === "P1" ? "color.P1" : "color.P2"),
          turns:
            activeSnakeBet.roundsLeft === 1
              ? t("fan.turn1")
              : t("fan.turnN", { n: String(activeSnakeBet.roundsLeft) }),
        })}
        {/* 20 nov 2026 — qué 2 Nidanas están en juego. */}
        {activeSnakeBet.stake && activeSnakeBet.stake.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>{t("fan.betStake")}</span>
            {activeSnakeBet.stake.map((id) => (
              <MiniCoin key={id} nidana={id} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (pendingSnakeBet) {
    const isMine = pendingSnakeBet.byPlayer === myPlayer;
    if (isMine) {
      return (
        <div style={boxStyle}>
          {t("fan.betProposed", { name: REALM_AVATAR_NAME[pendingSnakeBet.targetAvatar] })}
          {pendingSnakeBet.stake && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>{t("fan.betStake")}</span>
              {pendingSnakeBet.stake.map((id) => (
                <MiniCoin key={id} nidana={id} />
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div style={boxStyle}>
        <div style={{ marginBottom: 8 }}>
          {/* 21 nov 2026 — el Avatar que gana el loto es el del RIVAL (antes
              decía "tu"). Se ven las 2 Nidanas apostadas y qué pasa al
              aceptar o al rechazar, antes de pulsar. */}
          <div style={{ fontWeight: 800 }}>
            {t("fan.betIncoming", {
              color: t(pendingSnakeBet.byPlayer === "P1" ? "color.P1" : "color.P2").toUpperCase(),
            })}
          </div>
          {pendingSnakeBet.stake && (
            <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontSize: 12, opacity: 0.85 }}>{t("fan.betStake")}</span>
              {pendingSnakeBet.stake.map((id) => (
                <MiniCoin key={id} nidana={id} />
              ))}
            </div>
          )}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.9, whiteSpace: "pre-line" }}>
            {t("fan.betIncomingBody", { name: REALM_AVATAR_NAME[pendingSnakeBet.targetAvatar] })}
          </div>
        </div>
        {!canAct ? (
          <div style={{ fontSize: 12, opacity: 0.75, fontStyle: "italic" }}>{t("fan.answerOnYourTurn")}</div>
        ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={onAccept} style={buttonStyle}>
            {t("fan.betAccept")}
          </button>
          <button type="button" onClick={onRefuse} style={buttonStyle}>
            {t("fan.refuse")}
          </button>
          {onRefuseSky && (
            <button type="button" onClick={onRefuseSky} style={buttonStyle} title={t("sky.hint")}>
              {t("sky.refuse")}
            </button>
          )}
        </div>
        )}
      </div>
    );
  }

  if (!canAct || eligibleTargets.length === 0 || carriedNidanaCount < 2) return null;

  return (
    <div style={boxStyle}>
      <div style={{ marginBottom: 4 }}>{t("fan.betPropose")}</div>
      <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.9, whiteSpace: "pre-line" }}>{t("fan.betRuleMine")}</div>
      <div style={{ marginBottom: 6, fontSize: 12 }}>{t("fan.betPickAvatar")}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {eligibleTargets.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={target === kind}
            onClick={() => setTarget(kind)}
            style={{
              ...buttonStyle,
              background: target === kind ? "rgba(255,170,120,0.35)" : buttonStyle.background,
              border: target === kind ? "1px solid #ffb07a" : buttonStyle.border,
            }}
          >
            {REALM_AVATAR_NAME[kind]}
          </button>
        ))}
      </div>
      {target && (
        <>
          <div style={{ margin: "12px 0 6px", fontSize: 12 }}>{t("fan.betPickNidanas")}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {myIds.map((id) => {
              const on = picks.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => togglePick(id)}
                  title={NIDANAS[id].label}
                  style={{
                    position: "relative",
                    padding: 4,
                    borderRadius: "50%",
                    border: on ? "2px solid #ffb07a" : "2px solid transparent",
                    background: on ? "rgba(255,170,120,0.25)" : "transparent",
                    cursor: "pointer",
                    opacity: !on && picks.length >= 2 ? 0.45 : 1,
                  }}
                >
                  <MiniCoin nidana={id} />
                  {inLink(id) && (
                    <span style={{ position: "absolute", right: -4, top: -4, fontSize: 12 }}>🔗</span>
                  )}
                </button>
              );
            })}
          </div>
          {warning && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#ffd7a8", fontWeight: 600 }}>{warning}</div>
          )}
          <button
            type="button"
            disabled={picks.length !== 2}
            onClick={() => {
              if (picks.length === 2) onRequest(target, [picks[0], picks[1]]);
              setTarget(null);
              setPicks([]);
            }}
            style={{
              ...buttonStyle,
              marginTop: 12,
              opacity: picks.length === 2 ? 1 : 0.4,
              cursor: picks.length === 2 ? "pointer" : "default",
            }}
          >
            {t("fan.betConfirm")}
          </button>
        </>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "'Cinzel', 'Trajan Pro', 'Times New Roman', serif",
        fontSize: 14,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#d8c48a",
        textAlign: "center",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 13,
        opacity: 0.5,
        fontStyle: "italic",
        textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

// Una moneda grande (protagonista) con el Avatar que la porta debajo —
// reemplaza la fila-de-texto vieja. La imagen ya trae el número
// pintado (NIDANA_NUMBER_IMAGE), no hace falta repetirlo en texto.
function Coin({ entry }: { entry: CarriedNidana }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
      }}
    >
      <img
        src={NIDANA_NUMBER_IMAGE[entry.nidana]}
        alt={NIDANAS[entry.nidana].label}
        title={NIDANAS[entry.nidana].label}
        style={{
          width: 48,
          height: 48,
          objectFit: "contain",
          filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.55))",
        }}
      />
      <span style={{ fontSize: 11, opacity: 0.65, letterSpacing: "0.02em" }}>
        {REALM_AVATAR_NAME[entry.realm]}
      </span>
    </div>
  );
}

function CoinRow({ entries }: { entries: CarriedNidana[] }) {
  const { t } = useI18n();
  if (entries.length === 0) {
    return <EmptyNote>{t("fan.noNidanas")}</EmptyNote>;
  }
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 22,
      }}
    >
      {entries.map((e) => (
        <Coin key={e.realm} entry={e} />
      ))}
    </div>
  );
}

// Moneda chica, sin caption de Avatar — para las líneas compactas de
// LINK AVAILABLE / RIVAL HAS WHAT YOU NEED.
function MiniCoin({ nidana }: { nidana: NidanaId }) {
  return (
    <img
      src={NIDANA_NUMBER_IMAGE[nidana]}
      alt={NIDANAS[nidana].label}
      title={NIDANAS[nidana].label}
      style={{ width: 28, height: 28, objectFit: "contain", verticalAlign: "middle" }}
    />
  );
}


// TUS ENLACES — 20 nov 2026: enlaces EN VIVO (dos Nidanas de números
// seguidos que llevas ahora mismo; ver game/rules/nidanaLink.ts). Ya no
// hay botón ni registro: si pierdes una, el enlace desaparece. Se
// muestra "discretamente" (pedido de Federico): sin sección visible
// cuando todavía no hay ninguno, para no repetir el "None yet." de
// arriba con algo que todavía no aplica la primera vez que se abre
// Fandango.
function YourLinksBlock({ links }: { links: OwnLink[] }) {
  const { t } = useI18n();
  if (links.length === 0) return null;
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "#9fd88a",
          opacity: 0.75,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {t("fan.yourLinks")}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 14,
        }}
      >
        {links.map((link) => (
          <div
            key={`${link.numA}-${link.numB}`}
            style={{ display: "flex", alignItems: "center", gap: 6, opacity: 0.85 }}
          >
            <MiniCoin nidana={link.a} />
            <span style={{ opacity: 0.45, fontSize: 13 }}>→</span>
            <MiniCoin nidana={link.b} />
            <span style={{ color: "#9fd88a", fontSize: 13 }}>✓</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// RIVAL HAS WHAT YOU NEED — una mitad es tuya, la otra todavía es del
// rival. Esto NO es un link, es una oportunidad de trade — se muestra
// separado a propósito para no confundir las dos categorías.
//
// v77 (28 agosto 2026) — se agrega DEAL, pedido de Federico tras
// corregir el diseño con Chaty: "el juego detecta oportunidades. El
// jugador decide qué está dispuesto a dar." DEAL aparece con solo que
// exista la oportunidad de un lado (op.need) — NO exige que el rival
// también necesite algo tuyo. Al pulsarlo se abre, debajo de esa fila,
// el armador de oferta: "I WANT" (la del rival, ya fija) + "I OFFER"
// (tus propias monedas transportadas, elegís una) → "SEND OFFER".
// "disabled" es true mientras ya haya una pendingTrade en curso (de
// cualquiera de los dos lados) — una sola oferta a la vez.
function RivalHasWhatYouNeedBlock({
  opportunities,
  mine,
  disabled,
  dealFor,
  selectedOffer,
  onOpenDeal,
  onSelectOffer,
  onSendOffer,
  onCancelDeal,
  myMap,
  rivalMap,
}: {
  myMap: NidanaMap;
  rivalMap: NidanaMap;
  opportunities: RivalOpportunity[];
  mine: CarriedNidana[];
  disabled: boolean;
  dealFor: NidanaId | null;
  selectedOffer: NidanaId | null;
  onOpenDeal: (need: NidanaId) => void;
  onSelectOffer: (offer: NidanaId) => void;
  onSendOffer: () => void;
  onCancelDeal: () => void;
}) {
  const { t } = useI18n();
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.06em",
          color: "#e8b06a",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        {t("fan.rivalHas")}
      </div>
      {opportunities.length === 0 ? (
        <EmptyNote>{t("fan.none")}</EmptyNote>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {opportunities.map((op) => {
            const lo = Math.min(op.haveNum, op.needNum);
            const hi = Math.max(op.haveNum, op.needNum);
            const dealOpen = dealFor === op.need;
            return (
              <div
                key={`${op.haveNum}-${op.needNum}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MiniCoin nidana={op.need} />
                  <span style={{ fontSize: 13, color: "#f2d19a", opacity: 0.9 }}>
                    {t("fan.completes", { lo: String(lo), hi: String(hi) })}
                  </span>
                  {!disabled && (
                    <button
                      onClick={() => (dealOpen ? onCancelDeal() : onOpenDeal(op.need))}
                      style={{
                        marginLeft: 4,
                        height: 24,
                        padding: "0 10px",
                        borderRadius: "50%",
                        border: "1px solid rgba(232,176,106,0.45)",
                        background: dealOpen
                          ? "rgba(232,176,106,0.22)"
                          : "rgba(232,176,106,0.12)",
                        color: "#f2d19a",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        cursor: "pointer",
                      }}
                    >
                      {dealOpen ? t("fan.cancel") : t("fan.deal")}
                    </button>
                  )}
                </div>

                {dealOpen && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(232,176,106,0.25)",
                      borderRadius: "50%",
                      padding: "14px 12%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, letterSpacing: "0.04em", opacity: 0.7 }}>
                      {t("fan.iWant")} <MiniCoin nidana={op.need} />
                    </div>
                    <div style={{ fontSize: 11, letterSpacing: "0.04em", opacity: 0.7 }}>
                      {t("fan.iOffer")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                      {mine.map((e) => (
                        <button
                          key={e.realm}
                          onClick={() => onSelectOffer(e.nidana)}
                          style={{
                            padding: 3,
                            borderRadius: "50%",
                            border:
                              selectedOffer === e.nidana
                                ? "2px solid #e8b06a"
                                : "1px solid rgba(255,255,255,0.15)",
                            background: "transparent",
                            cursor: "pointer",
                            lineHeight: 0,
                          }}
                        >
                          <MiniCoin nidana={e.nidana} />
                        </button>
                      ))}
                    </div>
                    {selectedOffer && (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                          <MiniCoin nidana={selectedOffer} />
                          <span style={{ opacity: 0.6, fontSize: 13 }}>⇄</span>
                          <MiniCoin nidana={op.need} />
                        </div>
                        <DealAdvice myMap={myMap} rivalMap={rivalMap} give={selectedOffer} receive={op.need} />
                        <button
                          onClick={onSendOffer}
                          style={{
                            height: 28,
                            padding: "0 14px",
                            borderRadius: "50%",
                            border: "1px solid rgba(232,176,106,0.6)",
                            background: "rgba(232,176,106,0.28)",
                            color: "#f2e8d4",
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                          }}
                        >
                          {t("fan.offerTrade", {
                            give: String(nidanaNumber(selectedOffer)),
                            get: String(nidanaNumber(op.need)),
                          })}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 20 nov 2026 — "¿Me conviene?": consecuencias de un trato para los dos
// jugadores, con sus Nidanas reales. Describe; nunca recomienda.
type NidanaMap = Partial<Record<RealmPieceKind, NidanaId>>;
function useAdviceLines(mine: NidanaMap, theirs: NidanaMap, give: NidanaId, receive: NidanaId): string[] {
  const { t } = useI18n();
  const fx = analyzeTrade(mine, theirs, give, receive);
  const list = (ls: number[]) => ls.map(linkLabel).join(", ");
  const lines: string[] = [];
  lines.push(fx.myGain.length ? t("fan.adv.gain", { links: list(fx.myGain) }) : t("fan.adv.noGain"));
  if (fx.myLoss.length) lines.push(t("fan.adv.loss", { links: list(fx.myLoss) }));
  if (fx.rivalGain.length) lines.push(t("fan.adv.rivalGain", { links: list(fx.rivalGain) }));
  if (fx.rivalLoss.length) lines.push(t("fan.adv.rivalLoss", { links: list(fx.rivalLoss) }));
  if (!fx.rivalGain.length && !fx.rivalLoss.length) lines.push(t("fan.adv.rivalNone"));
  return lines;
}
function TradeAdvice({ lines }: { lines: string[] }) {
  return (
    <div
      style={{
        marginTop: 8,
        fontSize: 12,
        lineHeight: 1.35,
        color: "#f2e8d4",
        opacity: 0.92,
        textAlign: "center",
      }}
    >
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
    </div>
  );
}

function DealAdvice(props: { myMap: NidanaMap; rivalMap: NidanaMap; give: NidanaId; receive: NidanaId }) {
  return <TradeAdvice lines={useAdviceLines(props.myMap, props.rivalMap, props.give, props.receive)} />;
}

// v77 (28 agosto 2026) — banner de trade, pedido de Federico. Cuando
// hay una pendingTrade, es lo primero que se ve al abrir Fandango (ver
// FandangoWindow más abajo) — si te la mandaron a ti, podés
// ACCEPT/REFUSE ahí mismo; si la mandaste vos, solo un aviso de que
// está esperando respuesta (sin botones — ya jugaste tu parte).
function TradeOfferPanel({
  pendingTrade,
  myPlayer,
  canAct = true,
  onAccept,
  onRefuse,
  onRefuseSky,
  myMap,
  rivalMap,
  autoAdvice = false,
  voiceHelp = false,
}: {
  pendingTrade: PendingTrade;
  myPlayer: PlayerId;
  canAct?: boolean;
  onAccept: () => void;
  onRefuse: () => void;
  onRefuseSky?: () => void;
  myMap: NidanaMap;
  rivalMap: NidanaMap;
  autoAdvice?: boolean;
  voiceHelp?: boolean;
}) {
  const { t } = useI18n();
  const incoming = pendingTrade.fromPlayer !== myPlayer;
  // Si la oferta es para mí: entrego `want`, recibo `offer`.
  const adviceLines = useAdviceLines(myMap, rivalMap, pendingTrade.want, pendingTrade.offer);
  const [adviceOpen, setAdviceOpen] = useState(autoAdvice);
  useNarration(incoming && adviceOpen && voiceHelp ? adviceLines.join(" ") : null, { source: "fandango", priority: 2 });
  return (
    <div
      style={{
        margin: "0 0 20px",
        padding: "16px 12%",
        borderRadius: "50%",
        background: incoming ? "rgba(232,176,106,0.1)" : "rgba(255,255,255,0.04)",
        border: incoming
          ? "1px solid rgba(232,176,106,0.4)"
          : "1px solid rgba(255,255,255,0.14)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          color: incoming ? "#f2d19a" : "#c9bfa8",
          marginBottom: 8,
        }}
      >
        {incoming ? t("fan.tradeOffer") : t("fan.offerSent")}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
        {incoming ? t("fan.theyOffer") : t("fan.yourCoin")} <MiniCoin nidana={pendingTrade.offer} />
        <span style={{ opacity: 0.6 }}>⇄</span>
        {incoming ? t("fan.forYour") : t("fan.forTheir")} <MiniCoin nidana={pendingTrade.want} />
      </div>
      {incoming && adviceOpen && <TradeAdvice lines={adviceLines} />}
      {incoming && !adviceOpen && (
        <button
          type="button"
          onClick={() => setAdviceOpen(true)}
          style={{
            marginTop: 8,
            height: 24,
            padding: "0 12px",
            borderRadius: "50%",
            border: "1px solid rgba(232,176,106,0.45)",
            background: "rgba(232,176,106,0.12)",
            color: "#f2d19a",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("fan.adv.ask")}
        </button>
      )}
      {incoming && !canAct ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75, fontStyle: "italic" }}>
          {t("fan.answerOnYourTurn")}
        </div>
      ) : incoming ? (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
          <button
            onClick={onAccept}
            style={{
              height: 30,
              padding: "0 16px",
              borderRadius: "50%",
              border: "1px solid rgba(159,216,138,0.6)",
              background: "rgba(159,216,138,0.22)",
              color: "#c8ecb8",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            {t("fan.acceptTrade", { give: String(nidanaNumber(pendingTrade.want)), get: String(nidanaNumber(pendingTrade.offer)) })}
          </button>
          <button
            onClick={onRefuse}
            style={{
              height: 30,
              padding: "0 16px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "#f2e8d4",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            {t("fan.refuse")}
          </button>
          {onRefuseSky && (
            <button
              onClick={onRefuseSky}
              title={t("sky.hint")}
              style={{
                height: 30,
                padding: "0 16px",
                borderRadius: "50%",
                border: "1px solid rgba(190,180,255,0.45)",
                background: "rgba(150,140,255,0.12)",
                color: "#e4e0ff",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {t("sky.refuse")}
            </button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
          {t("fan.waiting")}
        </div>
      )}
    </div>
  );
}

export function FandangoWindow({
  open,
  onClose,
  myNidanas,
  rivalNidanas,
  myLabel,
  rivalLabel,
  myPlayer,
  canAct = true,
  pendingTrade,
  onSendTradeOffer,
  onAcceptTrade,
  onRefuseTrade,
  mySnakeBetEligibleTargets,
  myCarriedNidanaCount,
  pendingSnakeBet,
  activeSnakeBet,
  onRequestSnakeBet,
  onAcceptSnakeBet,
  onRefuseSnakeBet,
  skySignAvailable = false,
  tour = false,
  onTourDone,
  voiceHelp = false,
  adviceKey = "",
}: Props) {
  const { t } = useI18n();
  const [tourIndex, setTourIndex] = useState<number | null>(null);
  useEffect(() => {
    setTourIndex(open && tour ? 0 : null);
    // Solo al abrir: si tour cambia con la ventana abierta, no reinicia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // v77 (28 agosto 2026) — armador de oferta (DEAL), también local:
  // "para cuál oportunidad estoy armando una oferta" y "cuál de mis
  // propias monedas elegí ofrecer". Se limpia solo al mandar la oferta
  // (ver handleSendOffer) — a partir de ahí ya hay una pendingTrade en
  // GameShell/state, y RivalHasWhatYouNeedBlock deja de mostrar DEAL.
  const [dealFor, setDealFor] = useState<NidanaId | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<NidanaId | null>(null);

  if (!open) return null;

  const mine = listCarriedNidanas(myNidanas);
  const rival = listCarriedNidanas(rivalNidanas);
  const allOwnLinks = computeOwnLinks(mine.map((e) => e.nidana));
  const rivalOpportunities = computeRivalOpportunities(
    mine.map((e) => e.nidana),
    rival.map((e) => e.nidana),
  );
  // 20 nov 2026 — las Nidanas apostadas en Square Karma 666 no se pueden
  // ofrecer ni pedir mientras dure la apuesta (el reducer también lo
  // impide; aquí solo se dejan de ofrecer).
  // Primera oferta recibida en esta partida: la explicación se abre sola.
  const incomingNow = !!pendingTrade && pendingTrade.fromPlayer !== myPlayer;
  let autoAdviceNow = false;
  if (incomingNow) {
    try {
      autoAdviceNow = localStorage.getItem("sg.fanAdviceShown") !== adviceKey;
      if (autoAdviceNow) localStorage.setItem("sg.fanAdviceShown", adviceKey);
    } catch {
      autoAdviceNow = false;
    }
  }
  const staked = new Set<NidanaId>([...(activeSnakeBet?.stake ?? []), ...(pendingSnakeBet?.stake ?? [])]);
  const tradeMine = mine.filter((e) => !staked.has(e.nidana));
  const tradeOpportunities = rivalOpportunities.filter((o) => !staked.has(o.need));


  // El piso 666 solo existe en pantalla cuando SquareKarma666Block
  // dibuja algo (mismas condiciones que ese componente).
  const has666 =
    !!activeSnakeBet ||
    !!pendingSnakeBet ||
    (mySnakeBetEligibleTargets.length > 0 && myCarriedNidanaCount >= 2);
  const tourSteps: TourStep[] = has666
    ? ["welcome", "mine", "rival", "bet"]
    : ["welcome", "mine", "rival"];
  const tourStep: TourStep | null = tourIndex === null ? null : tourSteps[tourIndex] ?? null;
  const nextTour = () => {
    if (tourIndex === null) return;
    if (tourIndex + 1 >= tourSteps.length) {
      setTourIndex(null);
      onTourDone?.();
    } else {
      setTourIndex(tourIndex + 1);
    }
  };
  const zone = (z: TourStep) =>
    tourStep === null || tourStep === "welcome"
      ? tourStep === "welcome" ? "fandangoZone fandangoZoneDim" : "fandangoZone"
      : tourStep === z ? "fandangoZone fandangoZoneFocus" : "fandangoZone fandangoZoneDim";
  const callout = (z: TourStep) =>
    tourStep === z ? (
      <TourCallout step={z} last={tourIndex === tourSteps.length - 1} onNext={nextTour} voice={voiceHelp} />
    ) : null;

  const handleOpenDeal = (need: NidanaId) => {
    setDealFor(need);
    setSelectedOffer(null);
  };
  const handleCancelDeal = () => {
    setDealFor(null);
    setSelectedOffer(null);
  };
  const handleSendOffer = () => {
    if (!dealFor || !selectedOffer) return;
    onSendTradeOffer(selectedOffer, dealFor);
    setDealFor(null);
    setSelectedOffer(null);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,7,13,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        cursor: "pointer",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "82vh",
          overflowY: "auto",
          padding: "22% 12% 16%",
          borderRadius: "50%",
          background: "rgba(20, 16, 10, 0.66)",
          backdropFilter: "blur(3px)",
          textShadow: "0 1px 3px rgba(0,0,0,0.9)",
          border: "1px solid rgba(216,196,138,0.28)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          color: "#f2e8d4",
          cursor: "default",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Cinzel', 'Trajan Pro', 'Times New Roman', serif",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: "0.08em",
            marginBottom: 4,
          }}
        >
          CHAT FANDANGO™
        </div>
        <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 22 }}>
          {t("fan.subtitle")}
        </div>
        {callout("welcome")}

        <div className={zone("mine")}>
        {pendingTrade && (
          <TradeOfferPanel
            key={`${pendingTrade.fromPlayer}|${pendingTrade.offer}|${pendingTrade.want}`}
            pendingTrade={pendingTrade}
            myPlayer={myPlayer}
            canAct={canAct}
            myMap={myNidanas}
            rivalMap={rivalNidanas}
            autoAdvice={autoAdviceNow}
            voiceHelp={voiceHelp}
            onAccept={onAcceptTrade}
            onRefuse={() => onRefuseTrade()}
            onRefuseSky={skySignAvailable ? () => onRefuseTrade(true) : undefined}
          />
        )}

        <SectionTitle>{myLabel}</SectionTitle>
        <CoinRow entries={mine} />
        <YourLinksBlock links={allOwnLinks} />
        </div>
        {callout("mine")}

        <div
          style={{
            borderTop: "1px solid rgba(216,196,138,0.2)",
            margin: "22px 0",
          }}
        />

        <div className={zone("rival")}>
        <SectionTitle>{rivalLabel}</SectionTitle>
        <CoinRow entries={rival} />
        <RivalHasWhatYouNeedBlock
          myMap={myNidanas}
          rivalMap={rivalNidanas}
          opportunities={tradeOpportunities}
          mine={tradeMine}
          disabled={!!pendingTrade || !canAct}
          dealFor={dealFor}
          selectedOffer={selectedOffer}
          onOpenDeal={handleOpenDeal}
          onSelectOffer={setSelectedOffer}
          onSendOffer={handleSendOffer}
          onCancelDeal={handleCancelDeal}
        />

        {!canAct && <EmptyNote>{t("fan.negotiateOnYourTurn")}</EmptyNote>}
        </div>
        {callout("rival")}

        <div className={zone("bet")}>
        <SquareKarma666Block
          myPlayer={myPlayer}
          canAct={canAct}
          eligibleTargets={mySnakeBetEligibleTargets}
          carriedNidanaCount={myCarriedNidanaCount}
          pendingSnakeBet={pendingSnakeBet}
          activeSnakeBet={activeSnakeBet}
          myCarried={mine}
          onRequest={onRequestSnakeBet}
          onAccept={onAcceptSnakeBet}
          onRefuse={() => onRefuseSnakeBet()}
          onRefuseSky={skySignAvailable ? () => onRefuseSnakeBet(true) : undefined}
        />
        </div>
        {callout("bet")}

        <button
          onClick={onClose}
          style={{
            marginTop: 26,
            height: 38,
            padding: "0 16px",
            borderRadius: "50%",
            border: "1px solid rgba(216,196,138,0.28)",
            background: "rgba(255,255,255,0.06)",
            color: "#f2e8d4",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          {t("fan.close")}
        </button>
      </div>
    </div>
  );
}
