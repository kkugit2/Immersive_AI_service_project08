/**
 * 입력값 검증 유틸리티
 * PRD 3장(핵심 기능), 4장(사용자 플로우) 기준의 유효성 규칙을 모아둔다.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROOM_CODE_REGEX = /^\d{6}$/;

/** 이메일 형식 검증 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return { valid: false, message: '이메일을 입력해주세요.' };
  if (!EMAIL_REGEX.test(email.trim())) {
    return { valid: false, message: '올바른 이메일 형식이 아닙니다.' };
  }
  return { valid: true };
}

/** 비밀번호 검증: 최소 8자 이상 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '비밀번호를 입력해주세요.' };
  }
  if (password.length < 8) {
    return { valid: false, message: '비밀번호는 8자 이상이어야 합니다.' };
  }
  return { valid: true };
}

/** 표시 이름(닉네임) 검증 */
export function validateDisplayName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: '이름을 입력해주세요.' };
  }
  if (name.trim().length > 20) {
    return { valid: false, message: '이름은 20자 이하로 입력해주세요.' };
  }
  return { valid: true };
}

/** 회의방 이름 검증 */
export function validateRoomName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: '회의방 이름을 입력해주세요.' };
  }
  if (name.trim().length > 40) {
    return { valid: false, message: '회의방 이름은 40자 이하로 입력해주세요.' };
  }
  return { valid: true };
}

/** 6자리 회의방 코드 형식 검증 */
export function validateRoomCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: '6자리 코드를 입력해주세요.' };
  }
  if (!ROOM_CODE_REGEX.test(code.trim())) {
    return { valid: false, message: '코드는 숫자 6자리여야 합니다.' };
  }
  return { valid: true };
}

/** 채팅방 이름 검증 */
export function validateChatRoomName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: '채팅방 이름을 입력해주세요.' };
  }
  if (name.trim().length > 30) {
    return { valid: false, message: '채팅방 이름은 30자 이하로 입력해주세요.' };
  }
  return { valid: true };
}

/** 메시지 내용 검증 (공백만 있는 메시지 방지) */
export function validateMessageContent(content) {
  if (!content || !content.trim()) {
    return { valid: false, message: '메시지를 입력해주세요.' };
  }
  return { valid: true };
}

export const ROOM_CAPACITY = 10;
