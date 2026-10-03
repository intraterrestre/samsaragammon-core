// src/UI/LanguageSwitch.tsx — selector de idioma (2 octubre 2026).
// Pastillas redondeadas (Curvismo). Cambia el idioma al instante y lo
// recuerda en este dispositivo (ver src/i18n/index.ts).
// 3 oct 2026 — Federico no lo veía: más grande, con 🌐 y el nombre de
// cada idioma escrito en ese idioma.

import { useI18n, LANGS, type Lang } from "../i18n";

const LABELS: Record<Lang, string> = { en: "English", es: "Español" };

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
        alignItems: "center",
        padding: "5px 6px 5px 14px",
        borderRadius: 999,
        border: "1px solid rgba(200,168,75,0.55)",
        background: "rgba(200,168,75,0.08)",
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, marginRight: 4 }}>🌐</span>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: lang === l ? "#c8a84b" : "transparent",
            color: lang === l ? "#1a1200" : "rgba(232,220,200,0.9)",
            fontSize: 15,
            fontWeight: 800,
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
