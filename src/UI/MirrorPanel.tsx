type MirrorPanelProps = {
  title: string;
  body: string;
  tags: string[];
};

export function MirrorPanel({ title, body, tags }: MirrorPanelProps) {
  return (
    <div style={{ margin: "10px auto 8px", maxWidth: 860, opacity: 0.96 }}>
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.04)",
          fontSize: 14,
        }}
      >
        <b>{title}:</b>

        <div style={{ marginTop: 6, lineHeight: 1.45 }}>
          {body}
        </div>

        <div style={{ marginTop: 8, opacity: 0.8, fontSize: 12 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: "inline-block",
                marginRight: 6,
                marginTop: 4,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}