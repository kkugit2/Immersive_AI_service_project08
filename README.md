# TeamRoom
3~10명 소규모 팀을 위한 실시간 소통 웹앱 — 회의방을 만들고 6자리 코드로 팀원을 초대해 채팅, 공지, 협업 코드 편집을 한 화면에서 처리합니다.

## 소개
TeamRoom은 이메일 회원가입만으로 누구나 이용할 수 있는 소규모 팀 협업 도구입니다. 로그인 후 호스트로서 새 회의방을 만들거나 6자리 고유번호로 기존 회의방에 참가할 수 있으며, 회의방 안에서는 목적에 따라 일반 채팅방·호스트 전용 공지 채팅방·실시간 협업 코드 에디터를 자유롭게 만들어 사용합니다. 우측 대시보드에서는 놓친 새 메시지, 코드 변경, 호스트 공지를 한눈에 확인할 수 있습니다.

## 기능 목록

| 기능명 | 설명 | 우선순위 |
|---|---|---|
| 이메일 기반 회원가입/로그인 | 이메일·비밀번호로 가입 후 로그인하여 서비스 이용 | P0 |
| 회의방 생성(호스트) | 새 회의방을 만들면 자동으로 호스트가 되고 6자리 고유번호가 발급됨 | P0 |
| 회의방 참가(6자리 코드) | 6자리 고유번호 입력으로 기존 회의방에 참가 (정원 10명 초과 시 참가 불가) | P0 |
| 참가자 목록 및 실시간 접속 상태 | 상단에 소속 인원과 온라인/오프라인 상태를 실시간 표시 | P0 |
| 채팅방 생성/관리(호스트 전용) | 일반/호스트전용/코드에디터 채팅방을 호스트만 생성·삭제·이름변경 | P0 |
| 일반 채팅방 | 회의방 소속 누구나 자유롭게 메시지를 주고받는 채널 | P0 |
| 호스트 전용 채팅방(공지) | 호스트만 메시지 작성 가능, 참가자는 이모지 리액션만 가능 | P0 |
| 실시간 협업 코드 에디터 | 여러 참가자가 동시에 같은 코드 문서를 실시간 공동 편집, 문법 강조 지원 | P0 |
| 설정 패널(좌측 하단) | 회의방 상태(진행중/종료)와 6자리 고유번호 확인, 호스트는 회의방 종료 가능 | P0 |
| 안 읽은 정보 대시보드(우측) | 새 메시지, 코드 변경사항, 호스트 공지를 모아 보여주는 알림 피드 | P0 |
| 호스트 권한 이관 | 호스트가 특정 참가자에게 권한을 위임하거나, 호스트가 나가면 자동으로 이관 | P1 |
| 회의방 종료/삭제 | 호스트가 회의방을 종료하면 회의방과 모든 채팅 기록이 삭제됨(cascade) | P1 |
| 이모지 리액션 | 호스트 전용 채팅방 메시지에 이모지로 반응 | P1 |
| 코드 에디터 언어 선택 및 문법 강조 | JavaScript/Python/HTML·CSS/JSON/Markdown 등 선택 및 하이라이팅 | P1 |
| 대시보드 읽음 처리 | 알림 항목 개별/전체 읽음 처리 | P2 |
| 회의방 나가기(참가자) | 참가자가 스스로 회의방에서 나가기 | P2 |

## 설치 및 실행 방법

**기술 스택**: Vite(빌드/개발서버) + Vanilla JavaScript(ES Modules) + CSS(디자인 토큰) 프론트엔드, Supabase(Postgres + Auth + Realtime) 백엔드.

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정 (.env.example을 복사해 실제 값 입력)
cp .env.example .env
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon/publishable key>
# (Supabase 대시보드 > Project Settings > API 에서 확인)

# 3. 개발 서버 실행 (http://localhost:5173)
npm run dev

# 4. 테스트 실행
npm test          # 1회 실행 (Vitest + jsdom)
npm run test:watch

# 5. 프로덕션 빌드
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 로컬 미리보기
```

백엔드는 Supabase 프로젝트(`profiles`, `meeting_rooms`, `room_members`, `chat_rooms`, `messages`, `reactions`, `code_documents`, `notifications` 테이블, RLS 활성화, RPC 함수, Realtime publication)로 구성되어 있으며, 별도 서버 배포 없이 클라이언트(`@supabase/supabase-js`)에서 직접 연동합니다.

## 다른 환경(새 PC, 다른 사용자 계정 등)에서 실행하기 위한 체크리스트

이 저장소를 새로 클론한 환경에서 동일하게 동작시키려면 아래 항목을 순서대로 확인/수행해야 합니다.

1. **Node.js 준비**: `@supabase/supabase-js`(및 하위 패키지)가 Node **22 이상**을 요구합니다(`package-lock.json` 참고). `node -v`로 버전을 확인하고 필요 시 업그레이드하세요.
2. **의존성 설치**: 저장소 클론 후 `npm install` 실행 (`node_modules/`는 저장소에 포함되어 있지 않습니다).
3. **환경변수 파일 생성**: `.env`는 민감정보라 저장소에 포함되어 있지 않습니다(`.gitignore` 처리됨). `.env.example`을 복사해 `.env`를 만들고 아래 값을 채우세요.
   ```bash
   cp .env.example .env
   ```
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — 아래 4번에서 준비한 Supabase 프로젝트의 값 (대시보드 > Project Settings > API).
4. **Supabase 백엔드 준비 (가장 중요)**: 이 저장소에는 Supabase 스키마를 재현할 마이그레이션 SQL 파일이 포함되어 있지 않습니다(원 프로젝트는 Supabase MCP로 라이브 프로젝트에 직접 적용했습니다). 새 환경에서 처음부터 시작한다면 다음 중 하나가 필요합니다.
   - **(A) 기존 Supabase 프로젝트 재사용**: 원 프로젝트(조직 `huhuhu`, 리전 `ap-northeast-2`)에 대한 접근 권한을 받아 그 프로젝트의 URL/anon key를 그대로 사용.
   - **(B) 새 Supabase 프로젝트에 스키마 재구성**: `CLAUDE.md`의 "백엔드" 섹션에 문서화된 내용을 기준으로 아래를 새로 만들어야 합니다.
     - 테이블 8개(`profiles`, `meeting_rooms`, `room_members`, `chat_rooms`, `messages`, `reactions`, `code_documents`, `notifications`) + 전체 RLS 정책
     - RPC 함수(`create_room`, `join_room_by_code`, `set_presence`, `transfer_host`, `leave_room`, `end_room`) — 모두 `SECURITY DEFINER`
     - 트리거(`handle_new_user`, `fanout_new_message_notification`, `fanout_code_edit_notification`, `create_code_document_for_editor_room`, `set_reaction_chat_room_id`)
     - `supabase_realtime` publication에 관련 테이블 등록 (Realtime 동기화용)
5. **Supabase Auth 이메일 확인(Confirm email) 설정 확인**: 대시보드 `Authentication` > `Sign In / Providers` > `Email`에서 "Confirm email" 토글 상태를 확인하세요. 켜져 있으면 자체 SMTP를 연결하거나(운영용), 테스트 목적이면 꺼서 가입 즉시 로그인되도록 할 수 있습니다. 자세한 배경은 `Deploy-checklist.md`의 "0. 최우선 확인 사항" 참고.
6. **로컬 실행 및 테스트**: `npm run dev`로 `http://localhost:5173`에서 동작을 확인하고, `npm test`로 전체 테스트가 통과하는지 확인하세요(서비스 레이어 단위 테스트는 `tests/mocks/fakeSupabase.js`를 사용하므로 실제 Supabase 연결 없이도 통과합니다).
7. **배포까지 진행할 경우**: Vercel에 새 프로젝트를 연결하고, 위 3번의 환경변수(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)를 Vercel 프로젝트의 Environment Variables에도 동일하게 등록해야 프로덕션 빌드에 반영됩니다.

## 배포

- **플랫폼**: Vercel (정적 프론트엔드 빌드 배포, Vite 프레임워크 자동 감지)
- **Vercel 프로젝트명**: `immersive-ai-service-project08` (프로젝트 폴더명 기준, Vercel 네이밍 규칙에 맞춰 소문자+하이픈으로 생성)
- **백엔드**: Supabase 프로젝트 `Immersive_AI_service_project08`(조직 `huhuhu`, 리전 `ap-northeast-2`)
- **배포 URL**: https://immersive-ai-service-project08.vercel.app
- **배포 상태**: 배포 완료 (Production, READY). 배포된 번들은 로컬에서 검증한 프로덕션 빌드와 동일 파일 해시이며, 배포 직후 런타임 에러 없음을 확인함.
- **[배포 후 사용자 조치 필요]** Supabase Auth의 이메일 확인(Confirm email) 설정은 MCP로 변경할 수 없어 대시보드에서
  직접 처리해야 합니다. 사용자가 테스트 목적으로 이 설정을 끄기를 원하셨으나, Auth 설정은 Postgres가 아닌 Supabase
  플랫폼 설정 영역이라 현재 연동된 MCP 도구로는 대신 변경할 수 없습니다. 아래에서 직접 꺼주세요.
  - `https://supabase.com/dashboard/project/qfoqcgkuvtoujfsgdiva/auth/providers` → `Email` → **Confirm email** 토글 OFF
  - 자세한 내용은 `Deploy-checklist.md`의 "0. 최우선 확인 사항" 참고.

## 수정된 부분
초기 버전(v0.1.0) 최초 배포입니다.
- 이메일 회원가입/로그인, 회의방 생성/참가(6자리 코드, 정원 10명), 참가자 목록/실시간 접속상태
- 채팅방 생성·관리(호스트 전용), 일반 채팅방, 호스트 전용 공지 채팅방 + 이모지 리액션
- 실시간 협업 코드 에디터(문법 강조), 설정 패널(상태·코드 확인·호스트 권한 위임·회의방 종료)
- 안 읽은 정보 대시보드(새 메시지/코드 변경/호스트 공지, 읽음 처리)
- Supabase(Auth/Postgres/RLS/Realtime) 백엔드 연동 및 프론트엔드 49개 테스트 전체 통과

## 라이선스
미정 (프로젝트 소유자 결정 필요)
