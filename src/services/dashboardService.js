/**
 * 안 읽은 정보 대시보드 서비스 (Supabase 연동).
 *
 * PRD 3장(안 읽은 정보 대시보드), 7.1(notifications) 반영.
 * 새 메시지 / 코드 변경 / 호스트 공지 3개 카테고리로 그룹화해 제공한다.
 *
 * 알림 생성(`createNotificationsForRoom`)은 더 이상 클라이언트에서 수행하지 않는다.
 * DB 트리거(`fanout_new_message_notification`, `fanout_code_edit_notification`)가
 * messages/code_documents 변경 시 notifications 행을 자동 생성하므로 이 모듈은
 * 조회/읽음 처리만 담당한다.
 */

import { supabase } from './supabaseClient.js';

/** 카테고리별로 그룹화된 알림 목록 */
export async function getNotifications(userId, roomId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });
  if (error) throw new Error('알림을 불러오지 못했습니다.');

  const all = data || [];
  return {
    new_message: all.filter((n) => n.type === 'new_message'),
    code_edit: all.filter((n) => n.type === 'code_edit'),
    host_announcement: all.filter((n) => n.type === 'host_announcement')
  };
}

export async function getUnreadCount(userId, roomId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .eq('is_read', false);
  if (error) throw new Error('안읽음 개수를 불러오지 못했습니다.');
  return count || 0;
}

/** 채팅방별 안읽음 개수 맵 (좌측 채팅방 목록 뱰지용) */
export async function getUnreadCountsByChatRoom(userId, roomId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('chat_room_id')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .eq('is_read', false);
  if (error) throw new Error('안읽음 개수를 불러오지 못했습니다.');

  const counts = {};
  (data || []).forEach((n) => {
    counts[n.chat_room_id] = (counts[n.chat_room_id] || 0) + 1;
  });
  return counts;
}

/** 알림 항목 하나 읽음 처리 */
export async function markRead(notificationId) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  if (error) throw new Error('알림을 읽음 처리하지 못했습니다.');
}

/** 특정 채팅방에 대한 알림을 모두 읽음 처리 (채팅방 진입 시 호출) */
export async function markReadForChatRoom(userId, chatRoomId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('chat_room_id', chatRoomId);
  if (error) throw new Error('알림을 읽음 처리하지 못했습니다.');
}

/** 특정 회의방의 알림 전체 읽음 처리 */
export async function markAllRead(userId, roomId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('room_id', roomId);
  if (error) throw new Error('알림을 읽음 처리하지 못했습니다.');
}
