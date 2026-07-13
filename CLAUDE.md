# 프로젝트 규칙

이 문서는 프로젝트의 전역 규칙과 서브에이전트 워크플로우를 관리하는 문서입니다.
이 문서는 "현재 시점의 최신 상태"만 담는 Living Document로 관리합니다.
과거에 무엇이 어떻게 바뀌어왔는지는 이 문서에 남기지 않습니다.
아래 "PRD 반영 사항", "UI/UX 가이드라인 반영 사항" 섹션은 프론트엔드 개발자 서브에이전트가 관리하며,
@PRD.md / @UI-UX-Guideline.md 가 갱신될 때마다 해당 섹션 전체를 최신 내용으로 덮어씁니다 (append 아님).

## 서브에이전트 워크플로우

새 기능 요청이 들어오면 아래 순서로 서브에이전트를 자동으로 이어서 실행합니다.
각 단계가 완료되면 사용자에게 다시 묻지 않고 다음 단계로 자동 진행합니다
(단, 각 서브에이전트 프롬프트에 명시된 개별 확인 절차는 그대로 따릅니다).

1. **prd-writer** 실행 → `PRD.md` 작성/갱신 (최신 상태로 덮어쓰기)
2. PRD.md 작성 완료 → **ui-ux-designer** 자동 실행 → `UI-UX-Guideline.md` 작성/갱신 (최신 상태로 덮어쓰기)
3. UI-UX-Guideline.md 작성 완료 → **frontend-developer** 자동 실행 →
   - PRD.md, UI-UX-Guideline.md의 최신 내용을 이 CLAUDE.md의 해당 섹션에 반영 (섹션 전체 갱신, append 아님)
   - 프론트엔드 코드 작성 및 테스트 진행
4. frontend-developer의 테스트가 모두 통과하면 → **backend-developer** 자동 실행 →
   - Supabase MCP 연동
   - 백엔드 코드 작성 및 테스트 진행
5. backend-developer의 테스트가 모두 통과하면→ **deploy-manager** 자동 실행 →
   - 배포 전 점검해야 할 사항을 정리한 Deploy-checklist.md 작성
   - README.md 갱신 (기능 목록, 설치 방법, 배포 정보, 수정된 부분 — 수정된 부분도 누적 아닌 이번 버전 요약만)
   - Vercel MCP 연동
   - 테스트 및 점검 -> 통과 시 배포

기존 기능을 수정/확장하는 요청인지, 완전히 새로운 기능 요청인지 판단이 애매한 경우
(아래 "기능 인덱스" 참고), 서브에이전트는 임의로 새 문서를 만들지 말고 사용자에게 먼저 확인합니다.

## 기능 인덱스

- 이메일 회원가입/로그인: `src/services/authService.js`, `src/views/authView.js` — 이메일/비밀번호 검증 후 가입·로그인, 세션은 localStorage 기반(mock). 백엔드 단계에서 Supabase Auth로 교체 예정.
- 홈 화면(회의방 생성/참가): `src/views/homeView.js`, `src/services/roomService.js` — 호스트가 회의방을 만들면 6자리 고유코드 자동 발급, 6자리 코드로 참가 시 존재 여부·정원(10명) 검증.
- 회의방 레이아웃 및 참가자 목록/접속상태: `src/views/roomView.js`, `src/views/components/topBar.js`, `src/views/components/participantsModal.js` — 상단바 참가자 아바타 스택(최대 5개+N), 온라인/오프라인 상태 점, 호스트 왕관 배지.
- 채팅방 생성/관리(호스트 전용): `src/services/chatService.js`, `src/views/components/leftNav.js`, `src/views/components/chatRoomModals.js` — 좌측 "+"로 일반/호스트전용/코드에디터 생성, "⋯"로 이름변경·삭제. 호스트만 가능하도록 서비스 레이어에서 강제.
- 일반 채팅방: `src/views/components/chatMessages.js` — 회의방 소속 누구나 메시지 송수신, 연속 메시지(1분 이내 동일 발신자) 그룹핑.
- 호스트 전용(공지) 채팅방 + 이모지 리액션: `src/views/components/chatMessages.js` — 호스트만 작성 가능, 참가자는 메시지별 리액션 피커(고정 6종 이모지)로 반응만 가능. 서비스 레이어에서 작성 권한 강제.
- 실시간 협업 코드 에디터: `src/views/components/codeEditor.js`, `src/services/chatService.js`(code_documents) — 언어 선택(JavaScript/Python/HTML·CSS/JSON/Markdown) + Prism.js 문법 강조, 참가자별 커서 범례 색상 표시. 다중 클라이언트 동시편집 동기화는 mock(realtimeBus, 동일 탭 기준)이며 백엔드 단계에서 Supabase Realtime 브로드캐스트로 교체 예정.
- 설정 패널(회의방 상태·6자리 코드·호스트 권한 위임·회의방 종료): `src/views/components/settingsPanel.js` — 좌측 하단(데스크톱)/하단 탭바(모바일)에서 접근, 위험 액션(종료)은 2단계 확인 모달.
- 안 읽은 정보 대시보드: `src/views/components/dashboard.js`, `src/services/dashboardService.js` — 새 메시지/코드 변경/호스트 공지 3개 카테고리, 카테고리당 상위 5건 노출, 개별/전체 읽음 처리, 클릭 시 해당 채팅방 이동.
- 호스트 권한 위임 및 자동 이관, 회의방 종료(cascade 삭제), 회의방 나가기: `src/services/roomService.js` — 위임은 설정 패널에서 수동 수행, 호스트가 위임 없이 나가면 참가 순서가 가장 빠른 멤버로 자동 이관. 종료 시 하위 chat_rooms/messages/reactions/code_documents/notifications cascade 삭제.

## PRD 반영 사항

### 프로젝트 개요
TeamRoom은 3~10명 규모의 소규모 팀이 하나의 "회의방(Room)" 안에서 실시간으로 소통·협업하는 웹앱이다. 이메일 회원가입만으로 이용 가능하며, 로그인 후 호스트로서 새 회의방을 만들거나 6자리 고유번호로 기존 회의방에 참가한다. 회의방 내부에서는 일반 채팅방, 호스트 전용 공지 채팅방, 실시간 협업 코드 에디터를 자유롭게 만들어 사용하고, 우측 대시보드로 놓친 소식을 한눈에 파악한다.

### 핵심 기능 목록 (우선순위)

| 기능명 | 설명 | 우선순위 |
|---|---|---|
| 이메일 기반 회원가입/로그인 | 이메일·비밀번호로 가입 후 로그인 | P0 |
| 회의방 생성(호스트) | 새 회의방 생성 시 자동 호스트 지정 + 6자리 고유번호 발급 | P0 |
| 회의방 참가(6자리 코드) | 코드 입력으로 참가, 정원 10명 초과 시 참가 불가 | P0 |
| 참가자 목록 및 실시간 접속 상태 | 상단에 소속 인원과 온라인/오프라인 실시간 표시 | P0 |
| 채팅방 생성/관리(호스트 전용) | 일반/호스트전용/코드에디터 채팅방을 호스트만 생성·삭제·이름변경 | P0 |
| 일반 채팅방 | 누구나 자유롭게 메시지 송수신 | P0 |
| 호스트 전용 채팅방(공지) | 호스트만 작성, 참가자는 이모지 리액션만 가능 | P0 |
| 실시간 협업 코드 에디터 | 동시 공동 편집 + 문법 강조 | P0 |
| 설정 패널(좌측 하단) | 회의방 상태·6자리 코드 확인, 호스트는 회의방 종료 가능 | P0 |
| 안 읽은 정보 대시보드(우측) | 새 메시지/코드 변경/호스트 공지 알림 피드 | P0 |
| 호스트 권한 이관 | 수동 위임 또는 호스트 이탈 시 자동 이관 | P1 |
| 회의방 종료/삭제 | 종료 시 회의방과 모든 채팅 기록 삭제 | P1 |
| 이모지 리액션 | 호스트 전용 채팅방 메시지에 반응 | P1 |
| 코드 에디터 언어 선택 및 문법 강조 | JavaScript/Python/HTML·CSS/JSON/Markdown 등 | P1 |
| 대시보드 읽음 처리 | 개별/전체 읽음 처리 | P2 |
| 회의방 나가기(참가자) | 참가자 스스로 나가기 | P2 |

### 사용자 플로우 요약
1. **회원가입/로그인**: 이메일·비밀번호 가입 → 로그인 → 홈 화면.
2. **홈 화면**: "새 회의방 만들기"(이름 입력 → 6자리 코드 발급 → host 역할) 또는 "회의방 참가하기"(6자리 코드 입력 → 유효성/정원 확인 → member 역할). 정원 초과·존재하지 않는 코드는 오류 메시지 표시.
3. **회의방 화면**: 상단 참가자/접속상태 확인 → 좌측 채팅방 목록에서 선택(일반/호스트전용/코드에디터) → 중앙에 해당 콘텐츠 표시. 호스트는 좌측 상단 "+"로 채팅방 생성, 참가자에게는 생성/삭제 버튼 미노출. 우측 대시보드에서 안 읽은 항목 클릭 시 해당 채팅방 이동 + 읽음 처리. 좌측 하단 설정 버튼에서 회의방 상태·코드 확인(호스트는 권한 위임/회의방 종료 추가 노출).
4. **호스트 권한 이관/종료**: 설정 패널에서 위임 대상 지정 시 즉시 이관. 호스트가 위임 없이 나가면 참가 순서가 가장 빠른 참가자에게 자동 이관(가정). 회의방 종료 시 확인 절차 후 회의방·채팅방·메시지·코드 문서 삭제, 전원 홈으로 이동.

### 데이터 구조 (7.1/7.2 반영)
- **users**: id, email, display_name, created_at (Supabase Auth 관리 + 프로필 확장)
- **meeting_rooms**: id, room_code(6자리 unique), name, host_user_id, status(active/ended), created_at, ended_at
- **room_members**: id, room_id, user_id, role(host/member), joined_at, last_seen_at
- **chat_rooms**: id, room_id, type(general/host_only/code_editor), name, created_by, created_at
- **messages**: id, chat_room_id, sender_id, content, created_at
- **reactions**: id, message_id, user_id, emoji, created_at
- **code_documents**: id, chat_room_id(unique, 1:1), language, content, updated_at
- **notifications**: id, user_id, room_id, chat_room_id, type(new_message/code_edit/host_announcement), preview_text, is_read, created_at

관계: 한 user는 여러 meeting_rooms에 동시 소속 가능(가정). 한 meeting_room은 여러 chat_rooms를 가지며, general/host_only 채팅방은 여러 messages(각 message는 여러 reactions 보유 가능)를, code_editor 채팅방은 code_documents 1건과 1:1 연결. meeting_room 종료 시 하위 chat_rooms/messages/reactions/code_documents/notifications가 cascade 삭제된다.

### 기술 스택 및 MCP
- 기술 스택: HTML / CSS / JavaScript (프레임워크 없는 vanilla JS, 빌드 도구로 Vite 사용). 실시간 동기화(접속 상태, 채팅, 코드 공동편집)는 Supabase Realtime 채널 기반으로 구현 예정(현재 프론트엔드 단계에서는 동일 탭 기준 mock 이벤트 버스로 대체).
- MCP: **Supabase**(인증, 데이터 저장, Realtime 동기화) — 백엔드 단계에서 연동. **Vercel**(프론트엔드 배포/호스팅) — 배포 단계에서 연동.

### 개발 우선순위
- **MVP(1차)**: 이메일 회원가입/로그인, 회의방 생성/참가(정원 10명), 참가자 목록/접속상태, 채팅방 생성·관리(호스트 전용), 일반 채팅방, 호스트 전용 채팅방(작성+리액션), 코드 에디터(기본 동시편집+문법강조), 설정 패널(상태·코드·종료), 우측 대시보드.
- **2차 이후**: 호스트 권한 위임/자동 이관 고도화, 코드 에디터 커서/선택영역 실시간 표시 및 충돌 최소화, 대시보드 읽음 UX 개선, 참가자 자발적 나가기, 코드 에디터 언어 확장/버전 관리, 채팅 검색·읽음 확인.

## UI/UX 가이드라인 반영 사항

### 디자인 컨셉
"군더더기 없는 팀 커맨드 센터" — Slack/Discord식 3-Column 레이아웃(좌측 채널 목록-중앙 콘텐츠-우측 부가정보)을 채택하되 Discord의 게이머 톤은 배제. Linear식 미니멀 다크 시스템(헤어라인 보더, 낮은 폰트 굵기, 그림자 대신 보더로 위계 표현)과 2026 대시보드 트렌드(우측 대시보드는 5~9개 내외로 우선순위 정리)를 반영. 톤앤매너는 **명확성 > 트렌디함**이며, 접속상태/호스트여부/읽음여부 등 상태 구분이 최우선 원칙.

### 컬러 팔레트 (CSS 커스텀 프로퍼티로 정의, `src/styles/tokens.css`)
- Primary: `#4F5FF0`(hover `#3E4CD1`, tint `#EEF0FE`) — 주요 버튼/링크/활성탭/선택된 채팅방.
- 다크모드 배경 `#111318` / 표면 `#191B22`, 라이트모드 배경 `#F7F8FA` / 표면 `#FFFFFF`.
- Accent(Amber) `#F2B84B` — 호스트 배지, 공지 강조, 안읽음 뱃지(단, 흰 텍스트 금지, 어두운 텍스트 `#12141A`와 조합).
- 시맨틱: 온라인/성공 `#2FBF6E`, 오프라인 `#8A8F9B`, 위험/종료 `#E5484D`.
- 채팅방 유형 태그: 일반 `#6B7280`(#), 호스트전용 `#F2B84B`(메가폰), 코드에디터 `#14B8A6`(`</>`) — 색상+아이콘 이중 구분(색약 대응).
- 텍스트: 라이트 강조 `#12141A`/기본 `#3C3F47`/메타 `#8A8F9B`, 다크 강조 `#F2F3F5`/기본 `#C7CAD1`/메타 `#7B7F8A`. 라이트모드 기본, 다크모드 동등 지원(`prefers-color-scheme` + `[data-theme]` 토큰 스위칭).

### 타이포그래피
- UI 폰트: Pretendard(Variable, CDN), 폴백 `-apple-system, "Segoe UI", Roboto, sans-serif`. 코드 폰트: JetBrains Mono, 폴백 `"D2Coding", Consolas, "Courier New", monospace`.
- 타입 스케일: Display 28/36 700, H1 22/30 700, H2 18/26 600, H3 15/22 600, Body 14/20 400, Body Strong 14/20 600, Caption 12/16 400, Code 14/22 400(mono), Button 14/20 600. Weight는 400/600/700만 사용. 본문 최소 14px, 메타 정보 최소 12px.

### 레이아웃 원칙
- 데스크톱(≥1280px) 4구역: Top Bar(56px 고정, 회의방명+참가자 아바타 스택) / Left Nav(272px 고정, 채팅방 목록+하단 설정 버튼) / Main Content(가변, 최소 480px) / Right Dashboard(320px, 접기 가능).
- 태블릿(768~1279px): Right Dashboard가 아이콘 토글 + 오버레이 Drawer로 전환.
- 모바일(<768px): Left Nav/Right Dashboard 숨김, 하단 탭바(채팅목록/메인/대시보드/설정)로 한 번에 한 영역만 표시. 코드 에디터는 "열람 우선"(가로 스크롤 허용, 축소 툴바).
- 여백은 4px 배수 스케일(4/8/12/16/24/32/48), 카드/모달 radius 12px·버튼/입력 radius 8px, 보더는 1px hairline(그림자 대신 보더로 위계 표현).

### 주요 컴포넌트 스펙
- 버튼: Primary/Secondary/Ghost/Danger 4종, 최소 높이 36~40px, 최소 터치영역 40x40px, focus-visible 2px outline.
- 리스트 아이템(채팅방/참가자/대시보드): hover 배경 미세 강조, 선택 시 Indigo tint + 좌측 3px 인디케이터 바, 안읽음은 Bold + Amber 카운트 뱃지.
- 참가자/아바타: 32px(리스트)/24px(탑바), 우하단 8px 접속상태 점, 호스트는 왕관 아이콘+"호스트" 텍스트 배지. 탑바는 최대 5개 노출 후 "+N".
- 입력 폼: 기본 인풋 40px/보더 1px/radius 8px, 6자리 코드는 OTP 스타일(6박스), 메시지 입력은 Enter 전송/Shift+Enter 줄바꿈, 호스트 전용 채팅방에서 참가자는 리액션(고정 이모지) UI만 노출.
- 채팅 메시지: 내 메시지 우측 정렬(Indigo tint), 상대 메시지 좌측 정렬(보더), 연속 메시지(1분 이내) 압축, 공지 메시지는 좌측 4px Amber 바 + "공지" 라벨.
- 코드 에디터: 좌측 라인넘버, 상단 툴바(언어 선택/커서 범례/저장상태), 라이트=GitHub Light풍/다크=One Dark풍 하이라이팅, 참가자 커서 고정 6색 팔레트(`#F97316,#22C55E,#3B82F6,#EC4899,#A855F7,#14B8A6`) 순환 할당.
- 모달: 오버레이 `rgba(0,0,0,0.4)`, 카드 최대폭 420~560px, 위험 액션은 2단계 확인(경고문구+Danger 버튼).
- 설정 패널: 좌측 하단 아이콘 → 팝오버/사이드시트, 공통(상태뱃지+코드+복사), 호스트 전용(권한위임/회의방종료).
- 대시보드: 상단 "전체 읽음 처리", 새 메시지/코드 변경/호스트 공지 3섹션(카테고리당 상위 5건), 안읽음은 좌측 3px Amber 바 + 클릭 시 이동 및 읽음 처리.

### 인터랙션/애니메이션
- 트랜지션 120~200ms `ease-out` 기본, 그 이상 지속되는 모션 금지. 리스트/패널 열림은 8px 이내 slide+fade, 새 메시지는 fade-in만(bounce/scale 금지), 대시보드 신규 항목은 1회 pulse(300ms). 접속상태 점은 0.2초 컬러 트랜지션(지속 pulse는 재연결 시도 중에만). 토스트는 우측 하단 2.5초 후 소실. 로딩은 스피너 대신 스켈레톤. `prefers-reduced-motion: reduce` 시 모든 트랜지션 0ms.

### 접근성
- 본문 대비 최소 4.5:1(WCAG AA), Amber 배경엔 반드시 어두운 텍스트. 접속상태/채팅방유형/호스트여부는 색상+아이콘+텍스트 라벨 병기(색약 대응). 본문 최소 14px/메타 최소 12px, 200% 확대 대응. 모든 인터랙션 요소 focus-visible + 모달 포커스 트랩/ESC 닫기. 터치 타겟 최소 40x40px. 접속상태 점/안읽음 뱃지/호스트 배지에 `aria-label` 제공, 대시보드 신규 알림 영역 `aria-live="polite"`. 채팅방/참가자 목록 방향키 이동, 코드 에디터는 표준 텍스트 편집 키 조작 유지. 다크모드도 라이트모드와 동일한 AA 대비 기준을 별도 검증(단순 색 반전 금지).

## 코딩 컨벤션 및 기술 스택

### 프론트엔드
- **스택**: Vite(빌드/개발서버) + Vanilla JavaScript(ES Modules) + CSS(커스텀 프로퍼티 기반 디자인 토큰). UI 프레임워크(React/Vue 등) 미사용 — PRD 5장 기술 스택 명시 사항 준수.
- **테스트**: Vitest + jsdom. 실행: `npm test`(1회 실행) / `npm run test:watch`(watch 모드). 서비스 레이어는 단위 테스트(Supabase 클라이언트를 `tests/mocks/fakeSupabase.js`로 모킹), 화면 플로우는 `tests/integration/`에서 DOM 기반 통합 테스트로 검증.
- **디렉터리 구조**:
  - `src/services/` — 데이터/비즈니스 로직 레이어(`supabaseClient.js` Supabase 클라이언트 싱글턴, `realtimeBus.js` Supabase Realtime 연동 pub/sub, `authService.js`, `roomService.js`, `chatService.js`, `dashboardService.js`). PRD 7장 데이터 구조와 1:1로 매핑되며, Supabase 백엔드와 통신하는 async 함수로 구현되어 있다.
  - `src/utils/` — 검증(`validators.js`), 시간 포맷(`time.js`), DOM 헬퍼(`dom.js`, 로딩 버튼 헬퍼 `setButtonLoading` 포함).
  - `src/views/` — 화면 단위(`authView.js`, `homeView.js`, `roomView.js`) + `src/views/components/`(재사용 UI 조각).
  - `src/styles/` — `tokens.css`(디자인 토큰) → `base.css` → `layout.css`/`components.css`/`auth.css`/`code-theme.css` 순으로 로드.
  - `src/router.js` — 해시 기반 경량 라우터(`#/auth`, `#/home`, `#/room/:roomId`), 인증 가드 포함. `authService.getSession()`이 동기 캐시를 반환하므로 라우터 자체는 수정 없이 그대로 유지됨(앱 부트스트랩 시 `main.js`가 `initAuth()`를 await한 뒤 라우터를 시작).
- **컨벤션**: 함수/변수 camelCase, 파일명은 역할 단위 camelCase(`chatService.js` 등). 모든 사용자 대상 문자열은 한국어. DOM 생성은 `h()` 헬퍼로 통일(직접 innerHTML 조립 지양, XSS 방지를 위해 사용자 입력은 textContent 경로 사용). 각 서비스 함수는 실패 시 사용자에게 그대로 노출 가능한 한국어 `Error` 메시지를 throw한다(Supabase 에러는 서비스 레이어에서 한국어 메시지로 매핑). 컴포넌트는 `{ el, cleanup }` 형태를 반환하고, 구독(realtimeBus)은 반드시 `cleanup`에서 해제한다. 서비스 레이어 함수는 모두 `async`이며, 화면 코드는 `await` 후 상태를 갱신하는 패턴을 따른다(버튼 등 트리거 지점은 `setButtonLoading()`으로 최소한의 로딩 피드백을 표시).

### 백엔드
- **스택**: Supabase(Postgres + Auth + Realtime). 클라이언트 SDK는 `@supabase/supabase-js`. 프로젝트명은 폴더명과 동일한 `Immersive_AI_service_project08`(조직 `huhuhu`, 리전 `ap-northeast-2`). 연결 정보는 `.env`(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `.env.example` 참고)에 보관하고 `src/services/supabaseClient.js`가 단일 클라이언트 인스턴스를 생성한다.
- **인증**: Supabase Auth(이메일/비밀번호)를 그대로 사용. `auth.users` 생성 시 `handle_new_user` 트리거가 `public.profiles`(id, email, display_name, created_at)에 프로필 행을 자동 생성한다(회원가입 시 `display_name`은 auth 메타데이터로 전달). 이메일 인증(컨펌) 요구 여부는 Supabase 대시보드 Auth 설정에 따르며, 컨펌이 필요한 경우 `signUp()`은 세션 없이 안내 메시지를 던진다.
- **테이블(모두 `public` 스키마, RLS 활성화)**: `profiles`, `meeting_rooms`(room_code는 `status='active'`인 행에 한해 partial unique index로 유일성 보장), `room_members`(room_id+user_id unique), `chat_rooms`, `messages`, `reactions`(chat_room_id를 messages에서 비정규화해 저장, 인서트 트리거로 자동 채움), `code_documents`(chat_room_id unique, 1:1), `notifications`. 회의방 종료 시 하위 데이터는 `chat_rooms` cascade(FK `ON DELETE CASCADE`)로 정리된다.
- **RPC(SECURITY DEFINER 함수, 클라이언트는 `supabase.rpc(...)`로 호출)**: `create_room`, `join_room_by_code`(6자리 코드 발급/조회, 정원 10명 제한, 중복 참가 방지를 원자적으로 처리), `set_presence`, `transfer_host`(호스트만 실행 가능), `leave_room`(호스트가 위임 없이 나가면 참가 순서가 가장 빠른 멤버로 자동 이관), `end_room`(호스트만 실행 가능, 하위 chat_rooms/messages/reactions/code_documents/notifications/room_members cascade 삭제 후 `status='ended'`로 갱신). 각 함수는 `auth.uid()`로 호출자를 판별하므로 클라이언트가 다른 사용자를 사칭할 수 없습니다.
- **알림/코드문서 자동화(트리거)**: `messages` INSERT 시 `fanout_new_message_notification`이 발신자를 제외한 회의방 멤버 전원에게 `notifications`(type: `new_message`/`host_announcement`)를 생성. `code_documents` UPDATE 시 `fanout_code_edit_notification`이 `last_edited_by`를 제외한 멤버에게 `code_edit` 알림을 생성. `chat_rooms` INSERT(type=`code_editor`) 시 `create_code_document_for_editor_room`이 `code_documents` 1건을 자동 생성. `reactions` INSERT 시 `set_reaction_chat_room_id`가 부모 메시지의 `chat_room_id`를 자동 채운다.
- **RLS 정책 요약**: `profiles`는 전원 조회 가능/본인만 수정. `meeting_rooms`/`room_members`/`chat_rooms`/`messages`/`reactions`/`code_documents`/`notifications`는 헬퍼 함수(`is_room_member`, `is_room_host`, `can_write_chat_room` 등, SECURITY DEFINER)로 "해당 회의방 멤버인가/호스트인가"를 판별해 SELECT를 제한한다. `chat_rooms`는 호스트만 INSERT/UPDATE/DELETE 가능. `messages`는 일반 채팅방은 멤버 전원, 호스트 전용 채팅방은 호스트만 INSERT 가능(`can_write_chat_room`). `room_members`/`meeting_rooms`의 쓰기는 직접 허용하지 않고 전부 위 RPC를 통해서만 이뤄지도록 강제했다. `notifications`는 본인 행만 SELECT/UPDATE 가능, INSERT는 트리거(SECURITY DEFINER)만 수행.
- **Realtime**: `supabase_realtime` publication에 `meeting_rooms`/`room_members`/`chat_rooms`/`messages`/`reactions`/`code_documents`/`notifications`를 등록. `src/services/realtimeBus.js`가 `room:<roomId>`, `chat:<chatRoomId>`, `user:<userId>` 단위로 Supabase Realtime 채널을 참조 카운팅하며 관리하고, `postgres_changes` 이벤트를 기존 mock과 동일한 채널 문자열(`room:${roomId}:presence` 등)로 재발행한다. 이 덕분에 `subscribe(channel, handler)`를 호출하는 화면/컴포넌트 코드는 전혀 수정하지 않았다.
- **보안 점검**: Supabase 어드바이저(`get_advisors`)로 점검해 익명(anon) 사용자가 내부 헬퍼/트리거 함수를 직접 RPC로 호출하지 못하도록 `REVOKE EXECUTE`를 적용했고, RLS 정책의 `auth.uid()` 호출을 `(select auth.uid())`로 감싸 실행계획 최적화(성능 어드바이저 권고)를 반영했다. 남은 성능 어드바이저 경고(unused index)는 데이터가 없는 신규 프로젝트라 발생하는 정상적인 정보성 경고다.
- **테스트 전략**: Vitest 단위 테스트는 실제 네트워크 대신 `tests/mocks/fakeSupabase.js`(체이닝 쿼리 빌더 + RPC + 트리거 동작을 재현하는 in-memory 더블)로 `supabaseClient.js`를 모킹해서 검증한다(`tests/setup.js`에서 전역 등록). RLS/RPC 자체의 실동작은 Supabase MCP로 실제 프로젝트에 대해 REST API 스모크 테스트(회원가입 → 이메일 컨펌 → 로그인 → `create_room`/`join_room_by_code` RPC 호출 → RLS로 보호되는 `meeting_rooms`/`room_members` 조회)를 수행해 확인했으며, 테스트에 사용한 데이터는 확인 후 정리했다.
