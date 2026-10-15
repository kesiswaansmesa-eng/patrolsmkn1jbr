import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Default Supabase project credentials for Patrolsmkn1jbr
export const DEFAULT_SUPABASE_URL = 'https://qlalmzipltsdndecsjdc.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsYWxtemlwbHRzZG5kZWNzamRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzMxMzksImV4cCI6MjEwNzY0OTEzOX0.A6GT174Kh65SiTivefnDqHUj20CqJSWBWJTtmMyKbTs';

// Normalisasi URL Supabase (buang /rest/v1/ atau slash di akhir jika ada)
export const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
};

// Baca konfigurasi dari localStorage, environment variables, atau default kredensial
export const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const savedUrl = typeof window !== 'undefined' ? localStorage.getItem('patrol_smesa_supabase_url') : null;
  const savedKey = typeof window !== 'undefined' ? localStorage.getItem('patrol_smesa_supabase_anon_key') : null;

  const rawUrl = savedUrl || envUrl || DEFAULT_SUPABASE_URL;
  const key = savedKey || envKey || DEFAULT_SUPABASE_ANON_KEY;
  const url = normalizeSupabaseUrl(rawUrl);

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
    const cleanUrl = normalizeSupabaseUrl(url);
    localStorage.setItem('patrol_smesa_supabase_url', cleanUrl);
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
