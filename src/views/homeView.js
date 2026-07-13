import { h, showToast, setButtonLoading } from '../utils/dom.js';
import { getSession, signOut } from '../services/authService.js';
import { createRoom, joinRoomByCode } from '../services/roomService.js';
import { navigate } from '../router.js';

/** 홈 화면: 새 회의방 만들기 / 6자리 코드로 참가하기 (PRD 4.2) */
export function renderHomeView(root) {
  const user = getSession();
  let mode = 'menu'; // 'menu' | 'create' | 'join'

  function draw() {
    root.innerHTML = '';
    root.appendChild(buildCard());
  }

  function buildMenu() {
    return h(
      'div',
      { className: 'home-actions' },
      h('button', { className: 'btn btn--primary', on: { click: () => { mode = 'create'; draw(); } } }, '새 회의방 만들기'),
      h('div', { className: 'home-divider' }, '또는'),
      h('button', { className: 'btn btn--secondary', on: { click: () => { mode = 'join'; draw(); } } }, '회의방 참가하기')
    );
  }

  function buildCreateForm() {
    const errorBox = h('div', { className: 'form-error-banner', attrs: { role: 'alert', hidden: true } });
    const nameInput = h('input', { className: 'input', attrs: { type: 'text', placeholder: '예) 주간 스프린트 회의' } });

    const submitBtn = h('button', { className: 'btn btn--primary', attrs: { type: 'submit' } }, '만들기');

    const form = h(
      'form',
      {
        on: {
          submit: async (e) => {
            e.preventDefault();
            errorBox.setAttribute('hidden', '');
            setButtonLoading(submitBtn, true, '생성 중...');
            try {
              const room = await createRoom({ name: nameInput.value, hostUserId: user.id });
              navigate(`room/${room.id}`);
            } catch (err) {
              errorBox.textContent = err.message;
              errorBox.removeAttribute('hidden');
              setButtonLoading(submitBtn, false);
            }
          }
        }
      },
      h(
        'div',
        { className: 'field' },
        h('label', { className: 'field__label' }, '회의방 이름'),
        nameInput
      ),
      errorBox,
      h(
        'div',
        { className: 'modal-card__actions' },
        h('button', { className: 'btn btn--ghost', attrs: { type: 'button' }, on: { click: () => { mode = 'menu'; draw(); } } }, '뒤로'),
        submitBtn
      )
    );
    return form;
  }

  function buildJoinForm() {
    const errorBox = h('div', { className: 'form-error-banner', attrs: { role: 'alert', hidden: true } });
    const boxes = [];
    const otpWrap = h('div', { className: 'otp-input', attrs: { role: 'group', 'aria-label': '6자리 회의방 코드' } });
    for (let i = 0; i < 6; i += 1) {
      const box = h('input', {
        attrs: { type: 'text', inputmode: 'numeric', maxlength: '1', 'aria-label': `코드 ${i + 1}번째 자리` },
        on: {
          input: (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 1);
            if (e.target.value && boxes[i + 1]) boxes[i + 1].focus();
          },
          keydown: (e) => {
            if (e.key === 'Backspace' && !e.target.value && boxes[i - 1]) boxes[i - 1].focus();
          }
        }
      });
      boxes.push(box);
      otpWrap.appendChild(box);
    }

    function getCode() {
      return boxes.map((b) => b.value).join('');
    }

    const submitBtn = h('button', { className: 'btn btn--primary', attrs: { type: 'submit' } }, '참가하기');

    const form = h(
      'form',
      {
        on: {
          submit: async (e) => {
            e.preventDefault();
            errorBox.setAttribute('hidden', '');
            setButtonLoading(submitBtn, true, '참가 중...');
            try {
              const room = await joinRoomByCode({ roomCode: getCode(), userId: user.id });
              navigate(`room/${room.id}`);
            } catch (err) {
              errorBox.textContent = err.message;
              errorBox.removeAttribute('hidden');
              setButtonLoading(submitBtn, false);
            }
          }
        }
      },
      h(
        'div',
        { className: 'field' },
        h('label', { className: 'field__label' }, '6자리 코드'),
        otpWrap
      ),
      errorBox,
      h(
        'div',
        { className: 'modal-card__actions' },
        h('button', { className: 'btn btn--ghost', attrs: { type: 'button' }, on: { click: () => { mode = 'menu'; draw(); } } }, '뒤로'),
        submitBtn
      )
    );
    setTimeout(() => boxes[0] && boxes[0].focus(), 0);
    return form;
  }

  function buildCard() {
    let body;
    if (mode === 'create') body = buildCreateForm();
    else if (mode === 'join') body = buildJoinForm();
    else body = buildMenu();

    return h(
      'div',
      { className: 'centered-screen' },
      h(
        'div',
        { className: 'home-card' },
        h(
          'div',
          { className: 'home-header' },
          h('span', { className: 'text-h2' }, `안녕하세요, ${user.display_name}님`),
          h('button', {
            className: 'btn btn--ghost btn--compact',
            on: {
              click: async () => {
                await signOut();
                showToast('로그아웃되었습니다.');
                navigate('auth');
              }
            }
          }, '로그아웃')
        ),
        body
      )
    );
  }

  draw();
  return () => {};
}
