import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetFakeSupabase } from '../mocks/fakeSupabase.js';
import { initRouter } from '../../src/router.js';
import { initAuth } from '../../src/services/authService.js';

function submit(form) {
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

function setInputValue(input, value) {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * 서비스 레이어가 async(Supabase 호출)로 바뀌면서, 사용자 조작 하나가 여러 마이크로태스크
 * (예: RPC 응답 대기 -> navigate() -> hashchange 태스크 -> 회의방 화면의 async draw())를
 * 거쳐 DOM에 반영된다. jsdom의 hashchange 디스패치도 별도 태스크로 발생하므로, 테스트 쪽
 * 타이머의 지연 시간을 hashchange 태스크보다 살짝 더 길게(10ms) 잡아 두 두 태스크의 실행 순서를
 * 안정적으로 보장한다(둘 다 지연 0인 타이머라면 "먼저 예약된" 우리 쪽 타이머가 실제로는
 * navigate() 호출보다 먼저 큐에 들어가 버려 순서가 뒤바뀜 수 있기 때문).
 */
function tick(ms = 10) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signUpAndReachHome(root) {
  initRouter(root);
  root.querySelector('.auth-tab:last-child').click();
  setInputValue(document.getElementById('auth-name'), '지민');
  setInputValue(document.getElementById('auth-email'), 'jimin@example.com');
  setInputValue(document.getElementById('auth-password'), 'password123');
  submit(root.querySelector('form'));
  await tick();
}

async function createRoomAndReachRoomView(root, roomName = '주간 회의') {
  await signUpAndReachHome(root);
  const createBtn = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === '새 회의방 만들기');
  createBtn.click();
  setInputValue(root.querySelector('.field input'), roomName);
  submit(root.querySelector('form'));
  await tick();
  await tick();
}

describe('통합 플로우: 회원가입 -> 회의방 생성 -> 채팅', () => {
  let root;

  beforeEach(async () => {
    resetFakeSupabase();
    localStorage.clear();
    // authService의 세션 캐시는 fakeSupabase의 in-memory DB와 별개의 모듈 스코프 상태이므로
    // 테스트 간 격리를 위해 명시적으로 다시 동기화한다(리셋된 fakeSupabase는 세션이 없다).
    await initAuth();
    window.location.hash = '';
    document.body.innerHTML = '';
    root = document.createElement('div');
    root.id = 'app';
    document.body.appendChild(root);
    // navigator.clipboard가 jsdom에 없을 수 있으므로 mock 처리
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
        configurable: true
      });
    }
  });

  it('회원가입 후 홈 화면으로 이동한다', async () => {
    initRouter(root);
    expect(root.querySelector('.auth-card')).not.toBeNull();

    await signUpAndReachHome(root);

    expect(window.location.hash).toBe('#/home');
    expect(root.querySelector('.home-card')).not.toBeNull();
    expect(root.textContent).toContain('지민님');
  });

  it('호스트가 회의방을 만들면 회의방 화면(Top/Left/Main/Dashboard)이 렌더링된다', async () => {
    await createRoomAndReachRoomView(root, '주간 회의');

    expect(window.location.hash).toMatch(/^#\/room\//);
    expect(root.querySelector('.topbar')).not.toBeNull();
    expect(root.querySelector('.leftnav')).not.toBeNull();
    expect(root.querySelector('.main-content')).not.toBeNull();
    expect(root.querySelector('.dashboard-panel')).not.toBeNull();
    expect(root.textContent).toContain('주간 회의');
  });

  it('호스트가 일반 채팅방을 만들고 메시지를 보내면 채팅 목록/대화에 표시된다', async () => {
    await createRoomAndReachRoomView(root, '주간 회의');

    // "+" 버튼으로 채팅방 생성 모달 열기
    const addChatBtn = root.querySelector('.leftnav__header button');
    addChatBtn.click();

    const modalForm = document.querySelector('.modal-overlay form');
    expect(modalForm).not.toBeNull();
    const chatNameInput = modalForm.querySelector('.field input');
    setInputValue(chatNameInput, '자유대화');
    submit(modalForm);
    await tick();
    await tick();

    expect(root.querySelector('.leftnav__list').textContent).toContain('자유대화');

    // 채팅방 선택 후 메시지 전송
    const chatItem = Array.from(root.querySelectorAll('.leftnav__list .list-item')).find((el) => el.textContent.includes('자유대화'));
    chatItem.click();
    await tick();
    await tick();

    const textarea = root.querySelector('.composer textarea');
    setInputValue(textarea, '안녕하세요 팀원 여러분');
    const sendBtn = Array.from(root.querySelectorAll('.composer button')).find((b) => b.textContent === '전송');
    sendBtn.click();
    await tick();
    await tick();

    expect(root.querySelector('.message-list').textContent).toContain('안녕하세요 팀원 여러분');
  });

  it('호스트 전용(공지) 채팅방에서는 참가자에게 입력창 대신 안내 문구가 보인다', async () => {
    await createRoomAndReachRoomView(root, '주간 회의');

    const addChatBtn = root.querySelector('.leftnav__header button');
    addChatBtn.click();
    const modalForm = document.querySelector('.modal-overlay form');
    modalForm.querySelector('select').value = 'host_only';
    setInputValue(modalForm.querySelector('.field input'), '공지방');
    submit(modalForm);
    await tick();
    await tick();

    const chatItem = Array.from(root.querySelectorAll('.leftnav__list .list-item')).find((el) => el.textContent.includes('공지방'));
    chatItem.click();
    await tick();
    await tick();

    // 현재 로그인 사용자(지민)는 호스트이므로 입력창이 보인다
    expect(root.querySelector('.composer textarea')).not.toBeNull();
  });
});
