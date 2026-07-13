/** 간단한 DOM 생성/조작 헬퍼 (프레임워크 없이 vanilla JS로 UI를 구성하기 위함) */

/**
 * 엘리먼트를 생성한다.
 * @param {string} tag
 * @param {object} [opts] - { className, attrs, text, html, children, on }
 */
export function h(tag, opts = {}, ...children) {
  const el = document.createElement(tag);
  const { className, attrs, text, html, on } = opts;

  if (className) el.className = className;
  if (attrs) {
    Object.entries(attrs).forEach(([k, v]) => {
      if (v === false || v === null || v === undefined) return;
      el.setAttribute(k, v === true ? '' : v);
    });
  }
  if (text !== undefined) el.textContent = text;
  if (html !== undefined) el.innerHTML = html;
  if (on) {
    Object.entries(on).forEach(([evt, handler]) => el.addEventListener(evt, handler));
  }

  const flatChildren = children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false);
  flatChildren.forEach((child) => {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      el.appendChild(child);
    }
  });

  return el;
}

/** HTML 특수문자 이스케이프 (사용자 입력을 innerHTML에 넣을 때 XSS 방지) */
export function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 컴테이너의 자식을 모두 비운다 */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** 이니셜 문자열 생성 (아바타용) */
export function toInitials(name) {
  if (!name) return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  // 한글 등 완성형 문자는 첫 글자 하나만 사용
  return trimmed[0].toUpperCase();
}

/**
 * 버튼의 로딩(진행 중) 상태를 토글하는 헬퍼.
 * 비동기 요청(Supabase 호출) 동안 버튼을 비활성화하고 라벨을 임시로 바꿔
 * 최소한의 진행 피드백을 준다. 원래 라벨은 `data-label`에 보관해 복원한다.
 * @param {HTMLButtonElement} button
 * @param {boolean} loading
 * @param {string} [loadingText]
 */
export function setButtonLoading(button, loading, loadingText = '처리 중...') {
  if (!button) return;
  if (loading) {
    if (button.dataset.label === undefined) button.dataset.label = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    if (button.dataset.label !== undefined) {
      button.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  }
}

/** 짧은 토스트 메시지 표시 */
export function showToast(message, { type = 'default', duration = 2500 } = {}) {
  const container = document.getElementById('toast-root');
  if (!container) return;
  const toast = h('div', { className: `toast toast--${type}`, attrs: { role: 'status' }, text: message });
  container.appendChild(toast);
  const remove = () => toast.remove();
  const timer = setTimeout(remove, duration);
  toast.addEventListener('mouseenter', () => clearTimeout(timer));
  toast.addEventListener('mouseleave', () => setTimeout(remove, duration));
}
