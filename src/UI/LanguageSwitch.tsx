// src/UI/LanguageSwitch.tsx — selector de idioma (2 octubre 2026).
// Pastillas redondeadas (Curvismo). Cambia el idioma al instante y lo
// recuerda en este dispositivo (ver src/i18n/index.ts).

import { useI18n, LANGS } from "../i18n";

export function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div
      role="group"
      aria-label="Language / Idioma"
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        padding: 4,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          style={{
            padding: "6px 14px",
            borderRadius: 999,
            border: "none",
            background: lang === l ? "#c8a84b" : "transparent",
            color: lang === l ? "#1a1200" : "rgba(232,220,200,0.7)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
