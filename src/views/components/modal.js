import { h } from '../../utils/dom.js';

/**
 * 모달을 열고 닫는 헬퍼. ESC로 닫기, 포커스 이동을 지원한다 (7장 접근성).
 * @param {HTMLElement} bodyContent
 * @param {{ wide?: boolean, onClose?: () => void }} [opts]
 * @returns {{ close: () => void }}
 */
export function openModal(bodyContent, opts = {}) {
  const overlay = h(
    'div',
    { className: 'modal-overlay', attrs: { role: 'presentation' } },
    h('div', { className: `modal-card ${opts.wide ? 'modal-card--wide' : ''}`, attrs: { role: 'dialog', 'aria-modal': 'true' } }, bodyContent)
  );

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKeydown);
    if (opts.onClose) opts.onClose();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', onKeydown);

  document.body.appendChild(overlay);
  const focusable = overlay.querySelector('input, button, textarea, select');
  if (focusable) focusable.focus();

  return { close };
}

/** 위험 액션 2단계 확인 모달 (5.7) */
export function confirmDanger({ title, message, confirmLabel = '확인', onConfirm }) {
  const actions = h('div', { className: 'modal-card__actions' });
  const body = h(
    'div',
    { style: 'display:flex;flex-direction:column;gap:16px;' },
    h('h2', { className: 'text-h2' }, title),
    h('p', { className: 'text-body' }, message),
    actions
  );
  const { close } = openModal(body);
  actions.appendChild(h('button', { className: 'btn btn--ghost', on: { click: close } }, '취소'));
  actions.appendChild(
    h('button', {
      className: 'btn btn--danger',
      on: {
        click: () => {
          onConfirm();
          close();
        }
      }
    }, confirmLabel)
  );
}
