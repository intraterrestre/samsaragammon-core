import { supabase } from "./supabaseClient";
import type { GameState } from "../game/types";

export type GameStatus = "waiting" | "active" | "paused" | "finished";

export type Game = {
  id: string;
  code: string;
  player1_id: string;
  player2_id: string | null;
  state: GameState;
  status: GameStatus;
  pause_reason: string | null;
  pause_data: any;
  winner: string | null;
  version: number;
};

// Genera un código legible tipo "KARMA-7X3"
function generateCode(): string {
  const words = ["KARMA", "DHARMA", "LOTUS", "BODHI", "SAMSARA", "MARA", "NIRVANA"];
  const word = words[Math.floor(Math.random() * words.length)];
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${word}-${suffix}`;
}

// Crea una nueva partida (el que llama es P1)
export async function createGame(
  userId: string,
  initialState: GameState
): Promise<Game> {
  const code = generateCode();

  const { data, error } = await supabase
    .from("games")
    .insert({
      code,
      player1_id: userId,
      state: initialState,
      status: "waiting",
      version: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Game;
}

// Unirse a una partida por código (el que llama es P2)
// Va por un RPC (SECURITY DEFINER) porque la policy de SELECT normal
// ("Players can view their games") solo deja ver la fila a quien YA es
// player1 o player2. P2 todavía no calza ahí antes de unirse, así que
// un select directo siempre devuelve 0 filas -> "Partida no encontrada",
// aunque el código sea correcto y la partida exista.
export async function joinGame(
  code: string,
  _userId: string
): Promise<Game> {
  const { data, error } = await supabase.rpc("join_game_by_code", {
    p_code: code.toUpperCase(),
  });

  if (error) throw new Error(error.message || "Partida no encontrada");
  return data as Game;
}

// Actualiza el estado del juego con control de versión
export async function updateGameState(
  gameId: string,
  newState: GameState,
  currentVersion: number,
  playerId: string,
  eventType: string = "move",
  eventPayload: any = {}
): Promise<boolean> {
  const { error } = await supabase
    .from("games")
    .update({
      state: newState,
      version: currentVersion + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", gameId)
    .eq("version", currentVersion); // optimistic lock

  if (error) return false;

  // Log del evento (no bloqueante)
  supabase.from("game_events").insert({
    game_id: gameId,
    event_type: eventType,
    payload: eventPayload,
    player_id: playerId,
  }).then(() => {});

  return true;
}

// Suscribirse a cambios de la partida en tiempo real
export function subscribeToGame(
  gameId: string,
  onUpdate: (game: Game) => void
): () => void {
  const channel = supabase
    .channel(`game:${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`,
      },
      (payload) => {
        onUpdate(payload.new as Game);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Obtener una partida por ID
export async function getGame(gameId: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error) return null;
  return data as Game;
}

// Pausar la partida (para ChatFandango, Karma Emergencies, etc.)
export async function pauseGame(
  gameId: string,
  reason: string,
  data: any = {}
): Promise<void> {
  await supabase
    .from("games")
    .update({ status: "paused", pause_reason: reason, pause_data: data })
    .eq("id", gameId);
}

// Reanudar la partida
export async function resumeGame(gameId: string): Promise<void> {
  await supabase
    .from("games")
    .update({ status: "active", pause_reason: null, pause_data: null })
    .eq("id", gameId);
}
