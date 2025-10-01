import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please create a .env file in the root directory with:');
  console.error('VITE_SUPABASE_URL=your_supabase_project_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key');
  console.error('See .env.example for reference.');
  throw new Error('Missing Supabase environment variables. Please create a .env file with your Supabase credentials. See .env.example for reference.');
}

// Regular client for user-facing operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for admin operations (uses service role key)
// Only use this for server-side or admin-privileged operations
if (!supabaseServiceKey) {
  console.warn('⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY not found! Admin operations (like creating users) will fail.');
  console.warn('Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file for full functionality.');
}

export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase; // Fallback to regular client if service key not provided

export const hasServiceRoleKey = !!supabaseServiceKey;

