/**
 * Supabase 클라이언트 싱글턴.
 *
 * Vite 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)로 초기화한다.
 * `.env.example`을 참고해 `.env`(또는 `.env.local`)에 실제 프로젝트 값을 채워 넣어야 한다.
 * 이 모듈이 프론트엔드 서비스 레이어(`authService.js`, `roomService.js`, `chatService.js`,
 * `dashboardService.js`, `realtimeBus.js`)가 실제 Supabase 백엔드와 통신하는 유일한 진입점이다.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env를 채워주세요.'
  );
}

export const supabase = createClient(supabaseUrl || 'http://localhost', supabaseAnonKey || 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});
