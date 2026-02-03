
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../types';

let supabaseInstance: SupabaseClient | null = null;

// Helper to get config from local storage to initialize immediately if possible
const getStoredConfig = (): Partial<AppConfig> => {
  try {
    const stored = localStorage.getItem('bg_app_config');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const initSupabase = (url: string, key: string): SupabaseClient => {
  if (!url || !key) {
    throw new Error("Supabase URL and Key are required.");
  }
  supabaseInstance = createClient(url, key);
  return supabaseInstance;
};

export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  // Try to hydrate from storage on first call
  const config = getStoredConfig();
  if (config.supabaseUrl && config.supabaseKey) {
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey);
    return supabaseInstance;
  }

  // Fallback to env vars if available (for dev/preview)
  const envUrl = process.env.SUPABASE_URL;
  const envKey = process.env.SUPABASE_KEY;

  if (envUrl && envKey) {
    supabaseInstance = createClient(envUrl, envKey);
    return supabaseInstance;
  }

  throw new Error("Database not configured. Please open settings and configure Supabase.");
};
