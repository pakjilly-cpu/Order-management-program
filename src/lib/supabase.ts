import { createClient } from '@supabase/supabase-js';

// 환경 변수 또는 직접 값 사용 (임시)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vhpgfmnnhdcpfgtdrzfz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZocGdmbW5uaGRjcGZndGRyemZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTcyMjcsImV4cCI6MjA4MzYzMzIyN30.03xkx7WT8VOkEaItB8MTQ-Z-ar1UN2NhK0bkNGII41A';

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase connected');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
});
