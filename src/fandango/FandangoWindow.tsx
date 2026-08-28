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
import type { ReactNode } from "react";
import type { NidanaId } from "../game/nidanas";
import { NIDANAS } from "../game/nidanas";
import type { RealmPieceKind } from "../game/types";
import { NIDANA_NUMBER_IMAGE } from "../game/nidanaNumberAssets";
import { REALM_AVATAR_NAME } from "../game/realmAvatarNames";
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
function LinkAvailableBlock({ links }: { links: OwnLink[] }) {
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
            gap: 18,
          }}
        >
          {links.map((link) => (
            <div
              key={`${link.numA}-${link.numB}`}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <MiniCoin nidana={link.a} />
              <span style={{ opacity: 0.45, fontSize: 13 }}>──</span>
              <MiniCoin nidana={link.b} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// RIVAL HAS WHAT YOU NEED — una mitad es tuya, la otra todavía es del
// rival. Esto NO es un link, es una oportunidad de trade — se muestra
// separado a propósito para no confundir las dos categorías.
function RivalHasWhatYouNeedBlock({
  opportunities,
}: {
  opportunities: RivalOpportunity[];
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
            return (
              <div
                key={`${op.haveNum}-${op.needNum}`}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <MiniCoin nidana={op.need} />
                <span style={{ fontSize: 13, color: "#f2d19a", opacity: 0.9 }}>
                  completes {lo} – {hi}
                </span>
              </div>
            );
          })}
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
}: Props) {
  if (!open) return null;

  const mine = listCarriedNidanas(myNidanas);
  const rival = listCarriedNidanas(rivalNidanas);
  const ownLinks = computeOwnLinks(mine.map((e) => e.nidana));
  const rivalOpportunities = computeRivalOpportunities(
    mine.map((e) => e.nidana),
    rival.map((e) => e.nidana),
  );

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

        <SectionTitle>{myLabel}</SectionTitle>
        <CoinRow entries={mine} />
        <LinkAvailableBlock links={ownLinks} />

        <div
          style={{
            borderTop: "1px solid rgba(216,196,138,0.2)",
            margin: "22px 0",
          }}
        />

        <SectionTitle>{rivalLabel}</SectionTitle>
        <CoinRow entries={rival} />
        <RivalHasWhatYouNeedBlock opportunities={rivalOpportunities} />

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
