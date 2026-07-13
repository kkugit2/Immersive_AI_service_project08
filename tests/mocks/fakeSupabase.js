/**
 * 테스트 전용 in-memory Supabase 클라이언트 더블.
 *
 * 실제 네트워크 호출 없이 `supabase-js`의 체이닝 쿼리 빌더(`.from().select().eq()...`)와
 * `.rpc()`, `.auth.*`, `.channel()` 표면을 흔내낸다. RPC 핸들러들은 Supabase 프로젝트에
 * 실제로 적용한 SQL 함수(create_room/join_room_by_code/set_presence/transfer_host/
 * leave_room/end_room)와 동일한 비즈니스 규칙(6자리 코드 발급, 정원 10명 제한, 호스트 검증,
 * cascade 삭제)을 재현하며, 메시지/코드문서 트리거(알림 자동 생성, 코드에디터 채팅방 생성 시
 * code_documents 자동 생성)도 동일하게 재현한다.
 *
 * RLS(행 수준 보안)는 DB에서만 강제되므로 이 더블은 권한 자체를 막지 않는다(그 부분은
 * Supabase 어드바이저 점검 + 마이그레이션 리붰로 별도 검증). 이 더블이 검증하는 것은
 * "서비스 레이어가 올바른 테이블/RPC를 올바른 인자로 호출하고, 에러/성공 시 PRD가 요구하는
 * 한국어 메시지와 데이터 형태를 반환하는가"이다.
 */

function emptyDb() {
  return {
    profiles: [],
    meeting_rooms: [],
    room_members: [],
    chat_rooms: [],
    messages: [],
    reactions: [],
    code_documents: [],
    notifications: []
  };
}

let db = emptyDb();
let currentSession = null;
let idCounter = 0;
const passwords = new Map();

function genId(prefix = 'id') {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function resetFakeSupabase() {
  db = emptyDb();
  currentSession = null;
  idCounter = 0;
  passwords.clear();
}

function matchFilters(row, filters) {
  return filters.every(([col, val]) => row[col] === val);
}

function applyOrder(rows, orderCol, asc) {
  if (!orderCol) return rows;
  return [...rows].sort((a, b) => {
    const av = new Date(a[orderCol]).getTime();
    const bv = new Date(b[orderCol]).getTime();
    if (av < bv) return asc ? -1 : 1;
    if (av > bv) return asc ? 1 : -1;
    return 0;
  });
}

function applyDefaults(table, payload) {
  const base = { id: genId(table), created_at: nowIso() };
  if (table === 'notifications') base.is_read = false;
  if (table === 'code_documents') {
    base.language = 'javascript';
    base.content = '';
    base.updated_at = nowIso();
  }
  return { ...base, ...payload };
}

function cascadeDeleteChatRoomsByIds(chatRoomIds) {
  if (!chatRoomIds || chatRoomIds.length === 0) return;
  const messageIds = db.messages.filter((m) => chatRoomIds.includes(m.chat_room_id)).map((m) => m.id);
  db.reactions = db.reactions.filter((r) => !messageIds.includes(r.message_id));
  db.messages = db.messages.filter((m) => !chatRoomIds.includes(m.chat_room_id));
  db.code_documents = db.code_documents.filter((d) => !chatRoomIds.includes(d.chat_room_id));
  db.notifications = db.notifications.filter((n) => !chatRoomIds.includes(n.chat_room_id));
}

function runBeforeInsertTriggers(table, row) {
  if (table === 'reactions') {
    const msg = db.messages.find((m) => m.id === row.message_id);
    row.chat_room_id = msg ? msg.chat_room_id : null;
  }
}

function runAfterInsertTriggers(table, row) {
  if (table === 'chat_rooms' && row.type === 'code_editor') {
    db.code_documents.push(applyDefaults('code_documents', { chat_room_id: row.id, last_edited_by: null }));
  }
  if (table === 'messages') {
    const chatRoom = db.chat_rooms.find((c) => c.id === row.chat_room_id);
    if (chatRoom) {
      const type = chatRoom.type === 'host_only' ? 'host_announcement' : 'new_message';
      db.room_members
        .filter((m) => m.room_id === chatRoom.room_id && m.user_id !== row.sender_id)
        .forEach((m) => {
          db.notifications.push(
            applyDefaults('notifications', {
              user_id: m.user_id,
              room_id: chatRoom.room_id,
              chat_room_id: row.chat_room_id,
              type,
              preview_text: row.content.slice(0, 80)
            })
          );
        });
    }
  }
}

function runAfterUpdateTriggers(table, before, after) {
  if (table === 'code_documents') {
    if (before.content !== after.content || before.language !== after.language) {
      const chatRoom = db.chat_rooms.find((c) => c.id === after.chat_room_id);
      if (chatRoom) {
        db.room_members
          .filter((m) => m.room_id === chatRoom.room_id && m.user_id !== after.last_edited_by)
          .forEach((m) => {
            db.notifications.push(
              applyDefaults('notifications', {
                user_id: m.user_id,
                room_id: chatRoom.room_id,
                chat_room_id: after.chat_room_id,
                type: 'code_edit',
                preview_text: `${chatRoom.name} 코드가 수정되었습니다.`
              })
            );
          });
      }
    }
  }
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.filters = [];
    this.payload = null;
    this.singleMode = null;
    this.countMode = null;
    this.orderCol = null;
    this.orderAsc = true;
  }

  select(cols, opts) {
    this.selectCols = cols;
    if (opts && opts.count) this.countMode = opts;
    return this;
  }

  eq(col, val) {
    this.filters.push([col, val]);
    return this;
  }

  order(col, { ascending } = {}) {
    this.orderCol = col;
    this.orderAsc = ascending !== false;
    return this;
  }

  maybeSingle() {
    this.singleMode = 'maybeSingle';
    return this;
  }

  single() {
    this.singleMode = 'single';
    return this;
  }

  insert(obj) {
    this.action = 'insert';
    this.payload = obj;
    return this;
  }

  update(obj) {
    this.action = 'update';
    this.payload = obj;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  _execute() {
    const table = db[this.table];

    if (this.action === 'select') {
      let rows = table.filter((r) => matchFilters(r, this.filters));
      rows = applyOrder(rows, this.orderCol, this.orderAsc);

      if (this.countMode) {
        return { data: null, error: null, count: rows.length };
      }

      if (this.selectCols && this.selectCols.includes('profiles(')) {
        rows = rows.map((r) => ({ ...r, profiles: db.profiles.find((p) => p.id === r.user_id) || null }));
      }

      if (this.singleMode === 'single') {
        return rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: { message: '데이터를 찾을 수 없습니다.' } };
      }
      if (this.singleMode === 'maybeSingle') {
        return { data: rows[0] || null, error: null };
      }
      return { data: rows, error: null };
    }

    if (this.action === 'insert') {
      const row = applyDefaults(this.table, this.payload);
      runBeforeInsertTriggers(this.table, row);
      table.push(row);
      runAfterInsertTriggers(this.table, row);
      return this.singleMode ? { data: row, error: null } : { data: [row], error: null };
    }

    if (this.action === 'update') {
      const rows = table.filter((r) => matchFilters(r, this.filters));
      rows.forEach((r) => {
        const before = { ...r };
        Object.assign(r, this.payload);
        runAfterUpdateTriggers(this.table, before, r);
      });
      if (this.singleMode) {
        return rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: '데이터를 찾을 수 없습니다.' } };
      }
      return { data: rows, error: null };
    }

    if (this.action === 'delete') {
      const toDelete = table.filter((r) => matchFilters(r, this.filters));
      const deletedIds = toDelete.map((r) => r.id);
      db[this.table] = table.filter((r) => !matchFilters(r, this.filters));
      if (this.table === 'chat_rooms') cascadeDeleteChatRoomsByIds(deletedIds);
      return { data: toDelete, error: null };
    }

    return { data: null, error: { message: '지원하지 않는 동작입니다.' } };
  }

  then(resolve, reject) {
    try {
      resolve(this._execute());
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: { message: err.message } });
    }
  }
}

function requireAuth() {
  if (!currentSession) throw new Error('로그인이 필요합니다.');
  return currentSession.user.id;
}

const rpcHandlers = {
  create_room: ({ p_name }) => {
    const uid = requireAuth();
    if (!p_name || !p_name.trim()) throw new Error('회의방 이름을 입력해주세요.');
    if (p_name.trim().length > 40) throw new Error('회의방 이름은 40자 이하로 입력해주세요.');

    let code;
    do {
      code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    } while (db.meeting_rooms.some((r) => r.room_code === code && r.status === 'active'));

    const room = {
      id: genId('room'),
      room_code: code,
      name: p_name.trim(),
      host_user_id: uid,
      status: 'active',
      created_at: nowIso(),
      ended_at: null
    };
    db.meeting_rooms.push(room);
    db.room_members.push({
      id: genId('member'),
      room_id: room.id,
      user_id: uid,
      role: 'host',
      joined_at: nowIso(),
      last_seen_at: nowIso(),
      online: true
    });
    return room;
  },

  join_room_by_code: ({ p_room_code }) => {
    const uid = requireAuth();
    if (!/^\d{6}$/.test(p_room_code || '')) throw new Error('코드는 숫자 6자리여야 합니다.');

    const room = db.meeting_rooms.find((r) => r.room_code === p_room_code && r.status === 'active');
    if (!room) throw new Error('존재하지 않는 코드입니다.');

    const existing = db.room_members.find((m) => m.room_id === room.id && m.user_id === uid);
    if (existing) {
      existing.online = true;
      return room;
    }

    const count = db.room_members.filter((m) => m.room_id === room.id).length;
    if (count >= 10) throw new Error('정원이 초과된 회의방입니다.');

    db.room_members.push({
      id: genId('member'),
      room_id: room.id,
      user_id: uid,
      role: 'member',
      joined_at: nowIso(),
      last_seen_at: nowIso(),
      online: true
    });
    return room;
  },

  set_presence: ({ p_room_id, p_online }) => {
    const uid = requireAuth();
    const m = db.room_members.find((mm) => mm.room_id === p_room_id && mm.user_id === uid);
    if (m) m.online = p_online;
    return null;
  },

  transfer_host: ({ p_room_id, p_to_user_id }) => {
    const uid = requireAuth();
    const room = db.meeting_rooms.find((r) => r.id === p_room_id);
    if (!room) throw new Error('존재하지 않는 회의방입니다.');
    if (room.host_user_id !== uid) throw new Error('호스트만 권한을 위임할 수 있습니다.');

    const toMember = db.room_members.find((m) => m.room_id === p_room_id && m.user_id === p_to_user_id);
    if (!toMember) throw new Error('대상 참가자를 찾을 수 없습니다.');
    const fromMember = db.room_members.find((m) => m.room_id === p_room_id && m.user_id === uid);

    fromMember.role = 'member';
    toMember.role = 'host';
    room.host_user_id = p_to_user_id;
    return room;
  },

  leave_room: ({ p_room_id }) => {
    const uid = requireAuth();
    const room = db.meeting_rooms.find((r) => r.id === p_room_id);
    if (!room) return null;

    const wasHost = room.host_user_id === uid;
    db.room_members = db.room_members.filter((m) => !(m.room_id === p_room_id && m.user_id === uid));

    if (wasHost) {
      const remaining = db.room_members
        .filter((m) => m.room_id === p_room_id)
        .sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at));
      if (remaining.length > 0) {
        remaining[0].role = 'host';
        room.host_user_id = remaining[0].user_id;
      }
    }
    return null;
  },

  end_room: ({ p_room_id }) => {
    const uid = requireAuth();
    const room = db.meeting_rooms.find((r) => r.id === p_room_id);
    if (!room) throw new Error('존재하지 않는 회의방입니다.');
    if (room.host_user_id !== uid) throw new Error('호스트만 회의방을 종료할 수 있습니다.');

    const chatRoomIds = db.chat_rooms.filter((c) => c.room_id === p_room_id).map((c) => c.id);
    cascadeDeleteChatRoomsByIds(chatRoomIds);
    db.chat_rooms = db.chat_rooms.filter((c) => c.room_id !== p_room_id);
    db.notifications = db.notifications.filter((n) => n.room_id !== p_room_id);
    db.room_members = db.room_members.filter((m) => m.room_id !== p_room_id);
    room.status = 'ended';
    room.ended_at = nowIso();
    return null;
  }
};

export const supabase = {
  from(table) {
    return new QueryBuilder(table);
  },

  rpc(name, params) {
    return new Promise((resolve) => {
      try {
        const handler = rpcHandlers[name];
        if (!handler) throw new Error(`알 수 없는 RPC입니다: ${name}`);
        const data = handler(params || {});
        resolve({ data, error: null });
      } catch (err) {
        resolve({ data: null, error: { message: err.message } });
      }
    });
  },

  channel() {
    const chan = {
      on() {
        return chan;
      },
      subscribe() {
        return chan;
      }
    };
    return chan;
  },

  removeChannel() {},

  auth: {
    async signUp({ email, password, options }) {
      if (db.profiles.some((p) => p.email === email)) {
        return { data: null, error: { message: 'User already registered' } };
      }
      if (!password || password.length < 6) {
        return { data: null, error: { message: 'Password should be at least 6 characters.' } };
      }
      const userId = genId('user');
      const displayName = options?.data?.display_name || email.split('@')[0];
      const createdAt = nowIso();
      db.profiles.push({ id: userId, email, display_name: displayName, created_at: createdAt });
      passwords.set(email, password);

      const user = { id: userId, email, created_at: createdAt, user_metadata: { display_name: displayName } };
      const session = { user };
      currentSession = session;
      return { data: { user, session }, error: null };
    },

    async signInWithPassword({ email, password }) {
      const profile = db.profiles.find((p) => p.email === email);
      if (!profile || passwords.get(email) !== password) {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }
      const user = {
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        user_metadata: { display_name: profile.display_name }
      };
      currentSession = { user };
      return { data: { user, session: currentSession }, error: null };
    },

    async signOut() {
      currentSession = null;
      return { error: null };
    },

    async getSession() {
      return { data: { session: currentSession }, error: null };
    },

    onAuthStateChange() {
      return { data: { subscription: { unsubscribe() {} } } };
    }
  }
};
