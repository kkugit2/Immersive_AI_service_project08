import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateRoomName,
  validateRoomCode,
  validateChatRoomName,
  validateMessageContent
} from '../src/utils/validators.js';

describe('validateEmail', () => {
  it('올바른 이메일 형식을 통과시킨다', () => {
    expect(validateEmail('user@example.com').valid).toBe(true);
  });
  it('형식이 틀린 이메일을 거부한다', () => {
    expect(validateEmail('not-an-email').valid).toBe(false);
  });
  it('빈 값을 거부한다', () => {
    expect(validateEmail('').valid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('8자 이상 비밀번호를 통과시킨다', () => {
    expect(validatePassword('password123').valid).toBe(true);
  });
  it('8자 미만 비밀번호를 거부한다', () => {
    expect(validatePassword('short').valid).toBe(false);
  });
});

describe('validateDisplayName', () => {
  it('정상 이름을 통과시킨다', () => {
    expect(validateDisplayName('지민').valid).toBe(true);
  });
  it('빈 이름을 거부한다', () => {
    expect(validateDisplayName('   ').valid).toBe(false);
  });
  it('20자 초과 이름을 거부한다', () => {
    expect(validateDisplayName('a'.repeat(21)).valid).toBe(false);
  });
});

describe('validateRoomName', () => {
  it('정상 회의방 이름을 통과시킨다', () => {
    expect(validateRoomName('스프린트 회의').valid).toBe(true);
  });
  it('빈 이름을 거부한다', () => {
    expect(validateRoomName('').valid).toBe(false);
  });
});

describe('validateRoomCode', () => {
  it('숫자 6자리를 통과시킨다', () => {
    expect(validateRoomCode('123456').valid).toBe(true);
  });
  it('6자리가 아니면 거부한다', () => {
    expect(validateRoomCode('12345').valid).toBe(false);
  });
  it('숫자가 아니면 거부한다', () => {
    expect(validateRoomCode('12345a').valid).toBe(false);
  });
});

describe('validateChatRoomName / validateMessageContent', () => {
  it('정상 채팅방 이름을 통과시킨다', () => {
    expect(validateChatRoomName('일반 대화').valid).toBe(true);
  });
  it('빈 메시지를 거부한다', () => {
    expect(validateMessageContent('   ').valid).toBe(false);
  });
  it('정상 메시지를 통과시킨다', () => {
    expect(validateMessageContent('안녕하세요').valid).toBe(true);
  });
});
