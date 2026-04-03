import { createClient } from '@supabase/supabase-js';

// Singleton — reutilizado por todas as telas públicas (totem, painel)
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sbPublic = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storageKey: 'sysprocesso-public-totem',
  },
});
