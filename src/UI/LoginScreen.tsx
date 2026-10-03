import { useState } from "react";
import introImage from "../assets/intro/intro_samsaragammon.webp";
import { supabase } from "../lib/supabaseClient";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";

type LoginScreenProps = {
  onLogin: () => void | Promise<void>;
  // 3 oct 2026 — el login ahora se abre desde el lobby (solo para jugar
  // en línea): "Volver" regresa sin iniciar sesión.
  onBack?: () => void;
};

export function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();

  // v75 (28 agosto 2026) — bug reportado por Federico: el botón se
  // quedaba trabado en "Sending…" para siempre, sin mostrar error. Acá
  // no había try/catch: si supabase.auth.signInWithOtp lanzaba una
  // excepción real (no un {error} normal, sino algo tipo URL de
  // Supabase inválida o fetch fallido antes de que la librería llegue
  // a devolver su propio objeto de error), el await nunca terminaba de
  // resolver del lado de este componente y setLoading(false) —que
  // vivía en la línea siguiente— nunca se ejecutaba. Ahora cualquier
  // excepción se atrapa, se apaga el loading, y se muestra un mensaje
  // real en vez de quedarse colgado en silencio. Mismo fix aplicado a
  // handleVerifyCode por consistencia (mismo patrón, mismo riesgo).
  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (error) {
        setError(error.message);
      } else {
        setStep("code");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? t("login.couldNotSendDetail", { detail: err.message })
          : t("login.couldNotSend"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (error) {
        setError(t("login.invalidCode"));
      } else {
        onLogin();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? t("login.couldNotVerifyDetail", { detail: err.message })
          : t("login.couldNotVerify"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        color: "white",
        fontFamily: "Cinzel, serif",
        textAlign: "center",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "#000",
      }}
    >
      <img
        src={introImage}
        alt="Samsaragammon"
        style={{
          maxWidth: "90vw",
          maxHeight: "50vh",
          objectFit: "contain",
          marginBottom: 24,
        }}
      />

      <LanguageSwitch />

      <div style={{ marginTop: 8, maxWidth: 500 }}>
        <div style={{ opacity: 0.95, fontSize: 22, fontWeight: 700, letterSpacing: 0.5 }}>
          {t("login.question")}
        </div>
        <div style={{ marginTop: 8, fontSize: 19, letterSpacing: 1 }}>
          <span style={{ opacity: 0.85 }}>{t("login.then")} </span>
          <span style={{ color: "#c8a84b" }}>{t("login.breakTheBox")}</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 36,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 320,
        }}
      >
        {step === "email" ? (
          <>
            <input
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
              autoFocus
              style={inputStyle}
            />
            <button
              onClick={handleSendCode}
              disabled={loading || !email.trim()}
              style={btnStyle}
            >
              {loading ? t("login.sending") : t("login.proveIt")}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 4 }}>
              {t("login.checkEmail")}
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
              autoFocus
              style={{ ...inputStyle, letterSpacing: 8, fontSize: 22, textAlign: "center" }}
            />
            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length < 6}
              style={btnStyle}
            >
              {loading ? t("login.verifying") : t("login.enter")}
            </button>
            <button
              onClick={() => { setStep("email"); setError(null); setCode(""); }}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", marginTop: 4 }}
            >
              {t("login.changeEmail")}
            </button>
          </>
        )}

        {error && (
          <div style={{ color: "#ff8080", fontSize: 13, marginTop: 4 }}>{error}</div>
        )}
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: 28,
            background: "none",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 999,
            color: "rgba(255,255,255,0.8)",
            padding: "10px 22px",
            fontSize: 15,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {t("login.back")}
        </button>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 10,
  padding: "12px 16px",
  color: "white",
  fontSize: 16,
  fontFamily: "system-ui, sans-serif",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  padding: "14px 32px",
  fontSize: 16,
  cursor: "pointer",
  background: "#c8a84b",
  color: "#1a1200",
  border: "none",
  borderRadius: 10,
  fontWeight: 700,
  fontFamily: "Cinzel, serif",
  letterSpacing: 1,
};
