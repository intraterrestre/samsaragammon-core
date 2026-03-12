type MasterPanelProps = {
  text: string;
};

export function MasterPanel({ text }: MasterPanelProps) {
  return (
    <div style={{ margin: "12px auto 8px", maxWidth: 860, opacity: 0.92 }}>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.12)",
          fontSize: 14,
        }}
      >
        <b>Master Ying-Yang:</b>

        <div style={{ whiteSpace: "pre-line", marginTop: 6 }}>
          {text}
        </div>
      </div>
    </div>
  );
}