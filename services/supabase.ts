import { createClient } from '@supabase/supabase-js';

// Use environment variables if available, otherwise use the provided credentials
// This ensures the app works immediately in the preview environment.
const supabaseUrl = process.env.SUPABASE_URL || 'https://supabase.trusync.cloud';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2MTE1NjAwMCwiZXhwIjo0OTE2ODI5NjAwLCJyb2xlIjoiYW5vbiJ9.-QMXM4M6Jpr2IYdpqd2QcUioKRz4b3N90c1Rxk_RUIM';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Database features will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
