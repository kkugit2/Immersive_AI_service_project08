import { h, toInitials } from '../../utils/dom.js';

/** 상단바: 회의방 이름 + 참가자 아바타 스택(온라인 우선, 최대 5개) (4.1, 5.3) */
export function renderTopBar({ room, members, onOpenParticipants, onOpenDashboardToggle, onOpenLeftNavToggle }) {
  const visible = members.slice(0, 5);
  const rest = members.length - visible.length;

  const stack = h(
    'div',
    { className: 'avatar-stack', attrs: { role: 'button', tabindex: '0', 'aria-label': `참가자 ${members.length}명` }, on: { click: onOpenParticipants, keydown: (e) => { if (e.key === 'Enter') onOpenParticipants(); } } },
    ...visible.map((m) =>
      h(
        'span',
        { className: 'avatar avatar--sm', attrs: { title: m.displayName } },
        toInitials(m.displayName),
        h('span', {
          className: `avatar__status ${m.online ? 'avatar__status--online' : ''}`,
          attrs: { 'aria-label': m.online ? '온라인' : '오프라인' }
        })
      )
    ),
    rest > 0 ? h('span', { className: 'avatar avatar--sm', attrs: { 'aria-hidden': 'true' } }, `+${rest}`) : null
  );

  return h(
    'header', { className: 'topbar' },
    h(
      'div', { className: 'topbar__room-name' },
      h('button', { className: 'btn btn--ghost btn--icon mobile-only-leftnav-toggle', attrs: { 'aria-label': '채팅방 목록 열기' }, on: { click: onOpenLeftNavToggle } }, '☰'),
      h('span', { className: 'text-h1' }, room.name)
    ),
    h(
      'div', { className: 'topbar__participants' },
      h('span', { className: 'text-caption' }, `${members.length}/10명 접속`),
      stack,
      h('button', { className: 'btn btn--ghost btn--icon', attrs: { 'aria-label': '대시보드 열기' }, on: { click: onOpenDashboardToggle } }, '\u{1F4CB}')
    )
  );
}
