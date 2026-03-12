type RunExportButtonProps = {
  onClick: () => void;
};

export function RunExportButton({ onClick }: RunExportButtonProps) {
  return (
    <button
      onClick={onClick}
      style={{
        marginTop: 12,
        padding: "8px 14px",
        borderRadius: 8,
        background: "darkblue",
        color: "white",
        border: "1px solid rgba(255,255,255,0.2)",
        cursor: "pointer",
      }}
    >
      📄 Export Run JSON
    </button>
  );
}