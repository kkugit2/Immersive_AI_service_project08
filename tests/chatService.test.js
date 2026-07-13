import { describe, it, expect, beforeEach } from 'vitest';
import { resetFakeSupabase } from './mocks/fakeSupabase.js';
import { signUp, signOut } from '../src/services/authService.js';
import { createRoom, joinRoomByCode } from '../src/services/roomService.js';
import {
  createChatRoom,
  deleteChatRoom,
  renameChatRoom,
  listChatRooms,
  sendMessage,
  listMessages,
  toggleReaction,
  listReactions,
  getCodeDocument,
  updateCodeDocument
} from '../src/services/chatService.js';

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

describe('chatService - 채팅방 관리 (호스트 전용)', () => {
  beforeEach(() => {
    resetFakeSupabase();
    localStorage.clear();
  });

  it('호스트는 일반/호스트전용/코드에디터 채팅방을 생성할 수 있다', async () => {
    const { host, room } = await setupRoomWithMember();
    const general = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });
    const hostOnly = await createChatRoom({ roomId: room.id, type: 'host_only', name: '공지', createdBy: host.id });
    const codeEditor = await createChatRoom({ roomId: room.id, type: 'code_editor', name: '협업코드', createdBy: host.id });

    expect(await listChatRooms(room.id)).toHaveLength(3);
    expect(await getCodeDocument(codeEditor.id)).not.toBeNull();
    expect(general.type).toBe('general');
    expect(hostOnly.type).toBe('host_only');
  });

  it('참가자는 채팅방을 생성할 수 없다', async () => {
    const { member, room } = await setupRoomWithMember();
    await expect(
      createChatRoom({ roomId: room.id, type: 'general', name: '몰래만든방', createdBy: member.id })
    ).rejects.toThrow('채팅방은 호스트만 생성할 수 있습니다.');
  });

  it('호스트는 채팅방 이름을 변경하고 삭제할 수 있다', async () => {
    const { host, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });

    const renamed = await renameChatRoom(chatRoom.id, '잡담방', host.id);
    expect(renamed.name).toBe('잡담방');

    await deleteChatRoom(chatRoom.id, host.id);
    expect(await listChatRooms(room.id)).toHaveLength(0);
  });
});

describe('chatService - 일반 채팅방', () => {
  beforeEach(() => {
    resetFakeSupabase();
    localStorage.clear();
  });

  it('누구나 일반 채팅방에 메시지를 보낼 수 있다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });

    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '안녕하세요' });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: member.id, content: '반갑습니다' });

    expect(await listMessages(chatRoom.id)).toHaveLength(2);
  });

  it('빈 메시지는 전송할 수 없다', async () => {
    const { host, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });
    await expect(sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '   ' })).rejects.toThrow();
  });
});

describe('chatService - 호스트 전용 채팅방', () => {
  beforeEach(() => {
    resetFakeSupabase();
    localStorage.clear();
  });

  it('호스트만 메시지를 작성할 수 있다', async () => {
    const { host, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'host_only', name: '공지', createdBy: host.id });
    const message = await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '공지사항입니다' });
    expect(message.content).toBe('공지사항입니다');
  });

  it('참가자는 호스트 전용 채팅방에 메시지를 작성할 수 없다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'host_only', name: '공지', createdBy: host.id });
    await expect(
      sendMessage({ chatRoomId: chatRoom.id, senderId: member.id, content: '저도 쓸래요' })
    ).rejects.toThrow('호스트 전용 채팅방은 호스트만 메시지를 작성할 수 있습니다.');
  });

  it('참가자는 호스트 공지 메시지에 이모지 리액션을 남길 수 있다', async () => {
    const { host, member, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'host_only', name: '공지', createdBy: host.id });
    const message = await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '공지사항입니다' });

    await toggleReaction({ messageId: message.id, userId: member.id, emoji: '👍' });
    const reactions = await listReactions(message.id);
    expect(reactions['👍']).toContain(member.id);

    // 같은 이모지를 다시 누르면 토글되어 제거된다
    await toggleReaction({ messageId: message.id, userId: member.id, emoji: '👍' });
    expect((await listReactions(message.id))['👍']).toBeUndefined();
  });
});

describe('chatService - 코드 에디터', () => {
  beforeEach(() => {
    resetFakeSupabase();
    localStorage.clear();
  });

  it('코드 문서를 갱신하면 내용과 언어가 반영된다', async () => {
    const { host, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'code_editor', name: '협업코드', createdBy: host.id });

    await updateCodeDocument({ chatRoomId: chatRoom.id, content: 'console.log(1)', language: 'javascript', userId: host.id });
    const doc = await getCodeDocument(chatRoom.id);
    expect(doc.content).toBe('console.log(1)');
    expect(doc.language).toBe('javascript');
  });

  it('코드 에디터 채팅방에는 채팅 메시지를 보낼 수 없다', async () => {
    const { host, room } = await setupRoomWithMember();
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'code_editor', name: '협업코드', createdBy: host.id });
    await expect(sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: 'hi' })).rejects.toThrow();
  });
});
