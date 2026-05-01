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
    padding: "14px 18px",
    borderRadius: 999, // 👈 esto lo vuelve ovalado
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    fontSize: 14,

    boxShadow: "0 8px 24px rgba(0,0,0,0.15)", // 👈 le da presencia
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