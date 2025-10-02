import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please create a .env file in the root directory with:');
  console.error('VITE_SUPABASE_URL=your_supabase_project_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('See .env.example for reference.');
  throw new Error('Missing Supabase environment variables. Please create a .env file with your Supabase credentials. See .env.example for reference.');
}

// Regular client for all operations (uses anon key)
// Admin operations are now handled by Edge Functions, which use the service role key server-side
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
