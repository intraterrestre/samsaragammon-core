import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MasterGuide({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={header}>
          <span>☯ Book of the Master</span>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={content}>
          <Section
            title="IMPACT"
            text="When your path touches another, their journey changes. Some act with intent. Others, without knowing."
          />

          <Section
            title="RISK"
            text="There are steps that move you forward… but leave you exposed to what follows."
          />

          <Section
            title="SAME"
            text="Different paths may lead to the same place. What matters then… is the one who chooses."
          />
        </div>
      </div>
    </div>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>{title}</div>
      <div style={{ opacity: 0.8 }}>{text}</div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const modal: React.CSSProperties = {
  width: 360,
  maxWidth: "90vw",
  background: "#1e1e1e",
  color: "white",
  borderRadius: 16,
  padding: 16,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
  fontWeight: 800,
};

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  cursor: "pointer",
  fontSize: 16,
};

const content: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.4,
};