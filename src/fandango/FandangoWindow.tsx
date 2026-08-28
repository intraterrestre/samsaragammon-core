// src/fandango/FandangoWindow.tsx
// v72 (28 agosto 2026) — la ventana real de Chat Fandango, primera
// fase (solo lectura). Pedido de Federico: "construyamos primero
// únicamente esta ventana de lectura: YOUR NIDANAS / RIVAL NIDANAS /
// AVAILABLE LINKS. Sin trades, sin Vestigium nuevo y sin Big Head
// School todavía." Se abre con un click en el ícono de FandangoKarma.
//
// Montado FUERA de .samsaraScene (mismo nivel que LedgerModal en
// GameShell.tsx) a propósito — es un position:fixed de pantalla
// completa, y un ancestro con transform (.samsaraScene) se vuelve el
// containing block de cualquier descendiente fixed, recortándolo con
// su overflow:hidden. Mismo bug que ya se arregló en VictoryScreen.tsx
// (ver ese archivo) — acá se evita de raíz montando en el lugar
// correcto en vez de portal.
import type { NidanaId } from "../game/nidanas";
import { NIDANAS } from "../game/nidanas";
import type { RealmPieceKind } from "../game/types";
import { NIDANA_NUMBER_IMAGE, NIDANA_NUMBER } from "../game/nidanaNumberAssets";
import {
  listCarriedNidanas,
  computeOwnLinks,
  computeRivalOpportunities,
} from "./nidanaLinks";

const REALM_AVATAR_NAME: Record<RealmPieceKind, string> = {
  hungry_ghost: "Bruno",
  hell: "Margot",
  animals: "Oriol",
  humans: "Marino",
  asura: "Rufus",
  deva: "Whitman",
};

type Props = {
  open: boolean;
  onClose: () => void;
  myNidanas: Partial<Record<RealmPieceKind, NidanaId>>;
  rivalNidanas: Partial<Record<RealmPieceKind, NidanaId>>;
  myLabel: string;
  rivalLabel: string;
};

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

function NidanaColumn({
  label,
  entries,
}: {
  label: string;
  entries: { realm: RealmPieceKind; nidana: NidanaId }[];
}) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
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
        {label}
      </div>
      {entries.length === 0 ? (
        <div style={{ fontSize: 13, opacity: 0.55, fontStyle: "italic" }}>
          No Nidanas carried yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {entries.map((e) => (
            <NidanaRow key={e.realm} realm={e.realm} nidana={e.nidana} />
          ))}
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

        <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
          <NidanaColumn label={myLabel} entries={mine} />
          <NidanaColumn label={rivalLabel} entries={rival} />
        </div>

        <div
          style={{
            fontFamily: "'Cinzel', 'Trajan Pro', 'Times New Roman', serif",
            fontSize: 14,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#d8c48a",
            marginBottom: 8,
            borderTop: "1px solid rgba(216,196,138,0.2)",
            paddingTop: 16,
          }}
        >
          Available Links
        </div>

        {ownLinks.length === 0 && rivalOpportunities.length === 0 ? (
          <div style={{ fontSize: 13, opacity: 0.55, fontStyle: "italic" }}>
            No sequential Nidanas in play yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {ownLinks.length > 0 && (
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                  You already hold a sequence:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {ownLinks.map((link) => (
                    <div key={`${link.numA}-${link.numB}`} style={{ fontSize: 14 }}>
                      {link.numA}. {NIDANAS[link.a].label} + {link.numB}.{" "}
                      {NIDANAS[link.b].label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rivalOpportunities.length > 0 && (
              <div>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
                  Rival has what you need:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {rivalOpportunities.map((op) => (
                    <div key={`${op.haveNum}-${op.needNum}`} style={{ fontSize: 14 }}>
                      You hold {op.haveNum}. {NIDANAS[op.have].label} — rival holds{" "}
                      {op.needNum}. {NIDANAS[op.need].label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
