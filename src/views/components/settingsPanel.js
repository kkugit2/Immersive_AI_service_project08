import { h, showToast, setButtonLoading } from '../../utils/dom.js';
import { getMembers, transferHost, endRoom } from '../../services/roomService.js';
import { openModal, confirmDanger } from './modal.js';
import { navigate } from '../../router.js';

/** 좌측 하단 설정 패널 (5.8, PRD 4.3~4.4) */
export function openSettingsPanel({ room, currentUser, isHostUser, onChanged }) {
  const body = h('div', { className: 'settings-panel' });

  async function draw() {
    body.innerHTML = '';
    body.appendChild(h('h2', { className: 'text-h2' }, '회의방 설정'));

    body.appendChild(
      h(
        'div', { className: 'settings-row' },
        h('span', { className: 'text-body' }, '회의방 상태'),
        h('span', { className: `status-pill ${room.status === 'active' ? 'status-pill--active' : 'status-pill--ended'}` }, room.status === 'active' ? '진행중' : '종료됨')
      )
    );

    body.appendChild(
      h(
        'div', { className: 'settings-row' },
        h('span', { className: 'text-body' }, '6자리 코드'),
        h(
          'div', { className: 'room-code-display' },
          h('span', {}, room.room_code),
          h('button', {
            className: 'btn btn--ghost btn--compact',
            attrs: { 'aria-label': '코드 복사' },
            on: {
              click: async () => {
                try {
                  await navigator.clipboard.writeText(room.room_code);
                } catch {
                  // clipboard API 미지원 환경 대응: 무시
                }
                showToast('복사됨', { type: 'success' });
              }
            }
          }, '복사')
        )
      )
    );

    if (isHostUser) {
      const members = (await getMembers(room.id)).filter((m) => m.userId !== currentUser.id);
      const select = h(
        'select',
        { className: 'input', attrs: { 'aria-label': '위임 대상 선택' } },
        h('option', { attrs: { value: '' } }, '참가자 선택'),
        ...members.map((m) => h('option', { attrs: { value: m.userId } }, m.displayName))
      );

      const delegateBtn = h('button', { className: 'btn btn--secondary' }, '위임');
      delegateBtn.addEventListener('click', async () => {
        if (!select.value) return;
        setButtonLoading(delegateBtn, true, '위임 중...');
        try {
          await transferHost(room.id, currentUser.id, select.value);
          showToast('호스트 권한이 위임되었습니다.', { type: 'success' });
          onChanged();
          close();
        } catch (err) {
          showToast(err.message, { type: 'danger' });
          setButtonLoading(delegateBtn, false);
        }
      });

      body.appendChild(
        h(
          'div', { className: 'field' },
          h('label', { className: 'field__label' }, '호스트 권한 위임'),
          h('div', { style: 'display:flex; gap:8px;' }, select, delegateBtn)
        )
      );

      const endBtn = h('button', { className: 'btn btn--danger' }, '회의방 종료');
      endBtn.addEventListener('click', () => {
        confirmDanger({
          title: '회의방을 종료할까요?',
          message: '회의방을 종료하면 모든 채팅 기록과 코드 문서가 영구적으로 삭제되며, 되돌릴 수 없습니다.',
          confirmLabel: '종료하기',
          onConfirm: async () => {
            setButtonLoading(endBtn, true, '종료 중...');
            try {
              await endRoom(room.id, currentUser.id);
              showToast('회의방이 종료되었습니다.');
              close();
              navigate('home');
            } catch (err) {
              showToast(err.message, { type: 'danger' });
              setButtonLoading(endBtn, false);
            }
          }
        });
      });

      body.appendChild(
        h(
          'div', { className: 'settings-row' },
          h('span', { className: 'text-body' }, '회의방 종료 시 모든 데이터가 삭제됩니다.'),
          endBtn
        )
      );
    }

    body.appendChild(
      h('div', { className: 'modal-card__actions' }, h('button', { className: 'btn btn--ghost', on: { click: close } }, '닫기'))
    );
  }

  const { close } = openModal(body);
  draw();
}
