import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn(
    'Supabase credentials missing — leaderboard is disabled. ' +
    'Copy .env.example to .env.local and fill in your project values.',
  );
}

export const supabase = url && key ? createClient(url, key) : null;
