import { h } from '../../utils/dom.js';

const TYPE_ICON = { general: '#', host_only: '\u{1F4E2}', code_editor: '</>' };
const TYPE_LABEL = { general: '일반', host_only: '공지', code_editor: '코드 에디터' };

/** 좌측 채팅방 목록 + 설정 버튼 (4.1, 5.2, 5.8) */
export function renderLeftNav({ chatRooms, selectedId, isHostUser, unreadCounts, onSelect, onCreate, onOpenSettings, onManage }) {
  const list = h('ul', { className: 'leftnav__list', attrs: { role: 'listbox', 'aria-label': '채팅방 목록' } });

  chatRooms.forEach((room) => {
    const unread = unreadCounts[room.id] || 0;
    const isSelected = room.id === selectedId;
    const item = h(
      'li',
      {},
      h(
        'button',
        {
          className: `list-item ${isSelected ? 'list-item--selected' : ''} ${unread > 0 ? 'list-item--unread' : ''}`,
          attrs: { role: 'option', 'aria-selected': String(isSelected) },
          on: { click: () => onSelect(room.id) }
        },
        h('span', { className: `chat-type-icon chat-type-icon--${room.type}` }, TYPE_ICON[room.type]),
        h('span', { className: 'list-item__title text-body', style: 'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;' }, room.name),
        room.type === 'host_only' ? h('span', { className: 'badge-host' }, TYPE_LABEL.host_only) : null,
        unread > 0 ? h('span', { className: 'badge-count', attrs: { 'aria-label': `안읽은 메시지 ${unread}개` } }, unread > 99 ? '99+' : String(unread)) : null,
        isHostUser
          ? h('span', {
              className: 'btn btn--ghost btn--icon btn--compact',
              attrs: { role: 'button', tabindex: '0', 'aria-label': `${room.name} 관리` },
              on: {
                click: (e) => {
                  e.stopPropagation();
                  onManage(room);
                }
              }
            }, '⋯')
          : null
      )
    );
    list.appendChild(item);
  });

  if (chatRooms.length === 0) {
    list.appendChild(h('li', { className: 'empty-state' }, isHostUser ? '아직 채팅방이 없어요. "+"로 첫 채팅방을 만들어보세요.' : '아직 생성된 채팅방이 없습니다.'));
  }

  return h(
    'nav', { className: 'leftnav', attrs: { 'aria-label': '채팅방 탐색' } },
    h(
      'div', { className: 'leftnav__header' },
      h('span', { className: 'text-h3' }, '채팅방'),
      isHostUser ? h('button', { className: 'btn btn--ghost btn--icon btn--compact', attrs: { 'aria-label': '채팅방 추가' }, on: { click: onCreate } }, '+') : null
    ),
    list,
    h(
      'div', { className: 'leftnav__footer' },
      h('button', { className: 'btn btn--ghost', style: 'width:100%; justify-content:flex-start;', on: { click: onOpenSettings } }, '⚙️ 설정')
    )
  );
}
