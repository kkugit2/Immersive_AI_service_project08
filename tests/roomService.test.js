import { describe, it, expect, beforeEach } from 'vitest';
import { resetFakeSupabase } from './mocks/fakeSupabase.js';
import { signUp, signIn, signOut } from '../src/services/authService.js';
import {
  createRoom,
  joinRoomByCode,
  getMembers,
  isHost,
  transferHost,
  leaveRoom,
  endRoom
} from '../src/services/roomService.js';
import { createChatRoom, listChatRooms, sendMessage } from '../src/services/chatService.js';

const PASSWORD = 'password123';

async function makeUser(email, name) {
  await signOut();
  const { user } = await signUp({ email, password: PASSWORD, displayName: name });
  return user;
}

/** RPC는 auth.uid()(현재 로그인 세션)를 기준으로 권한을 판단하므로, 특정 사용자로 다시 전환한다. */
async function signInAs(user) {
  await signOut();
  await signIn({ email: user.email, password: PASSWORD });
}

describe('roomService', () => {
  beforeEach(() => {
    resetFakeSupabase();
    localStorage.clear();
  });

  it('회의방을 생성하면 6자리 코드가 발급되고 생성자가 호스트가 된다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
    expect(room.room_code).toMatch(/^\d{6}$/);
    expect(await isHost(room.id, host.id)).toBe(true);
  });

  it('6자리 코드로 회의방에 참가할 수 있다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
    const member = await makeUser('member@example.com', '서연');

    const joined = await joinRoomByCode({ roomCode: room.room_code, userId: member.id });
    expect(joined.id).toBe(room.id);
    const members = await getMembers(room.id);
    expect(members).toHaveLength(2);
  });

  it('존재하지 않는 코드로 참가하면 오류가 발생한다', async () => {
    const host = await makeUser('host@example.com', '지민');
    await makeUser('member@example.com', '서연');
    await expect(joinRoomByCode({ roomCode: '000000', userId: host.id })).rejects.toThrow('존재하지 않는 코드입니다.');
  });

  it('정원(10명) 초과 시 참가할 수 없다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '대형 회의', hostUserId: host.id });

    for (let i = 0; i < 9; i += 1) {
      const member = await makeUser(`member${i}@example.com`, `참가자${i}`);
      await joinRoomByCode({ roomCode: room.room_code, userId: member.id });
    }
    expect(await getMembers(room.id)).toHaveLength(10);

    const eleventh = await makeUser('member10@example.com', '참가자10');
    await expect(joinRoomByCode({ roomCode: room.room_code, userId: eleventh.id })).rejects.toThrow(
      '정원이 초과된 회의방입니다.'
    );
  });

  it('호스트가 다른 참가자에게 권한을 위임할 수 있다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
    const member = await makeUser('member@example.com', '서연');
    await joinRoomByCode({ roomCode: room.room_code, userId: member.id });

    await signInAs(host);
    await transferHost(room.id, host.id, member.id);
    expect(await isHost(room.id, member.id)).toBe(true);
    expect(await isHost(room.id, host.id)).toBe(false);
  });

  it('호스트가 위임 없이 나가면 참가 순서가 가장 빠른 참가자에게 자동 이관된다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
    const first = await makeUser('first@example.com', '서연');
    await joinRoomByCode({ roomCode: room.room_code, userId: first.id });
    const second = await makeUser('second@example.com', '민준');
    await joinRoomByCode({ roomCode: room.room_code, userId: second.id });

    await signInAs(host);
    await leaveRoom(room.id, host.id);
    expect(await isHost(room.id, first.id)).toBe(true);
  });

  it('회의방 종료 시 하위 채팅방/메시지가 모두 삭제된다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
    const chatRoom = await createChatRoom({ roomId: room.id, type: 'general', name: '자유대화', createdBy: host.id });
    await sendMessage({ chatRoomId: chatRoom.id, senderId: host.id, content: '안녕하세요' });

    await endRoom(room.id, host.id);

    expect(await listChatRooms(room.id)).toHaveLength(0);
    expect(await getMembers(room.id)).toHaveLength(0);
  });

  it('호스트가 아니면 회의방을 종료할 수 없다', async () => {
    const host = await makeUser('host@example.com', '지민');
    const room = await createRoom({ name: '주간 회의', hostUserId: host.id });
    const member = await makeUser('member@example.com', '서연');
    await joinRoomByCode({ roomCode: room.room_code, userId: member.id });

    await expect(endRoom(room.id, member.id)).rejects.toThrow('호스트만 회의방을 종료할 수 있습니다.');
  });
});
