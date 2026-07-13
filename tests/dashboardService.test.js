import { describe, it, expect, beforeEach } from 'vitest';
import { resetFakeSupabase } from './mocks/fakeSupabase.js';
import { signUp, signOut } from '../src/services/authService.js';
import { createRoom, joinRoomByCode } from '../src/services/roomService.js';
import { createChatRoom, sendMessage, updateCodeDocument } from '../src/services/chatService.js';
import { getNotifications, getUnreadCount, markRead, markAllRead } from '../src/services/dashboardService.js';

async function makeUser(email, name) {
  await signOut();
  const { user } = await signUp({ email, password: 'password123', displayName: name });
  return user;
}

async function setupRoomWithMember() {
  const host = await makeUser('host@example.com', '지민');
  const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
  const member = await makeUser('member@example.com', '서연');
  await joinRoomByCode({ roomCode: room.room_code, userId: member.id });
  return { host, member, room };
}

describe('dashboardService', () => {
  beforeEach(() => {
    resetFakeSupabase();
    localStorage.clear();
  });

  it('일반 채팅방 새 메시지는 발신자를 제외한 멤버에게 new_message 알림을 만든다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '안녕하세요' });

    const memberNotifs = await getNotifications(member.id, room.id);
    expect(memberNotifs.new_message).toHaveLength(1);

    const hostNotifs = await getNotifications(host.id, room.id);
    expect(hostNotifs.new_message).toHaveLength(0);
  });

  it('호스트 전용 채팅방 메시지는 host_announcement로 분류된다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'host_only', name: '공지', createdBy: host.id });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '공지사항' });

    const memberNotifs = await getNotifications(member.id, room.id);
    expect(memberNotifs.host_announcement).toHaveLength(1);
  });

  it('코드 문서 변경은 code_edit 알림을 만든다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'code_editor', name: '협업코드', createdBy: host.id });
    await updateCodeDocument({ chatRoomId: chatRoom.id, content: 'x = 1', language: 'python', userId: host.id });

    const memberNotifs = await getNotifications(member.id, room.id);
    expect(memberNotifs.code_edit).toHaveLength(1);
  });

  it('알림을 읽음 처리하면 안읽음 카운트가 감소한다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '안녕하세요' });

    expect(await getUnreadCount(member.id, room.id)).toBe(1);
    const notif = (await getNotifications(member.id, room.id)).new_message[0];
    await markRead(notif.id);
    expect(await getUnreadCount(member.id, room.id)).toBe(0);
  });

  it('전체 읽음 처리하면 모든 알림이 읽음 상태가 된다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '메시지1' });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '메시지2' });

    expect(await getUnreadCount(member.id, room.id)).toBe(2);
    await markAllRead(member.id, room.id);
    expect(await getUnreadCount(member.id, room.id)).toBe(0);
  });
});
