import BrandWordmark from "./BrandWordmark";
import React, { useState } from "react";
import introImage from "../assets/intro/intro_samsaragammon.webp";
import { useI18n } from "../i18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { NarratorSwitch } from "./NarratorSwitch";
import { BOT_LEVELS, type BotLevel } from "../game/bot/buddhaBot";

type Props = {
  userId: string;
  onCreateGame: () => Promise<void>;
  onJoinGame: (code: string) => Promise<void>;
  onPlayLocal: () => void;
  onPlayWithBuddha?: () => void;
  // 15 nov 2026 — nivel del bot Buddha (juega con negras en JUEGA CON BUDDHA).
  botLevel?: BotLevel;
  onBotLevel?: (level: BotLevel) => void;
  // 16 nov 2026 — interruptor "Ayudas" (ver UI/helpsPref.ts).
  helpsOff?: boolean;
  onHelpsOff?: (off: boolean) => void;
  // 3 oct 2026 — sin sesión, el lobby igual se muestra (Buddha y local
  // son libres). 16 nov 2026: jugar a distancia ya no pide correo
  // (acceso anónimo en App.tsx); signedIn/onSignIn quedan sin uso aquí.
  signedIn?: boolean;
  onSignIn?: () => void;
  createdCode?: string | null;
  // Texto mientras se entra por un enlace de invitación.
  busyText?: string | null;
  isLoading?: boolean;
  error?: string | null;
  // 16 nov 2026 — partida online sin terminar a la que se puede volver.
  resume?: { code: string; role: "P1" | "P2"; waiting: boolean } | null;
  onResume?: () => void;
  // 23 nov 2026 — modo de pruebas de Federico: 5 toques seguidos sobre el
  // nombre del juego lo activan o lo apagan (en la app de la pantalla de
  // inicio no se puede escribir ?saltos en la dirección).
  testerOn?: boolean;
  onToggleTester?: () => void;
};

export function Lobby({
  onCreateGame,
  onJoinGame,
  onPlayLocal,
  onPlayWithBuddha,
  botLevel = "normal",
  onBotLevel,
  helpsOff = false,
  onHelpsOff,
  createdCode,
  busyText,
  isLoading,
  error,
  resume,
  onResume,
  testerOn = false,
  onToggleTester,
}: Props) {
  const tapsRef = React.useRef<number[]>([]);
  const onWordmarkTap = () => {
    if (!onToggleTester) return;
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t0) => now - t0 < 2500), now];
    if (tapsRef.current.length >= 5) {
      tapsRef.current = [];
      onToggleTester();
    }
  };
  const [joinCode, setJoinCode] = useState("");
  const { t } = useI18n();

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    await onJoinGame(joinCode.trim());
  };

  // 16 nov 2026 — html/body tienen overflow:hidden (lo necesita el tablero),
  // así que esta pantalla hace su propio scroll: en el iPhone no se llegaba
  // al botón de abajo. El div de dentro sigue centrando cuando hay sitio.
  return (
    <div style={{ height: "100dvh", overflowY: "auto", WebkitOverflowScrolling: "touch", background: "#000" }}>
    <div
      style={{
        minHeight: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#e8dcc8",
        fontFamily: "system-ui, sans-serif",
        padding: 24,
        gap: 32,
      }}
    >
      <div style={{ textAlign: "center", width: "100%", maxWidth: 420 }}>
        <img
          src={introImage}
          alt="Samsaragammon"
          style={{
            width: "100%",
            maxHeight: "45vh",
            objectFit: "contain",
            borderRadius: 12,
          }}
        />
        <div
          onClick={onWordmarkTap}
          style={{ marginTop: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, userSelect: "none", WebkitUserSelect: "none" }}
        >
          <BrandWordmark size={18} />
          {testerOn && (
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "#9fd88a" }}>{t("tester.on")}</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <LanguageSwitch />
        <NarratorSwitch />
      </div>

      {error && (
        <div
          style={{
            background: "rgba(255,80,80,0.12)",
            border: "1px solid rgba(255,80,80,0.3)",
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            color: "#ff8080",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 340,
        }}
      >
        {resume && onResume && !createdCode && (
          <button
            onClick={onResume}
            disabled={isLoading}
            style={{
              ...btnStyle("primary"),
              background: "#d9a521",
              color: "#1a1204",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span>{t("lobby.resume")}</span>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>
              {t(resume.waiting ? "lobby.resumeWaiting" : "lobby.resumeSub", {
                code: resume.code,
                color: t(resume.role === "P1" ? "lobby.colorWhite" : "lobby.colorBlack"),
              })}
            </span>
          </button>
        )}

        {/* PLAY WITH BUDDHA (30 sept 2026) — modo principiante: partida
            local donde el tablero ilumina qué se puede tocar. Solo se
            muestra si App.tsx pasa el callback. */}
        {onPlayWithBuddha && (
          <button
            onClick={onPlayWithBuddha}
            disabled={isLoading}
            style={{
              ...btnStyle("primary"),
              background: "#3f6fd8",
              color: "#f4f7ff",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span>{t("lobby.playWithBuddha")}</span>
            <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
              {t("lobby.playWithBuddhaSub")}
            </span>
          </button>
        )}

        {/* 15 nov 2026 — Buddha juega con negras: elige su nivel. */}
        {onPlayWithBuddha && onBotLevel && (
          <div
            role="radiogroup"
            aria-label={t("lobby.buddhaLevel")}
            style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: -4 }}
          >
            {BOT_LEVELS.map((level) => {
              const on = level === botLevel;
              return (
                <button
                  key={level}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onBotLevel(level)}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 999,
                    border: `1px solid ${on ? "#9cc4ff" : "rgba(156,196,255,0.35)"}`,
                    background: on ? "rgba(63,111,216,0.55)" : "transparent",
                    color: on ? "#f4f7ff" : "rgba(244,247,255,0.7)",
                    fontSize: 13,
                    fontWeight: on ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {t(`bot.${level}`)}
                </button>
              );
            })}
          </div>
        )}

        {onHelpsOff && (
          <button
            type="button"
            role="switch"
            aria-checked={!helpsOff}
            onClick={() => onHelpsOff(!helpsOff)}
            style={{
              alignSelf: "center",
              marginTop: -12,
              padding: "4px 12px",
              borderRadius: 999,
              border: "1px solid rgba(232,220,200,0.25)",
              background: "transparent",
              color: "rgba(232,220,200,0.75)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {helpsOff ? t("helps.lobbyOff") : t("helps.lobbyOn")}
          </button>
        )}

        {/* 16 nov 2026 — jugar a distancia sin correo: un botón crea la
            partida (acceso anónimo en App.tsx) y da un ENLACE para invitar.
            Quien lo toca entra directo (?partida=CÓDIGO). El código sigue
            visible por si alguien prefiere dictarlo. */}
        {!createdCode && (
          <button
            onClick={onCreateGame}
            disabled={isLoading}
            style={{
              ...btnStyle("primary"),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <span>{isLoading ? busyText ?? t("lobby.creating") : t("lobby.playOnline")}</span>
            {!isLoading && (
              <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.8 }}>
                {t("lobby.playOnlineSub")}
              </span>
            )}
          </button>
        )}

        {createdCode && (
          <InvitePanel code={createdCode} />
        )}

        {!createdCode && (
          <details style={{ fontSize: 13, opacity: 0.85 }}>
            <summary style={{ cursor: "pointer", textAlign: "center", listStyle: "none" }}>
              {t("lobby.haveCode")}
            </summary>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <input
                type="text"
                placeholder={t("lobby.codePlaceholder")}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#e8dcc8",
                  fontSize: 14,
                  fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <button
                onClick={handleJoin}
                disabled={isLoading || !joinCode.trim()}
                style={btnStyle("secondary")}
              >
                {t("lobby.join")}
              </button>
            </div>
          </details>
        )}

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 12,
          }}
        >
          <button onClick={onPlayLocal} style={btnStyle("ghost")}>
            {t("lobby.playLocal")}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

/** Invitación a una partida a distancia: compartir enlace (menú del móvil) o copiarlo. */
function InvitePanel({ code }: { code: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/?partida=${encodeURIComponent(code)}`
      : `/?partida=${code}`;
  const text = t("lobby.inviteText");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(t("lobby.inviteCopy"), url);
    }
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Samsaragammon", text, url });
        return;
      } catch {
        // cancelado por el usuario: no hacemos nada
        return;
      }
    }
    await copy();
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(240,192,96,0.35)",
        borderRadius: 16,
        padding: 18,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: "#f0c060" }}>{t("lobby.inviteTitle")}</div>
      <button onClick={share} style={btnStyle("primary")}>
        {t("lobby.inviteShare")} ↗
      </button>
      <button onClick={copy} style={{ ...btnStyle("ghost"), padding: "8px 14px", fontSize: 13 }}>
        {copied ? t("lobby.inviteCopied") : t("lobby.inviteCopy")}
      </button>
      <div style={{ fontSize: 12, opacity: 0.6 }}>
        {t("lobby.orCode")}{" "}
        <span style={{ fontFamily: "monospace", fontWeight: 900, letterSpacing: 2, color: "#f0c060", fontSize: 15 }}>
          {code}
        </span>
      </div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{t("lobby.youAreWhite")}</div>
      <div style={{ fontSize: 12, opacity: 0.5 }}>{t("lobby.waiting")}</div>
    </div>
  );
}

function btnStyle(variant: "primary" | "secondary" | "ghost"): React.CSSProperties {
  const base: React.CSSProperties = {
    width: "100%",
    padding: "12px 20px",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
    transition: "opacity 0.15s",
    letterSpacing: 0.5,
  };

  if (variant === "primary") {
    return { ...base, background: "#c8a84b", color: "#1a1200" };
  }
  if (variant === "secondary") {
    return {
      ...base,
      width: "auto",
      background: "rgba(255,255,255,0.1)",
      color: "#e8dcc8",
      border: "1px solid rgba(255,255,255,0.2)",
      padding: "10px 16px",
    };
  }
  return {
    ...base,
    background: "none",
    color: "rgba(232,220,200,0.5)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontSize: 13,
  };
}
