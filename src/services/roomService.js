/**
 * 회의방(Room) 서비스 (Supabase 연동).
 *
 * PRD 4.2~4.4, 7.1(meeting_rooms, room_members) 반영.
 * 6자리 코드 발급/검증, 정원(10명) 제한, 호스트 권한 위임/자동 이관,
 * 회의방 종료 시 하위 데이터 cascade 삭제는 모두 DB의 SECURITY DEFINER RPC 함수
 * (create_room / join_room_by_code / set_presence / transfer_host / leave_room / end_room)에서
 * 원자적으로(트랜잭션 단위로) 처리되며, 이 서비스는 그 RPC를 호출하는 얷은 래퍼다.
 *
 * 참고: RPC 내부에서 `auth.uid()`로 현재 로그인 사용자를 판단하므로 `hostUserId`,
 * `fromUserId`, `requesterId` 등의 인자는 기존 mock과의 시그니처 호환을 위해 유지하되
 * 서버 호출에는 사용하지 않는다(클라이언트가 임의로 다른 사용자를 사칭할 수 없도록 함).
 */

import { supabase } from './supabaseClient.js';
import { validateRoomName, validateRoomCode } from '../utils/validators.js';

/** 회의방 생성 (호스트) */
export async function createRoom({ name, hostUserId }) {
  const nameCheck = validateRoomName(name);
  if (!nameCheck.valid) throw new Error(nameCheck.message);
  if (!hostUserId) throw new Error('로그인이 필요합니다.');

  const { data, error } = await supabase.rpc('create_room', { p_name: name.trim() });
  if (error) throw new Error(error.message || '회의방을 생성하지 못했습니다.');
  return data;
}

/** 6자리 코드로 회의방 참가 */
export async function joinRoomByCode({ roomCode, userId }) {
  const codeCheck = validateRoomCode(roomCode);
  if (!codeCheck.valid) throw new Error(codeCheck.message);
  if (!userId) throw new Error('로그인이 필요합니다.');

  const { data, error } = await supabase.rpc('join_room_by_code', { p_room_code: roomCode.trim() });
  if (error) throw new Error(error.message || '회의방에 참가하지 못했습니다.');
  return data;
}

export async function getRoom(roomId) {
  const { data, error } = await supabase.from('meeting_rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw new Error('회의방 정보를 불러오지 못했습니다.');
  return data;
}

export async function getRoomByCode(roomCode) {
  const { data, error } = await supabase
    .from('meeting_rooms')
    .select('*')
    .eq('room_code', roomCode)
    .eq('status', 'active')
    .maybeSingle();
  if (error) return null;
  return data;
}

/** 회의방 소속 멤버 + 접속 상태 목록 (온라인 우선 정렬) */
export async function getMembers(roomId) {
  const { data, error } = await supabase
    .from('room_members')
    .select('id, user_id, role, online, joined_at, profiles(display_name)')
    .eq('room_id', roomId);
  if (error) throw new Error('참가자 목록을 불러오지 못했습니다.');

  return (data || [])
    .map((m) => ({
      id: m.id,
      userId: m.user_id,
      displayName: m.profiles?.display_name || '알 수 없음',
      role: m.role,
      online: !!m.online,
      joinedAt: m.joined_at
    }))
    .sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      return new Date(a.joinedAt) - new Date(b.joinedAt);
    });
}

export async function isHost(roomId, userId) {
  if (!roomId || !userId) return false;
  const { data, error } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return false;
  return data.role === 'host';
}

/** 접속 상태 갱신 (Supabase Realtime Presence와 병행되는 영속 상태 컬럼 갱신) */
export async function setPresence(roomId, userId, online) {
  const { error } = await supabase.rpc('set_presence', { p_room_id: roomId, p_online: online });
  if (error) {
    // 접속 상태 갱신 실패는 사용자 플로우를 막지 않는다(예: beforeunload 시점의 네트워크 취소).
    // eslint-disable-next-line no-console
    console.warn('[roomService] presence 갱신 실패:', error.message);
  }
}

/** 호스트가 특정 참가자에게 권한을 위임 */
export async function transferHost(roomId, fromUserId, toUserId) {
  const { data, error } = await supabase.rpc('transfer_host', { p_room_id: roomId, p_to_user_id: toUserId });
  if (error) throw new Error(error.message || '호스트 권한을 위임하지 못했습니다.');
  return data;
}

/** 참가자가 회의방을 나간다. 호스트가 나가면 참가 순서가 가장 빠른 멤버에게 자동 이관 */
export async function leaveRoom(roomId, userId) {
  const { error } = await supabase.rpc('leave_room', { p_room_id: roomId });
  if (error) throw new Error(error.message || '회의방에서 나가지 못했습니다.');
}

/** 회의방 종료: 회의방 및 하위 채팅방/메시지/리액션/코드문서/알림 cascade 삭제 */
export async function endRoom(roomId, requesterId) {
  const { error } = await supabase.rpc('end_room', { p_room_id: roomId });
  if (error) throw new Error(error.message || '회의방을 종료하지 못했습니다.');
}
