import { useState } from "react";
import { MasterGuide } from "./MasterGuide";

type MasterTone = "neutral" | "soft" | "unstable" | "intense";

type MasterPanelProps = {
  text: string;
  tone?: MasterTone;
};

export function MasterPanel({
  text,
  tone = "neutral",
}: MasterPanelProps) {
  const [showGuide, setShowGuide] = useState(false);

  const panelGlow =
    tone === "intense"
      ? "0 0 22px rgba(255,80,80,0.28)"
      : tone === "soft"
      ? "0 0 22px rgba(120,255,180,0.24)"
      : tone === "unstable"
      ? "0 0 22px rgba(255,200,80,0.28)"
      : "0 0 0 rgba(0,0,0,0)";

  const panelBorder =
    tone === "intense"
      ? "1px solid rgba(255,120,120,0.28)"
      : tone === "soft"
      ? "1px solid rgba(160,255,210,0.24)"
      : tone === "unstable"
      ? "1px solid rgba(255,220,120,0.28)"
      : "1px solid rgba(255,255,255,0.14)";

  const titleColor =
    tone === "intense"
      ? "rgba(255,170,170,0.98)"
      : tone === "soft"
      ? "rgba(200,255,220,0.98)"
      : tone === "unstable"
      ? "rgba(255,230,170,0.98)"
      : "rgba(255,255,255,0.95)";

  return (
    <div style={{ margin: "16px auto 10px", maxWidth: 860 }}>
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 18,
          border: panelBorder,
          background: "rgba(0,0,0,0.16)",
          fontSize: 14,
          position: "relative",
          boxShadow: panelGlow,
          transition: "box-shadow 0.35s ease, border-color 0.35s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              letterSpacing: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: titleColor,
              transition: "color 0.35s ease",
            }}
          >
            <span
              style={{
                display: "inline-block",
                animation: "spinSlow 20s linear infinite",
              }}
            >
              ☯️
            </span>
            Master Ying-Yang
          </div>

          <button
            onClick={() => setShowGuide(true)}
            style={{
              fontSize: 12,
              padding: "5px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              cursor: "pointer",
              boxShadow: "0 0 8px rgba(255,255,255,0.12)",
              transition:
                "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.12)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 0 8px rgba(255,255,255,0.12)";
            }}
          >
            📖 Book
          </button>
        </div>

        <div
          style={{
            whiteSpace: "pre-line",
            lineHeight: 1.6,
            opacity: 0.95,
            animation: "fadeInSoft 0.5s ease",
          }}
        >
          {text}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 11,
            opacity: 0.6,
            fontStyle: "italic",
          }}
        >
          The master speaks only when you are ready to listen.
        </div>
      </div>

      <MasterGuide open={showGuide} onClose={() => setShowGuide(false)} />
    </div>
  );
}