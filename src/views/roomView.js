import { h, clear } from '../utils/dom.js';
import { getRoom, getMembers, isHost, setPresence } from '../services/roomService.js';
import { listChatRooms } from '../services/chatService.js';
import { getUnreadCountsByChatRoom, markReadForChatRoom } from '../services/dashboardService.js';
import { subscribe } from '../services/realtimeBus.js';
import { navigate } from '../router.js';

import { renderTopBar } from './components/topBar.js';
import { renderLeftNav } from './components/leftNav.js';
import { renderDashboard } from './components/dashboard.js';
import { renderChatMessages } from './components/chatMessages.js';
import { renderCodeEditor } from './components/codeEditor.js';
import { openCreateChatRoomModal, openManageChatRoomModal } from './components/chatRoomModals.js';
import { openSettingsPanel } from './components/settingsPanel.js';
import { openParticipantsModal } from './components/participantsModal.js';

/**
 * 회의방 메인 화면. Top Bar / Left Nav / Main Content / Right Dashboard 4구역 레이아웃 (UI-UX 4.1).
 * @returns {() => void} cleanup 함수
 */
export function renderRoomView(root, roomId, currentUser) {
  let room = null;
  let destroyed = false;
  let selectedChatRoomId = null;
  let mainCleanup = null;
  const unsubscribers = [];
  let dashboardOpen = false;
  let leftNavOpen = false;
  let currentMembers = [];

  setPresence(roomId, currentUser.id, true);
  const handleUnload = () => setPresence(roomId, currentUser.id, false);
  window.addEventListener('beforeunload', handleUnload);

  const layout = h('div', { className: 'room-layout' });
  layout.appendChild(
    h(
      'div',
      { className: 'main-content__placeholder' },
      h('span', { className: 'text-h2' }, '불러오는 중...')
    )
  );
  root.appendChild(layout);

  function getUserName(userId) {
    const m = currentMembers.find((mm) => mm.userId === userId);
    return m ? m.displayName : '알 수 없음';
  }

  async function draw() {
    room = await getRoom(roomId);
    if (destroyed) return;
    if (!room || room.status !== 'active') {
      navigate('home');
      return;
    }

    const [members, isHostUser, chatRooms] = await Promise.all([
      getMembers(roomId),
      isHost(roomId, currentUser.id),
      listChatRooms(roomId)
    ]);
    if (destroyed) return;
    currentMembers = members;

    clear(layout);
    if (mainCleanup) {
      mainCleanup();
      mainCleanup = null;
    }

    if (!selectedChatRoomId && chatRooms.length > 0) {
      selectedChatRoomId = chatRooms[0].id;
    }
    if (selectedChatRoomId && !chatRooms.find((c) => c.id === selectedChatRoomId)) {
      selectedChatRoomId = chatRooms.length > 0 ? chatRooms[0].id : null;
    }

    layout.appendChild(
      renderTopBar({
        room,
        members,
        onOpenParticipants: () => openParticipantsModal({ roomId }),
        onOpenDashboardToggle: () => {
          dashboardOpen = !dashboardOpen;
          dashboardPanel.classList.toggle('dashboard-panel--open', dashboardOpen);
        },
        onOpenLeftNavToggle: () => {
          leftNavOpen = !leftNavOpen;
          leftNavEl.classList.toggle('leftnav--open', leftNavOpen);
        }
      })
    );

    const unreadCounts = await getUnreadCountsByChatRoom(currentUser.id, roomId);
    if (destroyed) return;
    const leftNavEl = renderLeftNav({
      chatRooms,
      selectedId: selectedChatRoomId,
      isHostUser,
      unreadCounts,
      onSelect: async (id) => {
        selectedChatRoomId = id;
        leftNavOpen = false;
        await markReadForChatRoom(currentUser.id, id);
        draw();
      },
      onCreate: () =>
        openCreateChatRoomModal({
          roomId,
          hostUserId: currentUser.id,
          onCreated: draw
        }),
      onOpenSettings: () =>
        openSettingsPanel({
          room,
          currentUser,
          isHostUser,
          onChanged: draw
        }),
      onManage: (chatRoom) =>
        openManageChatRoomModal({
          chatRoom,
          hostUserId: currentUser.id,
          onChanged: draw
        })
    });
    layout.appendChild(leftNavEl);

    const mainContent = h('main', { className: 'main-content' });
    const selectedChatRoom = chatRooms.find((c) => c.id === selectedChatRoomId);
    if (!selectedChatRoom) {
      mainContent.appendChild(
        h(
          'div', { className: 'main-content__placeholder' },
          h('span', { className: 'text-h2' }, isHostUser ? '첫 채팅방을 만들어보세요' : '아직 채팅방이 없습니다'),
          h('span', { className: 'text-caption' }, isHostUser ? '좌측 상단의 "+" 버튼으로 일반/호스트전용/코드에디터 채팅방을 만들 수 있어요.' : '호스트가 채팅방을 만들 때까지 기다려주세요.')
        )
      );
    } else if (selectedChatRoom.type === 'code_editor') {
      const { el, cleanup } = renderCodeEditor({ chatRoom: selectedChatRoom, currentUser, members });
      mainContent.appendChild(el);
      mainCleanup = cleanup;
    } else {
      const { el, cleanup } = renderChatMessages({ chatRoom: selectedChatRoom, currentUser, isHostUser, getUserName });
      mainContent.appendChild(el);
      mainCleanup = cleanup;
    }
    layout.appendChild(mainContent);

    const { el: dashboardPanel, cleanup: dashboardCleanup } = renderDashboard({
      room,
      currentUser,
      onNavigateToChatRoom: (chatRoomId) => {
        selectedChatRoomId = chatRoomId;
        dashboardOpen = false;
        draw();
      }
    });
    dashboardPanel.classList.toggle('dashboard-panel--open', dashboardOpen);
    layout.appendChild(dashboardPanel);
    if (mainCleanup) {
      const prevCleanup = mainCleanup;
      mainCleanup = () => {
        prevCleanup();
        dashboardCleanup();
      };
    } else {
      mainCleanup = dashboardCleanup;
    }

    // 모바일 하단 탭바
    const tabbar = h(
      'nav', { className: 'tabbar' },
      h('button', { className: 'tabbar__btn tabbar__btn--active', on: { click: () => { leftNavOpen = false; dashboardOpen = false; draw(); } } }, '💬', h('span', {}, '채팅')),
      h('button', { className: 'tabbar__btn', on: { click: () => { leftNavOpen = true; draw(); } } }, '☰', h('span', {}, '목록')),
      h('button', { className: 'tabbar__btn', on: { click: () => { dashboardOpen = true; draw(); } } }, '📋', h('span', {}, '대시보드')),
      h('button', {
        className: 'tabbar__btn',
        on: {
          click: () =>
            openSettingsPanel({ room, currentUser, isHostUser, onChanged: draw })
        }
      }, '⚙️', h('span', {}, '설정'))
    );
    layout.appendChild(tabbar);
    if (leftNavOpen) leftNavEl.classList.add('leftnav--open');
  }

  draw();

  unsubscribers.push(subscribe(`room:${roomId}:presence`, draw));
  unsubscribers.push(subscribe(`room:${roomId}:host_changed`, draw));
  unsubscribers.push(subscribe(`room:${roomId}:member_left`, draw));
  unsubscribers.push(subscribe(`room:${roomId}:chat_rooms_changed`, draw));
  unsubscribers.push(
    subscribe(`room:${roomId}:ended`, () => {
      navigate('home');
    })
  );

  return () => {
    destroyed = true;
    setPresence(roomId, currentUser.id, false);
    window.removeEventListener('beforeunload', handleUnload);
    unsubscribers.forEach((u) => u());
    if (mainCleanup) mainCleanup();
  };
}
