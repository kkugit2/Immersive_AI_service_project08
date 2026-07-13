/**
 * Vitest 전역 셀업. 모든 테스트 파일이 실제 Supabase 네트워크 대신
 * `tests/mocks/fakeSupabase.js`의 in-memory 더블을 사용하도록 `supabaseClient.js`를 모킹한다.
 * 동적 import를 사용해 vi.mock 호이스팅 순서와 무관하게 안전하게 동작하도록 한다.
 */
import { vi } from 'vitest';

vi.mock('../src/services/supabaseClient.js', async () => {
  const mod = await import('./mocks/fakeSupabase.js');
  return { supabase: mod.supabase };
});
