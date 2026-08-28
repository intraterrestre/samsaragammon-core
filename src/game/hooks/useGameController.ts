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
//
// v76 (28 agosto 2026) — bug reportado por Federico: metía el código
// de 6 dígitos bien y "no termina de abrir el juego". Causa:
// handleLogin todavía era el login VIEJO de antes de que
// LoginScreen.tsx tuviera su propio flujo completo (email → código →
// verifyOtp) — hacía prompt("Email:") + su propio signInWithOtp +
// alert(...), un segundo login por completo, desconectado del que
// Federico recién terminó. App.tsx ya tiene su propio
// onAuthStateChange (líneas ~393) que actualiza `session` solo apenas
// verifyOtp tiene éxito — no necesita ayuda de onLogin para eso. El
// daño real: prompt()/alert() son BLOQUEANTES, congelan la página
// entera hasta que alguien los cierra. Aunque `session` ya se hubiera
// actualizado por debajo, la pantalla no se repinta hasta cerrar ese
// diálogo — que además no tiene nada que ver con el login que
// Federico acababa de completar, así que es fácil no verlo o no
// entender qué pide. Ahora es un no-op: LoginScreen ya hizo todo el
// trabajo antes de llamar onLogin().
export function useGameController() {
  const handleLogin = () => {
    // Deliberadamente vacío — ver nota arriba.
  };

  return { handleLogin };
}
