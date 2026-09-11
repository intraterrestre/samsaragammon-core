-- Fix: "Partida no encontrada" al unirse con código correcto.
--
-- Causa: la policy RLS "Players can view their games" solo permite
-- SELECT a quien ya es player1_id o player2_id. El flujo de "unirse
-- por código" necesita leer una partida ANTES de ser player2, lo cual
-- la policy bloquea por diseño (devuelve 0 filas, no un error visible).
--
-- Solución: una función RPC con SECURITY DEFINER que corre con
-- privilegios elevados (bypassa RLS), valida el código y hace el
-- claim de forma atómica. Las policies normales siguen intactas para
-- todo lo demás (updateGameState, subscribeToGame, etc.) — nadie gana
-- acceso extra de lectura/escritura fuera de esta función puntual.
--
-- Pegar y ejecutar esto en el SQL Editor de Supabase (una sola vez).

create or replace function join_game_by_code(p_code text)
returns games
language plpgsql
security definer
set search_path = public
as $$
declare
  g games;
begin
  select * into g from games where code = upper(p_code);

  if not found then
    raise exception 'Partida no encontrada';
  end if;

  if g.player2_id is not null and g.player2_id <> auth.uid() then
    raise exception 'La partida ya está completa';
  end if;

  if g.player2_id is null then
    update games
      set player2_id = auth.uid(), status = 'active'
      where id = g.id
      returning * into g;
  end if;

  return g;
end;
$$;

-- Solo usuarios autenticados pueden invocarla (no anon).
grant execute on function join_game_by_code(text) to authenticated;
