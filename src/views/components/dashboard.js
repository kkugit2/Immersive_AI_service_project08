import { h } from '../../utils/dom.js';
import { getNotifications, markRead, markAllRead } from '../../services/dashboardService.js';
import { subscribe } from '../../services/realtimeBus.js';
import { toRelativeTime } from '../../utils/time.js';

const SECTION_META = {
  new_message: { label: '새 메시지', icon: '#', className: 'chat-type-icon--general' },
  code_edit: { label: '코드 변경', icon: '</>', className: 'chat-type-icon--code_editor' },
  host_announcement: { label: '호스트 공지', icon: '\u{1F4E2}', className: 'chat-type-icon--host_only' }
};

/** 우측 안 읽은 정보 대시보드 (5.9, PRD 3장) */
export function renderDashboard({ room, currentUser, onNavigateToChatRoom }) {
  const container = h('div', { className: 'dashboard-panel', attrs: { 'aria-label': '안 읽은 정보 대시보드' } });
  let destroyed = false;

  async function draw() {
    const groups = await getNotifications(currentUser.id, room.id);
    if (destroyed) return;

    container.innerHTML = '';
    container.appendChild(
      h(
        'div', { className: 'dashboard-panel__header' },
        h('span', { className: 'text-h2' }, '대시보드'),
        h('button', {
          className: 'btn btn--ghost btn--compact',
          on: {
            click: async () => {
              await markAllRead(currentUser.id, room.id);
              draw();
            }
          }
        }, '전체 읽음 처리')
      )
    );

    ['new_message', 'code_edit', 'host_announcement'].forEach((type) => {
      const meta = SECTION_META[type];
      const items = groups[type] || [];
      const section = h(
        'div', { className: 'dashboard-section', attrs: { 'aria-live': 'polite' } },
        h(
          'div', { className: 'dashboard-section__header' },
          h('span', { className: 'text-h3' }, meta.label),
          h('span', { className: 'text-caption' }, `${items.length}건`)
        )
      );

      const visible = items.slice(0, 5);
      if (visible.length === 0) {
        section.appendChild(h('div', { className: 'empty-state' }, '새로운 소식이 없습니다.'));
      } else {
        visible.forEach((n) => {
          section.appendChild(
            h(
              'button',
              {
                className: `notification-item ${!n.is_read ? 'notification-item--unread' : ''}`,
                on: {
                  click: async () => {
                    await markRead(n.id);
                    onNavigateToChatRoom(n.chat_room_id);
                    draw();
                  }
                }
              },
              h('span', { className: `chat-type-icon ${meta.className}` }, meta.icon),
              h(
                'span', { style: 'display:flex; flex-direction:column; align-items:flex-start; min-width:0; flex:1;' },
                h('span', { className: 'notification-item__preview text-body' }, n.preview_text),
                h('span', { className: 'text-caption' }, toRelativeTime(n.created_at))
              )
            )
          );
        });
      }
      container.appendChild(section);
    });
  }

  draw();
  const unsub = subscribe(`user:${currentUser.id}:notification`, draw);

  return {
    el: container,
    cleanup: () => {
      destroyed = true;
      unsub();
    }
  };
}
