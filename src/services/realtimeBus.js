/**
 * 실시간 이벤트 버스 (Supabase Realtime 연동).
 *
 * 화면 코드(`roomView.js`, `chatMessages.js`, `codeEditor.js`, `dashboard.js` 등)는
 * 여전히 `subscribe(channel, handler)` 하나의 시그니처만 사용한다. 이 모듈 내부에서
 * `room:<roomId>:*`, `chat:<chatRoomId>:*`, `user:<userId>:*` 형태의 채널 이름을 파싱해
 * Supabase Realtime의 `postgres_changes` 이벤트를 구독하고, 동일한 채널 이름으로 로컬
 * EventTarget에 다시 발행(emit)한다. 즉, 화면 쪽 구독 호출부는 백엔드 연동 이후에도
 * 전혀 수정할 필요가 없도록 설계했다.
 *
 * 같은 room/chat/user scope를 여러 곳에서 구독하더라도 실제 Supabase 채널은 참조 카운팅으로
 * 하나만 유지하고, 모든 구독이 해제되면 채널을 정리한다.
 */

import { supabase } from './supabaseClient.js';

const localBus = new EventTarget();

function emit(channelName, payload) {
  localBus.dispatchEvent(new CustomEvent(channelName, { detail: payload }));
}

/** scope:id -> { channel, refCount } */
const registry = new Map();

function buildChannel(scope, id) {
  const channel = supabase.channel(`${scope}:${id}`);

  if (scope === 'room') {
    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${id}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            emit(`room:${id}:member_left`, { userId: payload.old.user_id });
          } else {
            emit(`room:${id}:presence`, { userId: payload.new.user_id, online: payload.new.online });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meeting_rooms', filter: `id=eq.${id}` },
        (payload) => {
          if (payload.new.status === 'ended' && payload.old.status !== 'ended') {
            emit(`room:${id}:ended`, {});
          }
          if (payload.new.host_user_id !== payload.old.host_user_id) {
            emit(`room:${id}:host_changed`, { hostUserId: payload.new.host_user_id });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_rooms', filter: `room_id=eq.${id}` },
        () => emit(`room:${id}:chat_rooms_changed`, {})
      );
  } else if (scope === 'chat') {
    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_room_id=eq.${id}` },
        (payload) => emit(`chat:${id}:message`, { message: payload.new })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reactions', filter: `chat_room_id=eq.${id}` },
        (payload) => emit(`chat:${id}:reaction`, { messageId: (payload.new || payload.old).message_id })
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'code_documents', filter: `chat_room_id=eq.${id}` },
        (payload) =>
          emit(`chat:${id}:code_update`, {
            content: payload.new.content,
            language: payload.new.language,
            userId: payload.new.last_edited_by
          })
      );
  } else if (scope === 'user') {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${id}` },
      () => emit(`user:${id}:notification`, {})
    );
  }

  channel.subscribe();
  return channel;
}

function acquire(scope, id) {
  const key = `${scope}:${id}`;
  let entry = registry.get(key);
  if (entry) {
    entry.refCount += 1;
    return entry;
  }
  entry = { channel: buildChannel(scope, id), refCount: 1 };
  registry.set(key, entry);
  return entry;
}

function release(scope, id) {
  const key = `${scope}:${id}`;
  const entry = registry.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    supabase.removeChannel(entry.channel);
    registry.delete(key);
  }
}

/**
 * 채널 구독.
 * @param {string} channel - 예: `room:${roomId}:presence`, `chat:${chatRoomId}:message`, `user:${userId}:notification`
 * @param {(payload: any) => void} handler
 * @returns {() => void} 구독 해제 함수
 */
export function subscribe(channel, handler) {
  const [scope, id, event] = channel.split(':');
  if (!scope || !id || !event) {
    throw new Error(`잘못된 채널 이름입니다: ${channel}`);
  }
  acquire(scope, id);

  const listener = (evt) => handler(evt.detail);
  localBus.addEventListener(channel, listener);

  return () => {
    localBus.removeEventListener(channel, listener);
    release(scope, id);
  };
}
