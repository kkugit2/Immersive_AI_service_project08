import { h, toInitials, setButtonLoading } from '../../utils/dom.js';
import { toClockTime, isWithinOneMinute } from '../../utils/time.js';
import {
  sendMessage,
  listMessages,
  toggleReaction,
  listReactions,
  DEFAULT_REACTIONS
} from '../../services/chatService.js';
import { subscribe } from '../../services/realtimeBus.js';

/**
 * 일반 채팅방 / 호스트 전용(공지) 채팅방 공용 렌더러.
 * host_only 타입은 호스트만 입력창을 사용할 수 있고, 참가자는 메시지별 이모지 리액션만 가능하다.
 * @returns {{ el: HTMLElement, cleanup: () => void }}
 */
export function renderChatMessages({ chatRoom, currentUser, isHostUser, getUserName }) {
  const listEl = h('div', { className: 'message-list', attrs: { role: 'log', 'aria-live': 'polite' } });
  let destroyed = false;

  async function renderMessages() {
    const messages = await listMessages(chatRoom.id);
    if (destroyed) return;

    const isAnnouncement = chatRoom.type === 'host_only';
    let reactionsByMessage = {};
    if (isAnnouncement && messages.length > 0) {
      const entries = await Promise.all(messages.map(async (msg) => [msg.id, await listReactions(msg.id)]));
      if (destroyed) return;
      reactionsByMessage = Object.fromEntries(entries);
    }

    listEl.innerHTML = '';
    if (messages.length === 0) {
      listEl.appendChild(h('div', { className: 'empty-state' }, '아직 메시지가 없습니다. 첫 메시지를 남겨보세요.'));
      return;
    }
    let prev = null;
    messages.forEach((msg) => {
      const isOwn = msg.sender_id === currentUser.id;
      const grouped = prev && prev.sender_id === msg.sender_id && isWithinOneMinute(prev.created_at, msg.created_at);
      listEl.appendChild(buildMessageEl(msg, isOwn, grouped, reactionsByMessage[msg.id] || {}));
      prev = msg;
    });
    listEl.scrollTop = listEl.scrollHeight;
  }

  function buildReactionPills(msg, grouped) {
    const pills = Object.entries(grouped).map(([emoji, userIds]) => {
      const mine = userIds.includes(currentUser.id);
      return h(
        'button',
        {
          className: `reaction-pill ${mine ? 'reaction-pill--mine' : ''}`,
          attrs: { 'aria-pressed': String(mine), 'aria-label': `${emoji} ${userIds.length}명` },
          on: {
            click: async () => {
              await toggleReaction({ messageId: msg.id, userId: currentUser.id, emoji });
              renderMessages();
            }
          }
        },
        emoji,
        h('span', {}, String(userIds.length))
      );
    });

    const addBtn = h(
      'button',
      { className: 'reaction-pill', attrs: { 'aria-label': '리액션 추가' }, on: { click: (e) => openPicker(e, msg) } },
      '+'
    );

    return h('div', { className: 'message__reactions' }, ...pills, addBtn);
  }

  function openPicker(e, msg) {
    const existing = document.querySelector('.reaction-picker-popover');
    if (existing) existing.remove();
    const popover = h(
      'div',
      { className: 'reaction-picker-popover', style: 'position:absolute; background:var(--color-surface); border:1px solid var(--color-border); border-radius:8px; padding:4px; display:flex; gap:4px; z-index:50; box-shadow:0 8px 24px rgba(0,0,0,0.12);' },
      ...DEFAULT_REACTIONS.map((emoji) =>
        h('button', {
          className: 'reaction-bar__btn',
          style: 'width:32px;height:32px;font-size:16px;',
          on: {
            click: async () => {
              popover.remove();
              await toggleReaction({ messageId: msg.id, userId: currentUser.id, emoji });
              renderMessages();
            }
          }
        }, emoji)
      )
    );
    const rect = e.target.getBoundingClientRect();
    popover.style.left = `${rect.left}px`;
    popover.style.top = `${rect.bottom + 4}px`;
    document.body.appendChild(popover);
    setTimeout(() => {
      document.addEventListener('click', function onDocClick(ev) {
        if (!popover.contains(ev.target)) {
          popover.remove();
          document.removeEventListener('click', onDocClick);
        }
      });
    }, 0);
  }

  function buildMessageEl(msg, isOwn, grouped, reactions) {
    const isAnnouncement = chatRoom.type === 'host_only';
    const name = getUserName(msg.sender_id);
    return h(
      'div',
      { className: `message ${isOwn ? 'message--own' : ''} ${isAnnouncement ? 'message--announcement' : ''}` },
      grouped ? h('span', { className: 'message__avatar', style: 'width:28px;display:inline-block;' }) : h('span', { className: 'avatar message__avatar', attrs: { title: name } }, toInitials(name)),
      h(
        'div',
        { className: 'message__body' },
        grouped
          ? null
          : h(
              'div',
              { className: 'message__meta' },
              h('span', { className: 'text-body-strong' }, name),
              isAnnouncement ? h('span', { className: 'text-caption' }, '공지') : null,
              h('span', { className: 'text-caption' }, toClockTime(msg.created_at))
            ),
        h('div', { className: 'message__bubble text-body' }, msg.content),
        isAnnouncement ? buildReactionPills(msg, reactions) : null
      )
    );
  }

  const canCompose = chatRoom.type === 'general' || (chatRoom.type === 'host_only' && isHostUser);

  const textarea = h('textarea', {
    attrs: {
      rows: '1',
      placeholder: chatRoom.type === 'host_only' ? '공지사항을 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)' : '메시지를 입력하세요 (Enter 전송, Shift+Enter 줄바꿈)',
      'aria-label': '메시지 입력'
    },
    on: {
      keydown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          submit();
        }
      },
      input: (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.min(e.target.scrollHeight, 132)}px`;
      }
    }
  });

  let sendBtn = null;

  async function submit() {
    const content = textarea.value.trim();
    if (!content) return;
    if (sendBtn) setButtonLoading(sendBtn, true, '전송 중...');
    try {
      await sendMessage({ chatRoomId: chatRoom.id, senderId: currentUser.id, content });
      textarea.value = '';
      textarea.style.height = 'auto';
      await renderMessages();
    } catch (err) {
      // 검증 실패는 조용히 무시 (빈 메시지 등)
      console.warn(err.message);
    } finally {
      if (sendBtn) setButtonLoading(sendBtn, false);
    }
  }

  let composer;
  if (canCompose) {
    sendBtn = h('button', { className: 'btn btn--primary', attrs: { type: 'button' }, on: { click: submit } }, '전송');
    composer = h('div', { className: 'composer' }, textarea, sendBtn);
  } else {
    composer = h('div', { className: 'composer' }, h('span', { className: 'text-caption' }, '호스트 전용 채팅방입니다. 아래 메시지에 이모지로 반응할 수 있어요.'));
  }

  renderMessages();
  const unsubMessage = subscribe(`chat:${chatRoom.id}:message`, renderMessages);
  const unsubReaction = subscribe(`chat:${chatRoom.id}:reaction`, renderMessages);

  const el = h('div', { style: 'display:flex; flex-direction:column; height:100%; min-height:0;' }, listEl, composer);

  return {
    el,
    cleanup: () => {
      destroyed = true;
      unsubMessage();
      unsubReaction();
    }
  };
}
