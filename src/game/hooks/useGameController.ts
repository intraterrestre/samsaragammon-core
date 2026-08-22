// src/game/hooks/useGameController.ts
//
// 2026-08-22: este hook era una copia paralela COMPLETA de lo que
// App.tsx ya hace por su cuenta — su propio useReducer(reducer,
// initialState) (estado de partida nunca leído por nadie), su propia
// instancia de KarmaEngine (creada y jamás alimentada), su propio
// cálculo de oracleText/mirrorData (Karma), y — la parte que sí corría
// de verdad en cada render de <App> — su propia suscripción a
// supabase.auth.onAuthStateChange() con su propio profiles.upsert(),
// duplicando byte a byte la que ya vive en App.tsx (líneas ~350-390).
// App.tsx solo llamaba a este hook para sacar `handleLogin` — nada más
// del objeto que devolvía se leía nunca (confirmado: ni `state`, ni
// `session`, ni `profile`, ni `oracleText`, ni ningún otro campo).
// Se borra todo lo muerto y lo duplicado; solo queda handleLogin, que
// es lo único que <App> de verdad usa (LoginScreen onLogin={handleLogin}).
import { supabase } from "../../lib/supabaseClient";

export function useGameController() {
  const handleLogin = async () => {
    const email = prompt("Email:");
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) alert(error.message);
    else alert("Check your email for the login link.");
  };

  return { handleLogin };
}
