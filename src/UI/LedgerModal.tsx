import React from "react";
import { LEDGER } from "../game/ledgerEntries";

type Props = {
  open: boolean;
  entryId: string | null;
  onClose: () => void;
};

export function LedgerModal({ open, entryId, onClose }: Props) {
  if (!open || !entryId) return null;

  const entry = LEDGER[entryId as keyof typeof LEDGER];
  if (!entry) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: "min(680px, 92vw)",
          maxHeight: "80vh",
          overflowY: "auto",
          padding: 20,
          borderRadius: 16,
          background: "#111",
          color: "white",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <h2 style={{ marginBottom: 12 }}>{entry.title}</h2>

        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
          {entry.body}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            height: 40,
            padding: "0 16px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
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