import { h, showToast, setButtonLoading } from '../../utils/dom.js';
import { createChatRoom, renameChatRoom, deleteChatRoom } from '../../services/chatService.js';
import { openModal, confirmDanger } from './modal.js';

const TYPE_OPTIONS = [
  { value: 'general', label: '일반 채팅방' },
  { value: 'host_only', label: '호스트 전용(공지) 채팅방' },
  { value: 'code_editor', label: '코드 에디터' }
];

/** "+" 버튼: 새 채팅방 생성 모달 (호스트 전용, 5.7) */
export function openCreateChatRoomModal({ roomId, hostUserId, onCreated }) {
  const errorBox = h('div', { className: 'form-error-banner', attrs: { role: 'alert', hidden: true } });
  const nameInput = h('input', { className: 'input', attrs: { type: 'text', placeholder: '예) 자유 대화' } });
  const typeSelect = h(
    'select',
    { className: 'input' },
    ...TYPE_OPTIONS.map((opt) => h('option', { attrs: { value: opt.value } }, opt.label))
  );

  const submitBtn = h('button', { className: 'btn btn--primary', attrs: { type: 'submit' } }, '만들기');

  const form = h(
    'form',
    {
      on: {
        submit: async (e) => {
          e.preventDefault();
          errorBox.setAttribute('hidden', '');
          setButtonLoading(submitBtn, true, '생성 중...');
          try {
            await createChatRoom({ roomId, type: typeSelect.value, name: nameInput.value, createdBy: hostUserId });
            showToast('채팅방이 생성되었습니다.', { type: 'success' });
            onCreated();
            close();
          } catch (err) {
            errorBox.textContent = err.message;
            errorBox.removeAttribute('hidden');
            setButtonLoading(submitBtn, false);
          }
        }
      }
    },
    h('h2', { className: 'text-h2' }, '새 채팅방 만들기'),
    h('div', { className: 'field' }, h('label', { className: 'field__label' }, '유형'), typeSelect),
    h('div', { className: 'field' }, h('label', { className: 'field__label' }, '이름'), nameInput),
    errorBox,
    h(
      'div', { className: 'modal-card__actions' },
      h('button', { className: 'btn btn--ghost', attrs: { type: 'button' }, on: { click: () => close() } }, '취소'),
      submitBtn
    )
  );

  const { close } = openModal(form);
}

/** ⋯ 버튼: 채팅방 이름 변경/삭제 관리 모달 (호스트 전용) */
export function openManageChatRoomModal({ chatRoom, hostUserId, onChanged }) {
  const nameInput = h('input', { className: 'input', attrs: { type: 'text', value: chatRoom.name } });
  nameInput.value = chatRoom.name;
  const errorBox = h('div', { className: 'form-error-banner', attrs: { role: 'alert', hidden: true } });

  const deleteBtn = h('button', { className: 'btn btn--danger' }, '삭제');
  const saveBtn = h('button', { className: 'btn btn--primary' }, '저장');

  deleteBtn.addEventListener('click', () => {
    confirmDanger({
      title: '채팅방을 삭제할까요?',
      message: `'${chatRoom.name}' 채팅방과 모든 메시지가 삭제되며 되돌릴 수 없습니다.`,
      confirmLabel: '삭제하기',
      onConfirm: async () => {
        setButtonLoading(deleteBtn, true, '삭제 중...');
        try {
          await deleteChatRoom(chatRoom.id, hostUserId);
          showToast('채팅방이 삭제되었습니다.');
          onChanged();
          close();
        } catch (err) {
          errorBox.textContent = err.message;
          errorBox.removeAttribute('hidden');
          setButtonLoading(deleteBtn, false);
        }
      }
    });
  });

  saveBtn.addEventListener('click', async () => {
    setButtonLoading(saveBtn, true, '저장 중...');
    try {
      await renameChatRoom(chatRoom.id, nameInput.value, hostUserId);
      onChanged();
      close();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.removeAttribute('hidden');
      setButtonLoading(saveBtn, false);
    }
  });

  const body = h(
    'div',
    {},
    h('h2', { className: 'text-h2' }, '채팅방 관리'),
    h('div', { className: 'field' }, h('label', { className: 'field__label' }, '이름'), nameInput),
    errorBox,
    h(
      'div', { className: 'modal-card__actions' },
      deleteBtn,
      h('button', { className: 'btn btn--ghost', on: { click: () => close() } }, '취소'),
      saveBtn
    )
  );

  const { close } = openModal(body);
}
