/**
 * 인증 서비스 (Supabase Auth 연동).
 *
 * PRD 4.1 회원가입/로그인 플로우를 Supabase Auth(이메일/비밀번호) 기반으로 구현한다.
 * 회원가입 시 `display_name`은 auth 메타데이터로 저장되고, DB 트리거(`handle_new_user`)가
 * `public.profiles`에 프로필 행을 자동 생성한다.
 *
 * 주의(설계 트레이드오프): 실제 네트워크 호출이 필요한 signUp/signIn/signOut은 async 함수다.
 * 다만 `router.js`는 해시 변경마다 동기적으로 `getSession()`을 호출해 인증 가드를 수행해야
 * 하므로, 세션 정보를 모듈 스코프 캐시에 유지하고 `initAuth()`(앱 부트스트랩 시 1회 await)와
 * `onAuthStateChange` 구독으로 캐시를 최신 상태로 유지한다. 이를 통해 `getSession()` 자체는
 * 기존과 동일하게 동기 함수로 유지되어 `router.js`를 수정할 필요가 없다.
 */

import { supabase } from './supabaseClient.js';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validators.js';

let cachedUser = null;
let authListenerStarted = false;

function toPublicUser(profileRow) {
  if (!profileRow) return null;
  return {
    id: profileRow.id,
    email: profileRow.email,
    display_name: profileRow.display_name,
    created_at: profileRow.created_at
  };
}

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) return null;
  return data;
}

function mapAuthError(error, fallback) {
  const msg = error?.message || '';
  if (/already registered|already exists/i.test(msg)) return '이미 가입된 이메일입니다.';
  if (/invalid login credentials/i.test(msg)) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (/password/i.test(msg) && /least/i.test(msg)) return '비밀번호는 8자 이상이어야 합니다.';
  return fallback;
}

/**
 * 앱 부트스트랩 시 1회 호출한다(main.js). 현재 세션을 조회해 캐시를 채우고,
 * 이후 인증 상태 변화(로그인/로그아웃/토큰 갱신)을 계속 반영하도록 리스너를 등록한다.
 */
export async function initAuth() {
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    const profile = await fetchProfile(data.session.user.id);
    cachedUser = toPublicUser(profile);
  } else {
    cachedUser = null;
  }

  if (!authListenerStarted) {
    authListenerStarted = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id).then((profile) => {
          cachedUser = toPublicUser(profile);
        });
      } else {
        cachedUser = null;
      }
    });
  }
}

/** 회원가입: 이메일/비밀번호 검증 후 Supabase Auth에 가입, 프로필은 DB 트리거가 생성 */
export async function signUp({ email, password, displayName }) {
  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) throw new Error(emailCheck.message);

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) throw new Error(passwordCheck.message);

  const nameCheck = validateDisplayName(displayName);
  if (!nameCheck.valid) throw new Error(nameCheck.message);

  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = displayName.trim();

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: { data: { display_name: trimmedName } }
  });

  if (error) throw new Error(mapAuthError(error, '회원가입에 실패했습니다.'));

  if (!data.session) {
    // 이메일 인증(컴펌)이 활성화된 프로젝트 설정인 경우 세션이 즉시 발급되지 않는다.
    throw new Error('가입 신청이 완료되었습니다. 인증 이메일을 확인한 뒤 로그인해주세요.');
  }

  const user = {
    id: data.user.id,
    email: data.user.email,
    display_name: trimmedName,
    created_at: data.user.created_at
  };
  cachedUser = user;
  return { user };
}

/** 로그인: 이메일/비밀번호 대조 (Supabase Auth) */
export async function signIn({ email, password }) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: password || '' });
  if (error) throw new Error(mapAuthError(error, '이메일 또는 비밀번호가 올바르지 않습니다.'));

  const profile = await fetchProfile(data.user.id);
  const user = toPublicUser(profile) || {
    id: data.user.id,
    email: data.user.email,
    display_name: data.user.user_metadata?.display_name || normalizedEmail,
    created_at: data.user.created_at
  };
  cachedUser = user;
  return { user };
}

/** 로그아웃 */
export async function signOut() {
  await supabase.auth.signOut();
  cachedUser = null;
}

/** 현재 로그인된 사용자 조회 (세션 없으면 null). initAuth() 완료 이후 최신 상태를 반환한다. */
export function getSession() {
  return cachedUser;
}

/** 사용자 프로필 단건 조회 (DB 질의, 비동기) */
export async function getUserById(userId) {
  const profile = await fetchProfile(userId);
  return toPublicUser(profile);
}
