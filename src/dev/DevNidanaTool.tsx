// src/dev/DevNidanaTool.tsx
// v74 (28 agosto 2026) — DEV — FANDANGO / NIDANA TEST TOOL. Pedido de
// Federico (relayando a Chaty): probar Fandango sin depender del azar
// del dado. Escribe directo sobre state.avatarNidana vía dos acciones
// nuevas del reducer (DEV_SET_AVATAR_NIDANA, DEV_SET_ALL_AVATAR_NIDANAS
// — ver reducer.ts) — el MISMO estado real que consume FandangoWindow,
// no un estado ficticio paralelo. No forma parte del estado
// persistente del jugador: todo lo que vive en ESTE componente (panel
// abierto/cerrado) es UI local, nunca se guarda.
//
// Gateado DOS veces contra producción: acá en GameShell.tsx (el padre
// solo monta este componente si import.meta.env.DEV), y otra vez
// adentro del reducer (las dos acciones son no-op si !import.meta.env.DEV)
// — aunque alguien lo dispare a mano desde la consola en producción, no
// pasa nada.
//
// "Máximo una Nidana por Avatar" ya es estructural (un slot único por
// realm) — el <select> de cada Avatar sustituye el valor anterior, no
// lo apila.
import React from "react";
import type { NidanaId } from "../game/nidanas";
import { NIDANA_LIST, NIDANAS } from "../game/nidanas";
import { NIDANA_NUMBER } from "../game/nidanaNumberAssets";
import type { PlayerId, RealmPieceKind } from "../game/types";
import { REALM_PIECE_ORDER } from "../game/types";
import { REALM_AVATAR_NAME } from "../game/realmAvatarNames";

type AvatarNidanaMap = Record<PlayerId, Partial<Record<RealmPieceKind, NidanaId>>>;

type Props = {
  avatarNidana: AvatarNidanaMap;
  onSetAvatarNidana: (
    player: PlayerId,
    realm: RealmPieceKind,
    nidana: NidanaId | null,
  ) => void;
  onSetAll: (avatarNidana: AvatarNidanaMap) => void;
};

// Los 3 presets del pedido de Federico — reproducibles, sirven también
// como caso de prueba para "Preset X → pulsa esto → ocurre esto" al
// reportar un bug.
const PRESETS: {
  key: string;
  label: string;
  avatarNidana: AvatarNidanaMap;
}[] = [
  {
    key: "A",
    label: "A — 3,4,8 vs 5,7",
    avatarNidana: {
      P1: {
        hungry_ghost: "CONSCIOUSNESS", // 3
        hell: "NAME_AND_FORM", // 4
        animals: "CRAVING", // 8
      },
      P2: {
        hungry_ghost: "SIX_SENSES", // 5
        hell: "FEELING", // 7
      },
    },
  },
  {
    key: "B",
    label: "B — 4,5,6 vs —",
    avatarNidana: {
      P1: {
        hungry_ghost: "NAME_AND_FORM", // 4
        hell: "SIX_SENSES", // 5
        animals: "CONTACT", // 6
      },
      P2: {},
    },
  },
  {
    key: "C",
    label: "C — 1,12 vs —",
    avatarNidana: {
      P1: {
        hungry_ghost: "IGNORANCE", // 1
        hell: "DEATH", // 12
      },
      P2: {},
    },
  },
];

const presetButtonStyle: React.CSSProperties = {
  fontSize: 10,
  padding: "4px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,0.06)",
  color: "#f2e8d4",
  border: "1px solid rgba(216,196,138,0.28)",
  cursor: "pointer",
};

function AvatarNidanaSelect({
  realm,
  value,
  onChange,
}: {
  realm: RealmPieceKind;
  value: NidanaId | undefined;
  onChange: (nidana: NidanaId | null) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "3px 0",
      }}
    >
      <span style={{ fontSize: 12, opacity: 0.85, width: 62, flexShrink: 0 }}>
        {REALM_AVATAR_NAME[realm]}
      </span>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : (v as NidanaId));
        }}
        style={{
          flex: 1,
          fontSize: 11,
          background: "#1a1610",
          color: "#f2e8d4",
          border: "1px solid rgba(216,196,138,0.28)",
          borderRadius: 4,
          padding: "2px 4px",
        }}
      >
        <option value="">—</option>
        {NIDANA_LIST.map((id) => (
          <option key={id} value={id}>
            {NIDANA_NUMBER[id]}. {NIDANAS[id].label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function DevNidanaTool({ avatarNidana, onSetAvatarNidana, onSetAll }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "fixed",
          right: 8,
          top: 60,
          zIndex: 20000,
          fontSize: 11,
          padding: "4px 8px",
          borderRadius: 6,
          background: "rgba(0,0,0,0.55)",
          color: "#8ad0ff",
          border: "1px solid rgba(138,208,255,0.4)",
          cursor: "pointer",
        }}
      >
        DEV: Nidana Tool
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            right: 8,
            top: 88,
            zIndex: 20000,
            width: 300,
            maxHeight: "70vh",
            overflowY: "auto",
            padding: 12,
            borderRadius: 10,
            background: "#14100a",
            border: "1px solid rgba(216,196,138,0.28)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            color: "#f2e8d4",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              marginBottom: 8,
              color: "#8ad0ff",
            }}
          >
            DEV — FANDANGO / NIDANA TEST TOOL
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => onSetAll(preset.avatarNidana)}
                style={presetButtonStyle}
              >
                Preset {preset.label}
              </button>
            ))}
            <button
              onClick={() => onSetAll({ P1: {}, P2: {} })}
              style={{
                ...presetButtonStyle,
                color: "#ff9c9c",
                borderColor: "rgba(255,156,156,0.4)",
              }}
            >
              Clear All
            </button>
          </div>

          {(["P1", "P2"] as PlayerId[]).map((player) => (
            <div key={player} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.6,
                  marginBottom: 4,
                  borderTop: "1px solid rgba(216,196,138,0.15)",
                  paddingTop: 6,
                }}
              >
                {player}
              </div>
              {REALM_PIECE_ORDER.map((realm) => (
                <AvatarNidanaSelect
                  key={realm}
                  realm={realm}
                  value={avatarNidana[player]?.[realm]}
                  onChange={(nidana) => onSetAvatarNidana(player, realm, nidana)}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
