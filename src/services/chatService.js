/**
 * 채팅방/메시지/리액션/코드문서 서비스 (Supabase 연동).
 *
 * PRD 3장, 7.1(chat_rooms, messages, reactions, code_documents) 반영.
 * - 채팅방 생성/삭제/이름변경은 호스트만 가능 (클라이언트 사전 검증 + DB RLS 이중 방어)
 * - 일반 채팅방: 누구나 메시지 작성 가능
 * - 호스트 전용 채팅방: 호스트만 메시지 작성, 참가자는 이모지 리액션만 가능
 * - 코드 에디터 채팅방: chat_rooms 1건당 code_documents 1건(1:1, DB 트리거가 자동 생성)
 *
 * 알림(대시보드) 생성은 더 이상 이 서비스에서 수행하지 않는다. DB 트리거
 * (`fanout_new_message_notification`, `fanout_code_edit_notification`)가 메시지/코드
 * 문서 변경 시 발신자를 제외한 회의방 멤버 전원에게 notifications 행을 자동 생성한다.
 */

import { supabase } from './supabaseClient.js';
import { isHost } from './roomService.js';
import { validateChatRoomName, validateMessageContent } from '../utils/validators.js';

export const CHAT_ROOM_TYPES = ['general', 'host_only', 'code_editor'];
export const DEFAULT_REACTIONS = ['👍', '🎉', '❤️', '😂', '👀', '🙌'];

async function assertHost(roomId, userId, message) {
  const host = await isHost(roomId, userId);
  if (!host) throw new Error(message);
}

/** 채팅방 생성 (호스트 전용) */
export async function createChatRoom({ roomId, type, name, createdBy }) {
  await assertHost(roomId, createdBy, '채팅방은 호스트만 생성할 수 있습니다.');
  if (!CHAT_ROOM_TYPES.includes(type)) throw new Error('알 수 없는 채팅방 유형입니다.');
  const nameCheck = validateChatRoomName(name);
  if (!nameCheck.valid) throw new Error(nameCheck.message);

  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({ room_id: roomId, type, name: name.trim(), created_by: createdBy })
    .select()
    .single();
  if (error) throw new Error('채팅방을 생성하지 못했습니다.');
  return data;
}

/** 채팅방 삭제 (호스트 전용) */
export async function deleteChatRoom(chatRoomId, requesterId) {
  const chatRoom = await getChatRoom(chatRoomId);
  if (!chatRoom) throw new Error('존재하지 않는 채팅방입니다.');
  await assertHost(chatRoom.room_id, requesterId, '채팅방은 호스트만 삭제할 수 있습니다.');

  const { error } = await supabase.from('chat_rooms').delete().eq('id', chatRoomId);
  if (error) throw new Error('채팅방을 삭제하지 못했습니다.');
}

/** 채팅방 이름 변경 (호스트 전용) */
export async function renameChatRoom(chatRoomId, newName, requesterId) {
  const nameCheck = validateChatRoomName(newName);
  if (!nameCheck.valid) throw new Error(nameCheck.message);

  const chatRoom = await getChatRoom(chatRoomId);
  if (!chatRoom) throw new Error('존재하지 않는 채팅방입니다.');
  await assertHost(chatRoom.room_id, requesterId, '채팅방은 호스트만 관리할 수 있습니다.');

  const { data, error } = await supabase
    .from('chat_rooms')
    .update({ name: newName.trim() })
    .eq('id', chatRoomId)
    .select()
    .single();
  if (error) throw new Error('채팅방 이름을 변경하지 못했습니다.');
  return data;
}

export async function listChatRooms(roomId) {
  const { data, error } = await supabase
    .from('chat_rooms')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw new Error('채팅방 목록을 불러오지 못했습니다.');
  return data || [];
}

export async function getChatRoom(chatRoomId) {
  const { data, error } = await supabase.from('chat_rooms').select('*').eq('id', chatRoomId).maybeSingle();
  if (error) return null;
  return data;
}

/** 메시지 전송. 호스트 전용 채팅방은 호스트만 작성 가능 */
export async function sendMessage({ chatRoomId, senderId, content }) {
  const contentCheck = validateMessageContent(content);
  if (!contentCheck.valid) throw new Error(contentCheck.message);

  const chatRoom = await getChatRoom(chatRoomId);
  if (!chatRoom) throw new Error('존재하지 않는 채팅방입니다.');
  if (chatRoom.type === 'code_editor') throw new Error('코드 에디터 채팅방에는 메시지를 보낼 수 없습니다.');
  if (chatRoom.type === 'host_only') {
    await assertHost(chatRoom.room_id, senderId, '호스트 전용 채팅방은 호스트만 메시지를 작성할 수 있습니다.');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_room_id: chatRoomId, sender_id: senderId, content: content.trim() })
    .select()
    .single();
  if (error) throw new Error('메시지를 전송하지 못했습니다.');
  return data;
}

export async function listMessages(chatRoomId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_room_id', chatRoomId)
    .order('created_at', { ascending: true });
  if (error) throw new Error('메시지를 불러오지 못했습니다.');
  return data || [];
}

/** 이모지 리액션 추가/토글 (호스트 전용 채팅방 메시지 대상) */
export async function toggleReaction({ messageId, userId, emoji }) {
  const { data: existing, error: findError } = await supabase
    .from('reactions')
    .select('id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (findError) throw new Error('리액션 처리에 실패했습니다.');

  if (existing) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
    if (error) throw new Error('리액션 처리에 실패했습니다.');
  } else {
    const { error } = await supabase.from('reactions').insert({ message_id: messageId, user_id: userId, emoji });
    if (error) throw new Error('리액션 처리에 실패했습니다.');
  }
  return listReactions(messageId);
}

export async function listReactions(messageId) {
  const { data, error } = await supabase.from('reactions').select('user_id, emoji').eq('message_id', messageId);
  if (error) throw new Error('리액션을 불러오지 못했습니다.');

  const grouped = {};
  (data || []).forEach((r) => {
    grouped[r.emoji] = grouped[r.emoji] || [];
    grouped[r.emoji].push(r.user_id);
  });
  return grouped;
}

/** 코드 문서 조회 (코드에디터 채팅방과 1:1) */
export async function getCodeDocument(chatRoomId) {
  const { data, error } = await supabase.from('code_documents').select('*').eq('chat_room_id', chatRoomId).maybeSingle();
  if (error) return null;
  return data;
}

/**
 * 코드 문서 갱신 (실시간 공동편집).
 * 저장 시 last_edited_by를 기록해 DB 트리거가 작성자 본인을 제외한 나머지 멤버에게
 * code_edit 알림을 생성하고, Realtime postgres_changes로 다른 클라이언트에 즉시 반영된다.
 */
export async function updateCodeDocument({ chatRoomId, content, language, userId }) {
  const patch = { last_edited_by: userId, updated_at: new Date().toISOString() };
  if (content !== undefined) patch.content = content;
  if (language !== undefined) patch.language = language;

  const { data, error } = await supabase
    .from('code_documents')
    .update(patch)
    .eq('chat_room_id', chatRoomId)
    .select()
    .single();
  if (error) throw new Error('코드 문서를 저장하지 못했습니다.');
  return data;
}
