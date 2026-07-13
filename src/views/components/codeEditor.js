import Prism from 'prismjs';
import 'prismjs/components/prism-python.js';
import 'prismjs/components/prism-json.js';
import 'prismjs/components/prism-markdown.js';
import 'prismjs/components/prism-markup.js';
import 'prismjs/components/prism-css.js';

import { h, escapeHtml } from '../../utils/dom.js';
import { getCodeDocument, updateCodeDocument } from '../../services/chatService.js';
import { subscribe } from '../../services/realtimeBus.js';

const LANGUAGE_OPTIONS = [
  { value: 'javascript', label: 'JavaScript', prism: 'javascript' },
  { value: 'python', label: 'Python', prism: 'python' },
  { value: 'html', label: 'HTML/CSS', prism: 'markup' },
  { value: 'json', label: 'JSON', prism: 'json' },
  { value: 'markdown', label: 'Markdown', prism: 'markdown' }
];

const CURSOR_COLORS = ['#F97316', '#22C55E', '#3B82F6', '#EC4899', '#A855F7', '#14B8A6'];

function highlight(content, language) {
  const opt = LANGUAGE_OPTIONS.find((o) => o.value === language) || LANGUAGE_OPTIONS[0];
  const grammar = Prism.languages[opt.prism];
  if (!grammar) return escapeHtml(content);
  try {
    return Prism.highlight(content, grammar, opt.prism);
  } catch {
    return escapeHtml(content);
  }
}

/**
 * 실시간 협업 코드 에디터. Supabase Realtime postgres_changes로 다른 클라이언트의
 * 저장 결과를 즉시 반영한다(마지막 저장이 이기는 last-write-wins 방식).
 * @returns {{ el: HTMLElement, cleanup: () => void }}
 */
export function renderCodeEditor({ chatRoom, currentUser, members }) {
  let doc = { content: '', language: 'javascript' };
  let saveTimer = null;
  let destroyed = false;

  const highlightEl = h('pre', { className: 'code-editor__highlight', attrs: { 'aria-hidden': 'true' } });
  const textarea = h('textarea', {
    className: 'code-editor__textarea',
    attrs: {
      spellcheck: 'false',
      'aria-label': `${chatRoom.name} 코드 에디터`,
      disabled: true
    }
  });

  const statusEl = h('span', { className: 'code-editor__status' }, '불러오는 중...');

  function renderHighlight() {
    highlightEl.innerHTML = `${highlight(textarea.value, doc.language)}\n`;
  }

  function syncScroll() {
    highlightEl.scrollTop = textarea.scrollTop;
    highlightEl.scrollLeft = textarea.scrollLeft;
  }

  async function persist() {
    statusEl.textContent = '저장 중...';
    try {
      doc = await updateCodeDocument({ chatRoomId: chatRoom.id, content: textarea.value, language: doc.language, userId: currentUser.id });
      if (!destroyed) statusEl.textContent = '저장됨';
    } catch (err) {
      if (!destroyed) statusEl.textContent = '저장 실패';
      console.warn(err.message);
    }
  }

  textarea.addEventListener('input', () => {
    renderHighlight();
    statusEl.textContent = '편집 중...';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(persist, 400);
  });
  textarea.addEventListener('scroll', syncScroll);

  const langSelect = h(
    'select',
    {
      attrs: { 'aria-label': '언어 선택', disabled: true },
      on: {
        change: async (e) => {
          statusEl.textContent = '저장 중...';
          try {
            doc = await updateCodeDocument({ chatRoomId: chatRoom.id, content: textarea.value, language: e.target.value, userId: currentUser.id });
            if (destroyed) return;
            statusEl.textContent = '저장됨';
            renderHighlight();
          } catch (err) {
            if (!destroyed) statusEl.textContent = '저장 실패';
            console.warn(err.message);
          }
        }
      }
    },
    ...LANGUAGE_OPTIONS.map((opt) => h('option', { attrs: { value: opt.value } }, opt.label))
  );

  const cursorLegend = h(
    'div',
    { className: 'code-editor__cursor-legend' },
    ...members.slice(0, 6).map((m, idx) =>
      h(
        'span',
        { className: 'cursor-chip' },
        h('span', { className: 'cursor-chip__dot', style: `background:${CURSOR_COLORS[idx % CURSOR_COLORS.length]}` }),
        m.displayName
      )
    )
  );

  const toolbar = h(
    'div', { className: 'code-editor__toolbar' },
    langSelect,
    cursorLegend,
    statusEl
  );

  const body = h('div', { className: 'code-editor__body' }, highlightEl, textarea);
  const el = h('div', { className: 'code-editor' }, toolbar, body);

  renderHighlight();

  (async () => {
    const loaded = await getCodeDocument(chatRoom.id);
    if (destroyed) return;
    doc = loaded || { content: '', language: 'javascript' };
    textarea.value = doc.content;
    langSelect.value = doc.language;
    textarea.disabled = false;
    langSelect.disabled = false;
    statusEl.textContent = '저장됨';
    renderHighlight();
  })();

  const unsubscribe = subscribe(`chat:${chatRoom.id}:code_update`, (payload) => {
    if (payload.userId === currentUser.id) return;
    doc.content = payload.content;
    doc.language = payload.language;
    textarea.value = payload.content;
    langSelect.value = payload.language;
    renderHighlight();
  });

  return {
    el,
    cleanup: () => {
      destroyed = true;
      unsubscribe();
      if (saveTimer) clearTimeout(saveTimer);
    }
  };
}
