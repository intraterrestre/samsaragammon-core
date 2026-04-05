type RealmInsightPanelProps = {
  open: boolean;
  realm: "HUNGRY_GHOST" | "HUMAN" | "ANIMAL" | "HELL" | "ASURA" | "DEVA" | "NIRVANA";
  onClose: () => void;
};

const INSIGHT_MAP = {
  HUNGRY_GHOST: {
    title: "Primitive Awareness Unlocked",
    subtitle: "Hungry Ghost Realm",
    body: [
      "Desire moves before thought.",
      "Instinct reaches before understanding.",
      "Now you begin to see the hunger itself.",
    ],
    reward: "Hungry Ghost Coin · Level 1",
    tone: "#8c6b3f",
  },
  HELL: {
    title: "Pain Loop Detected",
    subtitle: "Hell Realm",
    body: [
      "Suffering is not punishment.",
      "It is feedback from a trapped pattern.",
      "Awareness begins where repetition hurts.",
    ],
    reward: "No coin yet · Awareness only",
    tone: "#8e3b3b",
  },
  ANIMAL: {
    title: "Instinct Stabilized",
    subtitle: "Animal Realm",
    body: [
      "You survive by pattern.",
      "You repeat what feels safe.",
      "But repetition is not freedom.",
    ],
    reward: "Animal Coin Fragment",
    tone: "#9a7b2f",
  },
  HUMAN: {
    title: "Choice Awakened",
    subtitle: "Human Realm",
    body: [
      "For the first time, reaction can become choice.",
      "Emotion and thought begin to separate.",
      "You can now act with awareness.",
    ],
    reward: "Human Coin Unlocked",
    tone: "#6d5b8d",
  },
  ASURA: {
    title: "Conflict Consciousness",
    subtitle: "Titan Realm",
    body: [
      "You no longer fight blindly.",
      "Now you can witness the engine of rivalry.",
      "Power without awareness feeds the wheel.",
    ],
    reward: "Titan Coin Unlocked",
    tone: "#8b4a2f",
  },
  DEVA: {
    title: "Pleasure Recognized",
    subtitle: "Deva Realm",
    body: [
      "Comfort can imitate freedom.",
      "Pleasure can hide stagnation.",
      "Awareness must remain awake inside delight.",
    ],
    reward: "Deva Coin Unlocked",
    tone: "#b39b52",
  },
  NIRVANA: {
    title: "Cycle Broken",
    subtitle: "Nirvana",
    body: [
      "You are no longer reacting blindly.",
      "You are no longer trapped by becoming.",
      "The wheel loosens its hold.",
    ],
    reward: "Nirvana Medallion Unlocked",
    tone: "#d8d8d8",
  },
} as const;

export function RealmInsightPanel({
  open,
  realm,
  onClose,
}: RealmInsightPanelProps) {
  if (!open) return null;

  const data = INSIGHT_MAP[realm];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.76)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 3000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(92vw, 680px)",
          borderRadius: 24,
          padding: 24,
          background: "linear-gradient(180deg, rgba(30,30,30,0.98), rgba(18,18,18,0.98))",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 24px 90px rgba(0,0,0,0.45)",
          color: "rgba(255,255,255,0.94)",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 6,
            color: data.tone,
            textAlign: "center",
          }}
        >
          {data.title}
        </div>

        <div
          style={{
            fontSize: 15,
            opacity: 0.78,
            textAlign: "center",
            marginBottom: 18,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {data.subtitle}
        </div>

        <div
          style={{
            borderRadius: 18,
            padding: 18,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            marginBottom: 18,
          }}
        >
          {data.body.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: 17,
                lineHeight: 1.5,
                marginBottom: i === data.body.length - 1 ? 0 : 10,
                textAlign: "center",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
            textAlign: "center",
            marginBottom: 18,
          }}
        >
          Reward: {data.reward}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.94)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}