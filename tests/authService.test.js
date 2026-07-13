import { describe, it, expect, beforeEach } from 'vitest';
import { resetFakeSupabase } from './mocks/fakeSupabase.js';
import { signUp, signIn, signOut, getSession, initAuth } from '../src/services/authService.js';

describe('authService', () => {
  beforeEach(async () => {
    resetFakeSupabase();
    localStorage.clear();
    await initAuth();
  });

  it('이메일/비밀번호로 회원가입하면 세션이 생성된다', async () => {
    const { user } = await signUp({ email: 'jimin@example.com', password: 'password123', displayName: '지민' });
    expect(user.email).toBe('jimin@example.com');
    expect(getSession().id).toBe(user.id);
  });

  it('중복 이메일로는 가입할 수 없다', async () => {
    await signUp({ email: 'jimin@example.com', password: 'password123', displayName: '지민' });
    await expect(
      signUp({ email: 'jimin@example.com', password: 'password123', displayName: '지민2' })
    ).rejects.toThrow('이미 가입된 이메일입니다.');
  });

  it('비밀번호가 8자 미만이면 가입에 실패한다', async () => {
    await expect(signUp({ email: 'a@example.com', password: 'short', displayName: 'A' })).rejects.toThrow();
  });

  it('가입한 이메일/비밀번호로 로그인할 수 있다', async () => {
    await signOut();
    await signUp({ email: 'seoyeon@example.com', password: 'password123', displayName: '서연' });
    await signOut();
    const { user } = await signIn({ email: 'seoyeon@example.com', password: 'password123' });
    expect(user.display_name).toBe('서연');
  });

  it('잘못된 비밀번호로는 로그인할 수 없다', async () => {
    await signUp({ email: 'seoyeon@example.com', password: 'password123', displayName: '서연' });
    await signOut();
    await expect(signIn({ email: 'seoyeon@example.com', password: 'wrongpass' })).rejects.toThrow(
      '이메일 또는 비밀번호가 올바르지 않습니다.'
    );
  });

  it('로그아웃하면 세션이 사라진다', async () => {
    await signUp({ email: 'jimin@example.com', password: 'password123', displayName: '지민' });
    await signOut();
    expect(getSession()).toBeNull();
  });
});
