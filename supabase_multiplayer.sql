-- Tabla de partidas multijugador
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,          -- código corto: "KARMA-7X3"
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  state JSONB NOT NULL DEFAULT '{}',  -- GameState completo
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting | active | paused | finished
  pause_reason TEXT,                  -- null | 'chat_fandango' | 'karma_emergency' | 'blue_buddha'
  pause_data JSONB,                   -- datos del evento de pausa
  winner TEXT,                        -- null | 'P1' | 'P2'
  version INTEGER DEFAULT 0,          -- para detectar conflictos de escritura
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de eventos (log de movimientos)
CREATE TABLE game_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'roll' | 'move' | 'pause' | 'resume'
  payload JSONB,
  player_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime en games
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- RLS: cualquier usuario autenticado puede leer/escribir sus propias partidas
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their games"
  ON games FOR SELECT
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

CREATE POLICY "Player1 can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their games"
  ON games FOR UPDATE
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- RLS para game_events
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view events of their games"
  ON game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_events.game_id
        AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

CREATE POLICY "Players can insert events in their games"
  ON game_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = game_events.game_id
        AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );
