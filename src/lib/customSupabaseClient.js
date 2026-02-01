import { createClient } from "@supabase/supabase-js";

// Best practice: env vars on Vercel (Settings → Environment Variables)
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "PASTE_YOUR_SUPABASE_URL_HERE";

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

// Create a single shared client for the app
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
