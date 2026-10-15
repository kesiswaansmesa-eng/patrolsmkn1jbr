import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Baca konfigurasi dari environment variables atau runtime localStorage
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('patrol_smesa_supabase_url') : null;
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('patrol_smesa_supabase_anon_key') : null;

  const url = savedUrl || envUrl;
  const key = savedKey || envKey;

  const isConfigured = Boolean(
    url && 
    key && 
    !url.includes('your-project') && 
    url.startsWith('https://') &&
    key.length > 20
  );

  return { url: url || '', key: key || '', isConfigured };
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.warn('Gagal menginisialisasi Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
};

export const setCustomSupabaseConfig = (url: string, key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('patrol_smesa_supabase_url', url.trim());
    localStorage.setItem('patrol_smesa_supabase_anon_key', key.trim());
    supabaseInstance = null; // reset client
  }
};

export const clearCustomSupabaseConfig = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('patrol_smesa_supabase_url');
    localStorage.removeItem('patrol_smesa_supabase_anon_key');
    supabaseInstance = null;
  }
};
