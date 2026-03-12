import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Esto evita “pantalla blanca” misteriosa si falta .env.local
  console.warn("Missing Supabase env vars. Check .env.local");
}

export const supabase = createClient(url ?? "", anon ?? "");