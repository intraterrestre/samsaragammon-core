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
import { useState, type ReactNode } from "react";
import type { NidanaId } from "../game/nidanas";
import { NIDANAS } from "../game/nidanas";
import type { PendingTrade, PlayerId, RealmPieceKind } from "../game/types";
import { NIDANA_NUMBER_IMAGE } from "../game/nidanaNumberAssets";
import { REALM_AVATAR_NAME } from "../game/realmAvatarNames";
import {
  listCarriedNidanas,
  computeOwnLinks,
  computeRivalOpportunities,
  nidanaIdForNumber,
  type CarriedNidana,
  type OwnLink,
  type RivalOpportunity,
} from "./nidanaLinks";

// v76 (28 agosto 2026) — FORM LINK, pedido de Federico tras destripar
// el Preset A en el tablero real ("ya podemos pasar a FORM LINK. Pero
// no implementaría todavía el intercambio. Primero probaría el gesto
// más elemental"). myFormedLinks: los links que YO (state.turn) ya
// formé (ver GameState.formedLinks, reducer.ts case "FORM_LINK") —
// números bajos del par ("6" = link 6-7). onFormLink: pide formar el
// link con ese número bajo; GameShell.tsx arma el player real y
// también dispara el sonido de confirmación antes de despachar.
type Props = {
  open: boolean;
  onClose: () => void;
  myNidanas: Partial<Record<RealmPieceKind, NidanaId>>;
  rivalNidanas: Partial<Record<RealmPieceKind, NidanaId>>;
  myLabel: string;
  rivalLabel: string;
  myFormedLinks: number[];
  onFormLink: (low: number) => void;

  // v77 (28 agosto 2026) — Fandango: FORM DEAL, pedido de Federico tras
  // corregir el diseño: "RIVAL HAS WHAT YOU NEED" señala la oportunidad
  // sin exigir necesidad mutua — el jugador arma la oferta a mano ("I
  // WANT" la del rival, "I OFFER" cualquiera propia), el rival decide
  // ACCEPT/REFUSE. myPlayer hace falta para saber, cuando hay una
  // pendingTrade, si YO la mandé (espero respuesta) o si me la
  // mandaron a mí (puedo aceptarla/rechazarla) — mismo dato que ya usa
  // GameShell.tsx (state.turn) para decidir "YOUR NIDANAS".
  myPlayer: PlayerId;
  pendingTrade: PendingTrade | null;
  onSendTradeOffer: (offer: NidanaId, want: NidanaId) => void;
  onAcceptTrade: () => void;
  onRefuseTrade: () => void;
};

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
  if (entries.length === 0) {
    return <EmptyNote>No Nidanas carried yet.</EmptyNote>;
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

// LINK AVAILABLE — ambas Nidanas de la pareja consecutiva ya están en
// tus propios Avatares. Nada que negociar, el link ya existe.
//
// v76 (28 agosto 2026) — se agrega el botón FORM LINK por pedido de
// Federico: "pulsas. Pequeño evento visual/sonoro satisfactorio: LINK
// FORMED 6 → 7." "links" acá ya viene filtrada (ver FandangoWindow más
// abajo) para no repetir un link que YA está formado — ese pasa a
// mostrarse bajo YourLinksBlock en su lugar.
function LinkAvailableBlock({
  links,
  onFormLink,
}: {
  links: OwnLink[];
  onFormLink: (link: OwnLink) => void;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        style={{
          fontSize: 12,
          letterSpacing: "0.06em",
          color: "#9fd88a",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        LINK AVAILABLE
      </div>
      {links.length === 0 ? (
        <EmptyNote>None yet.</EmptyNote>
      ) : (
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
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <MiniCoin nidana={link.a} />
              <span style={{ opacity: 0.45, fontSize: 13 }}>──</span>
              <MiniCoin nidana={link.b} />
              <button
                onClick={() => onFormLink(link)}
                style={{
                  marginLeft: 4,
                  height: 26,
                  padding: "0 10px",
                  borderRadius: 7,
                  border: "1px solid rgba(159,216,138,0.45)",
                  background: "rgba(159,216,138,0.12)",
                  color: "#c8ecb8",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                }}
              >
                FORM LINK
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// YOUR LINKS — links ya formados (ver GameState.formedLinks). Se
// muestra "discretamente" (pedido de Federico): sin sección visible
// cuando todavía no hay ninguno, para no repetir el "None yet." de
// arriba con algo que todavía no aplica la primera vez que se abre
// Fandango.
function YourLinksBlock({ links }: { links: OwnLink[] }) {
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
        YOUR LINKS
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

// LINK FORMED — flash transitorio, puramente local a esta ventana (no
// necesita estado de partida). Pedido de Federico: "pequeño evento
// visual/sonoro satisfactorio."
function LinkFormedFlash({ link }: { link: { numA: number; numB: number } }) {
  return (
    <div
      style={{
        marginTop: 10,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: "#c8ecb8",
        textAlign: "center",
      }}
    >
      LINK FORMED {link.numA} → {link.numB}
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
}: {
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
        RIVAL HAS WHAT YOU NEED
      </div>
      {opportunities.length === 0 ? (
        <EmptyNote>None yet.</EmptyNote>
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
                    completes {lo} – {hi}
                  </span>
                  {!disabled && (
                    <button
                      onClick={() => (dealOpen ? onCancelDeal() : onOpenDeal(op.need))}
                      style={{
                        marginLeft: 4,
                        height: 24,
                        padding: "0 10px",
                        borderRadius: 7,
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
                      {dealOpen ? "CANCEL" : "DEAL"}
                    </button>
                  )}
                </div>

                {dealOpen && (
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(232,176,106,0.25)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 11, letterSpacing: "0.04em", opacity: 0.7 }}>
                      I WANT: <MiniCoin nidana={op.need} />
                    </div>
                    <div style={{ fontSize: 11, letterSpacing: "0.04em", opacity: 0.7 }}>
                      I OFFER:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
                      {mine.map((e) => (
                        <button
                          key={e.realm}
                          onClick={() => onSelectOffer(e.nidana)}
                          style={{
                            padding: 3,
                            borderRadius: 8,
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
                        <button
                          onClick={onSendOffer}
                          style={{
                            height: 28,
                            padding: "0 14px",
                            borderRadius: 7,
                            border: "1px solid rgba(232,176,106,0.6)",
                            background: "rgba(232,176,106,0.28)",
                            color: "#f2e8d4",
                            fontSize: 12,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            cursor: "pointer",
                          }}
                        >
                          SEND OFFER
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

// v77 (28 agosto 2026) — banner de trade, pedido de Federico. Cuando
// hay una pendingTrade, es lo primero que se ve al abrir Fandango (ver
// FandangoWindow más abajo) — si te la mandaron a ti, podés
// ACCEPT/REFUSE ahí mismo; si la mandaste vos, solo un aviso de que
// está esperando respuesta (sin botones — ya jugaste tu parte).
function TradeOfferPanel({
  pendingTrade,
  myPlayer,
  onAccept,
  onRefuse,
}: {
  pendingTrade: PendingTrade;
  myPlayer: PlayerId;
  onAccept: () => void;
  onRefuse: () => void;
}) {
  const incoming = pendingTrade.fromPlayer !== myPlayer;
  return (
    <div
      style={{
        margin: "0 0 20px",
        padding: "14px 16px",
        borderRadius: 12,
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
        {incoming ? "TRADE OFFER" : "OFFER SENT"}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13 }}>
        {incoming ? "They offer" : "Your"} <MiniCoin nidana={pendingTrade.offer} />
        <span style={{ opacity: 0.6 }}>⇄</span>
        {incoming ? "your" : "their"} <MiniCoin nidana={pendingTrade.want} />
      </div>
      {incoming ? (
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
          <button
            onClick={onAccept}
            style={{
              height: 30,
              padding: "0 16px",
              borderRadius: 8,
              border: "1px solid rgba(159,216,138,0.6)",
              background: "rgba(159,216,138,0.22)",
              color: "#c8ecb8",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            ACCEPT
          </button>
          <button
            onClick={onRefuse}
            style={{
              height: 30,
              padding: "0 16px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "#f2e8d4",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.04em",
              cursor: "pointer",
            }}
          >
            REFUSE
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>
          Waiting for reply.
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
  myFormedLinks,
  onFormLink,
  myPlayer,
  pendingTrade,
  onSendTradeOffer,
  onAcceptTrade,
  onRefuseTrade,
}: Props) {
  // v76 (28 agosto 2026) — flash local "LINK FORMED X → Y", ver
  // LinkFormedFlash arriba. Vive en este componente (no en GameShell)
  // porque es puramente decorativo, sin efecto en el estado de
  // partida.
  const [justFormed, setJustFormed] = useState<{ numA: number; numB: number } | null>(
    null,
  );

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

  // Ya formados (YOUR LINKS) vs. todavía no (LINK AVAILABLE) — un
  // mismo link nunca aparece en las dos listas a la vez.
  const formedSet = new Set(myFormedLinks);
  const unformedLinks = allOwnLinks.filter((l) => !formedSet.has(l.numA));
  const formedLinksDisplay: OwnLink[] = myFormedLinks
    .slice()
    .sort((a, b) => a - b)
    .map((low) => ({
      a: nidanaIdForNumber(low),
      b: nidanaIdForNumber(low + 1),
      numA: low,
      numB: low + 1,
    }));

  const handleFormLinkClick = (link: OwnLink) => {
    onFormLink(link.numA);
    setJustFormed({ numA: link.numA, numB: link.numB });
    window.setTimeout(() => setJustFormed(null), 1600);
  };

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
        background: "rgba(5,7,13,0.82)",
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
          padding: "24px 26px",
          borderRadius: 16,
          background: "linear-gradient(180deg, #14100a 0%, #0a0805 100%)",
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
          Messages, suspicious offers, and karmic arrangements.
        </div>

        {pendingTrade && (
          <TradeOfferPanel
            pendingTrade={pendingTrade}
            myPlayer={myPlayer}
            onAccept={onAcceptTrade}
            onRefuse={onRefuseTrade}
          />
        )}

        <SectionTitle>{myLabel}</SectionTitle>
        <CoinRow entries={mine} />
        <LinkAvailableBlock links={unformedLinks} onFormLink={handleFormLinkClick} />
        {justFormed && <LinkFormedFlash link={justFormed} />}
        <YourLinksBlock links={formedLinksDisplay} />

        <div
          style={{
            borderTop: "1px solid rgba(216,196,138,0.2)",
            margin: "22px 0",
          }}
        />

        <SectionTitle>{rivalLabel}</SectionTitle>
        <CoinRow entries={rival} />
        <RivalHasWhatYouNeedBlock
          opportunities={rivalOpportunities}
          mine={mine}
          disabled={!!pendingTrade}
          dealFor={dealFor}
          selectedOffer={selectedOffer}
          onOpenDeal={handleOpenDeal}
          onSelectOffer={setSelectedOffer}
          onSendOffer={handleSendOffer}
          onCancelDeal={handleCancelDeal}
        />

        <button
          onClick={onClose}
          style={{
            marginTop: 26,
            height: 38,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid rgba(216,196,138,0.28)",
            background: "rgba(255,255,255,0.06)",
            color: "#f2e8d4",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
