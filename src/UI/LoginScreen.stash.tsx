import introImage from "../assets/intro/intro_samsaragammon.webp";

type LoginScreenProps = {
  onLogin: () => void | Promise<void>;
};

export function LoginScreen({ onLogin }: LoginScreenProps) {
  return (
    <div
      style={{
        padding: 24,
        color: "white",
        fontFamily: "Cinzel, serif",
        textAlign: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#000"
      }}
    >
      <img
        src={introImage}
        alt="Samsaragammon"
        style={{
          maxWidth: "90vw",
          maxHeight: "60vh",
          objectFit: "contain",
          marginBottom: 24
        }}
      />

        <div
        style={{
          marginTop: 18,
          opacity: 0.85,
          fontSize: 22,
          maxWidth: 500
        }}
      >
        Nobody Escapes The Wheel
      </div>

      <button
        onClick={onLogin}
        style={{
          marginTop: 36,
          padding: "14px 32px",
          fontSize: 18,
          cursor: "pointer"
        }}
      >
   PROVE IT
      </button>
    </div>
  );
}