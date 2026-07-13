import { h, setButtonLoading } from '../utils/dom.js';
import { signIn, signUp } from '../services/authService.js';
import { navigate } from '../router.js';

/**
 * 로그인/회원가입 화면 (PRD 4.1).
 * @returns {() => void} cleanup 함수
 */
export function renderAuthView(root) {
  let mode = 'signin'; // 'signin' | 'signup'

  function draw() {
    root.innerHTML = '';
    root.appendChild(buildCard());
  }

  function buildCard() {
    const errorBox = h('div', { className: 'form-error-banner', attrs: { role: 'alert', hidden: true } });

    const emailInput = h('input', {
      className: 'input',
      attrs: { type: 'email', id: 'auth-email', autocomplete: 'email', placeholder: 'you@example.com' }
    });
    const passwordInput = h('input', {
      className: 'input',
      attrs: { type: 'password', id: 'auth-password', autocomplete: 'current-password', placeholder: '8자 이상' }
    });
    const nameInput = h('input', {
      className: 'input',
      attrs: { type: 'text', id: 'auth-name', autocomplete: 'name', placeholder: '팀 안에서 사용할 이름' }
    });

    const nameField = h(
      'div',
      { className: 'field', attrs: { hidden: mode !== 'signup' } },
      h('label', { className: 'field__label', attrs: { for: 'auth-name' } }, '이름'),
      nameInput
    );

    const submitBtn = h('button', { className: 'btn btn--primary', attrs: { type: 'submit' } }, mode === 'signin' ? '로그인' : '회원가입');

    const form = h(
      'form',
      {
        on: {
          submit: async (e) => {
            e.preventDefault();
            errorBox.setAttribute('hidden', '');
            setButtonLoading(submitBtn, true, mode === 'signin' ? '로그인 중...' : '가입 중...');
            try {
              if (mode === 'signin') {
                await signIn({ email: emailInput.value, password: passwordInput.value });
              } else {
                await signUp({ email: emailInput.value, password: passwordInput.value, displayName: nameInput.value });
              }
              navigate('home');
            } catch (err) {
              errorBox.textContent = err.message;
              errorBox.removeAttribute('hidden');
              setButtonLoading(submitBtn, false);
            }
          }
        }
      },
      nameField,
      h(
        'div',
        { className: 'field' },
        h('label', { className: 'field__label', attrs: { for: 'auth-email' } }, '이메일'),
        emailInput
      ),
      h(
        'div',
        { className: 'field' },
        h('label', { className: 'field__label', attrs: { for: 'auth-password' } }, '비밀번호'),
        passwordInput
      ),
      errorBox,
      submitBtn
    );

    const tabSignin = h(
      'button',
      {
        className: `auth-tab ${mode === 'signin' ? 'auth-tab--active' : ''}`,
        attrs: { type: 'button' },
        on: { click: () => { mode = 'signin'; draw(); } }
      },
      '로그인'
    );
    const tabSignup = h(
      'button',
      {
        className: `auth-tab ${mode === 'signup' ? 'auth-tab--active' : ''}`,
        attrs: { type: 'button' },
        on: { click: () => { mode = 'signup'; draw(); } }
      },
      '회원가입'
    );

    return h(
      'div',
      { className: 'centered-screen' },
      h(
        'div',
        { className: 'auth-card', attrs: { role: 'main', 'aria-label': mode === 'signin' ? '로그인' : '회원가입' } },
        h(
          'div',
          { className: 'auth-card__brand' },
          h('span', { className: 'auth-card__brand-mark' }, 'T'),
          h('span', { className: 'text-h2' }, 'TeamRoom')
        ),
        h('div', { className: 'auth-tabs' }, tabSignin, tabSignup),
        form
      )
    );
  }

  draw();
  return () => {};
}
