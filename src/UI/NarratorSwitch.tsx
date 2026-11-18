// src/UI/NarratorSwitch.tsx — selector global VOZ / TEXTO / AMBOS
// (18 nov 2026). Mismas pastillas que LanguageSwitch y va siempre a su
// lado. TEXTO = narración desactivada. Se recuerda en este dispositivo
// (ver src/UI/narrator.ts).

import { useI18n } from "../i18n";
import { useNarration, useNarrator, type NarrateOptions, type NarratorMode } from "./narrator";

const ORDER: NarratorMode[] = ["voice", "text", "both"];
const KEY = { voice: "narrator.voice", text: "narrator.text", both: "narrator.both" } as const;

export function NarratorSwitch() {
  const { t } = useI18n();
  const { mode, available, setMode } = useNarrator();
  return (
    <div
      role="group"
      aria-label={t("narrator.label")}
      style={{
        display: "flex",
        gap: 6,
        justifyContent: "center",
        alignItems: "center",
        padding: "5px 6px 5px 14px",
        borderRadius: 999,
        border: "1px solid rgba(200,168,75,0.55)",
        background: "rgba(200,168,75,0.08)",
        // Sin voz en este dispositivo: se ve, pero atenuado (el texto sigue).
        opacity: available || mode === "text" ? 1 : 0.6,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18, marginRight: 4 }}>
        {mode === "text" ? "🔇" : "🔊"}
      </span>
      {ORDER.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            background: mode === m ? "#c8a84b" : "transparent",
            color: mode === m ? "#1a1200" : "rgba(232,220,200,0.9)",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: 1,
            cursor: "pointer",
          }}
        >
          {t(KEY[m])}
        </button>
      ))}
    </div>
  );
}

// Para pantallas que ya muestran su propio texto: lo narra sin dibujar
// nada. <Narrate text={...} source="help" />
export function Narrate({ text, source, priority }: { text: string | null | undefined } & NarrateOptions) {
  useNarration(text, { source, priority });
  return null;
}
