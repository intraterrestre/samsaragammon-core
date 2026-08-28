// src/fandango/FandangoWindow.tsx
// v72 (28 agosto 2026) — la ventana real de Chat Fandango, primera
// fase (solo lectura). Pedido de Federico: "construyamos primero
// únicamente esta ventana de lectura: YOUR NIDANAS / RIVAL NIDANAS /
// AVAILABLE LINKS. Sin trades, sin Vestigium nuevo y sin Big Head
// School todavía." Se abre con un click en el ícono de FandangoKarma.
//
// v73 (28 agosto 2026) — corrección semántica de Federico/Chaty tras
// ver el reporte de v72: LINK AVAILABLE y RIVAL HAS WHAT YOU NEED NO
// son la misma categoría y no deben mezclarse bajo un solo título
// compartido. LINK AVAILABLE = ambas Nidanas de la secuencia ya están
// en tus Avatares (computeOwnLinks — esto ya estaba bien en la
// lógica). RIVAL HAS WHAT YOU NEED = una es tuya, la consecutiva es
// del rival — todavía NO es un link, es una oportunidad de trade
// (computeRivalOpportunities — esto también ya estaba bien en la
// lógica, el problema era solo de presentación). El fix acá es de
// layout: LINK AVAILABLE va pegado a YOUR NIDANAS, RIVAL HAS WHAT YOU
// NEED va pegado a RIVAL NIDANAS — ya no hay un título "Available
// Links" que las agrupe como si fueran lo mismo. Sigue sin haber
// botón de trade ("No implementes todavía el trade" — Federico).
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
import { NIDANA_NUMBER_IMAGE, NIDANA_NUMBER } from "../game/nidanaNumberAssets";
import { REALM_AVATAR_NAME } from "../game/realmAvatarNames";
import {
  listCarriedNidanas,
  computeOwnLinks,
  computeRivalOpportunities,
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
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function NidanaRow({ realm, nidana }: { realm: RealmPieceKind; nidana: NidanaId }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 8px",
        borderRadius: 8,
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <img
        src={NIDANA_NUMBER_IMAGE[nidana]}
        alt={NIDANAS[nidana].label}
        style={{ width: 30, height: 30, objectFit: "contain", flexShrink: 0 }}
      />
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
        <span style={{ fontWeight: 700, color: "#f2e8d4" }}>
          {NIDANA_NUMBER[nidana]}. {NIDANAS[nidana].label}
        </span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          carried by {REALM_AVATAR_NAME[realm]}
        </span>
      </div>
    </div>
  );
}

function NidanaList({
  entries,
}: {
  entries: { realm: RealmPieceKind; nidana: NidanaId }[];
}) {
  if (entries.length === 0) {
    return (
      <div style={{ fontSize: 13, opacity: 0.55, fontStyle: "italic" }}>
        No Nidanas carried yet.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {entries.map((e) => (
        <NidanaRow key={e.realm} realm={e.realm} nidana={e.nidana} />
      ))}
    </div>
  );
}

// LINK AVAILABLE — ambas Nidanas de la pareja consecutiva ya están en
// tus propios Avatares. Nada que negociar, el link ya existe.
function LinkAvailableBlock({ links }: { links: OwnLink[] }) {
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.04em", color: "#9fd88a", marginBottom: 6 }}>
        LINK AVAILABLE
      </div>
      {links.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.5, fontStyle: "italic" }}>
          None yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {links.map((link) => (
            <div key={`${link.numA}-${link.numB}`} style={{ fontSize: 14, color: "#c9f0b8" }}>
              {link.numA} → {link.numB} &nbsp;
              <span style={{ opacity: 0.7 }}>
                ({NIDANAS[link.a].label} + {NIDANAS[link.b].label})
              </span>
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
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, letterSpacing: "0.04em", color: "#e8b06a", marginBottom: 6 }}>
        RIVAL HAS WHAT YOU NEED
      </div>
      {opportunities.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.5, fontStyle: "italic" }}>
          None yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {opportunities.map((op) => {
            const lo = Math.min(op.haveNum, op.needNum);
            const hi = Math.max(op.haveNum, op.needNum);
            return (
              <div key={`${op.haveNum}-${op.needNum}`} style={{ fontSize: 14, color: "#f2d19a" }}>
                [{op.needNum}] completes {lo} → {hi} &nbsp;
                <span style={{ opacity: 0.7 }}>
                  ({NIDANAS[op.need].label})
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
          width: "min(640px, 92vw)",
          maxHeight: "82vh",
          overflowY: "auto",
          padding: "24px 26px",
          borderRadius: 16,
          background: "linear-gradient(180deg, #14100a 0%, #0a0805 100%)",
          border: "1px solid rgba(216,196,138,0.28)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
          color: "#f2e8d4",
          cursor: "default",
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
        <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
          Messages, suspicious offers, and karmic arrangements.
        </div>

        <SectionTitle>{myLabel}</SectionTitle>
        <NidanaList entries={mine} />
        <LinkAvailableBlock links={ownLinks} />

        <div
          style={{
            borderTop: "1px solid rgba(216,196,138,0.2)",
            margin: "20px 0",
          }}
        />

        <SectionTitle>{rivalLabel}</SectionTitle>
        <NidanaList entries={rival} />
        <RivalHasWhatYouNeedBlock opportunities={rivalOpportunities} />

        <button
          onClick={onClose}
          style={{
            marginTop: 24,
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
