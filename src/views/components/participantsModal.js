import { h, toInitials } from '../../utils/dom.js';
import { getMembers } from '../../services/roomService.js';
import { openModal } from './modal.js';

/** 참가자 전체 목록 팝업 (5.3) */
export async function openParticipantsModal({ roomId }) {
  const members = await getMembers(roomId);

  const list = h(
    'ul',
    { style: 'display:flex; flex-direction:column; gap:4px; max-height:360px; overflow-y:auto;' },
    ...members.map((m) =>
      h(
        'li',
        { className: 'participant-row' },
        h(
          'span',
          { style: 'position:relative;' },
          h('span', { className: 'avatar' }, toInitials(m.displayName)),
          m.role === 'host' ? h('span', { className: 'avatar__crown', attrs: { 'aria-hidden': 'true' } }, '\u{1F451}') : null,
          h('span', { className: `avatar__status ${m.online ? 'avatar__status--online' : ''}`, attrs: { 'aria-label': m.online ? '온라인' : '오프라인' } })
        ),
        h('span', { className: 'participant-row__name' }, m.displayName),
        m.role === 'host' ? h('span', { className: 'badge-host' }, '호스트') : null,
        h('span', { className: 'text-caption', style: 'margin-left:auto;' }, m.online ? '온라인' : '오프라인')
      )
    )
  );

  const body = h(
    'div',
    {},
    h('h2', { className: 'text-h2' }, `참가자 (${members.length}/10)`),
    list,
    h('div', { className: 'modal-card__actions' }, h('button', { className: 'btn btn--ghost', on: { click: () => close() } }, '닫기'))
  );

  const { close } = openModal(body);
}
