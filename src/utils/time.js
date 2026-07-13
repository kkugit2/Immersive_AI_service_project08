/** 시간 표시 관련 유틸리티 */

/** 주어진 ISO 타임스탬프를 상대 시각 문자열로 변환 (Caption 테스트용) */
export function toRelativeTime(isoString, now = new Date()) {
  const target = new Date(isoString);
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 5) return '방금 전';
  if (diffSec < 60) return `${diffSec}초 전`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;

  return target.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/** 채팅 메시지 타임스탬프 표기 (HH:MM) */
export function toClockTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

/** 두 타임스탬프가 "연속 메시지" 취급 기준(1분 이내)인지 확인 */
export function isWithinOneMinute(isoA, isoB) {
  return Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime()) <= 60 * 1000;
}
