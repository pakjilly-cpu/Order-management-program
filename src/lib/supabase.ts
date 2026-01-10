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
    detectSessionInUrl: false  // 수동으로 처리
  }
});

// URL 해시에서 토큰 파싱 및 세션 설정
const handleAuthCallback = async () => {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token')) {
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (access_token && refresh_token) {
      console.log('Setting session from URL hash');
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (error) {
        console.error('Error setting session:', error);
      } else {
        // 성공 후 URL 해시 제거
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }
};

// 페이지 로드 시 실행
handleAuthCallback();
