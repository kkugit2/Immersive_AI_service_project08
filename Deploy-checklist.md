# 배포 전 점검 체크리스트 (Deploy Checklist)

Vercel 배포 전 반드시 확인해야 할 항목을 정리한 문서입니다. deploy-manager가 배포 직전 이 문서의
모든 항목을 재확인하며, 하나라도 충족되지 않으면 배포를 중단하고 원인을 보고합니다.

---

## 0. 최우선 확인 사항 — Supabase Auth 이메일 확인(Confirm email) 설정

- [x] (원인 파악 및 사용자 안내 완료 / 실제 토글 변경은 [ ] 사용자 조치 대기) Supabase 프로젝트(ref: `qfoqcgkuvtoujfsgdiva`, 조직: `huhuhu`)의
  기본 Auth 설정은 회원가입(`signUp`) 시 이메일 확인(Confirm email)이 **활성화**되어 있습니다.
  - 현재 동작: 이메일 확인이 켜져 있으면 `signUp()` 호출 시 세션이 즉시 발급되지 않고,
    `src/services/authService.js`의 `signUp()`이 "가입 신청이 완료되었습니다. 인증 이메일을 확인한 뒤
    로그인해주세요." 라는 안내 메시지를 던지도록 이미 구현되어 있습니다(에러가 아니라 정상 분기 처리).
    즉 **코드 자체는 버그가 아니며, 두 설정 상태 모두에서 정상 동작**합니다.
  - 문제: 이메일 확인이 켜진 상태에서 실제로 사용자가 인증 메일을 받으려면 Supabase 프로젝트에
    발신용 SMTP가 구성되어 있어야 합니다. Supabase 기본 제공 이메일 발송(사이트 기본 SMTP)은
    **시간당 발송량이 매우 제한적이며 프로덕션 용도로 사용할 수 없다고 Supabase가 명시**하고 있어,
    이 상태로 배포하면 실제 사용자 다수가 인증 메일을 못 받아 가입을 완료하지 못하는 문제가 발생할 수 있습니다.
  - **MCP로 해결 가능한 범위 확인 결과**: 현재 연동된 Supabase MCP 도구 목록
    (`get_project`, `list_tables`, `get_advisors`, `execute_sql`, `apply_migration`,
    `get_logs`, `get_publishable_keys`, `get_project_url` 등)에는 **Auth 설정(Confirm email
    on/off, SMTP 설정)을 변경하는 도구가 없습니다.** Auth 설정은 Postgres 스키마가 아니라
    Supabase 플랫폼 설정 영역이라 `execute_sql`/`apply_migration`으로도 변경할 수 없습니다.
    → **MCP로는 해결 불가능함을 확인했습니다.**
  - **사용자가 배포 전 반드시 직접 처리해야 하는 항목** (아래 중 하나 선택):
    1. (테스트/내부 배포용) Supabase 대시보드 → 해당 프로젝트 →
       `Authentication` → `Sign In / Providers`(또는 `Emails`) → `Email` 항목의
       **"Confirm email"** 토글을 꺼서 가입 즉시 세션이 발급되도록 변경.
       (대시보드 링크: `https://supabase.com/dashboard/project/qfoqcgkuvtoujfsgdiva/auth/providers`)
    2. (실서비스 배포용, 권장) Confirm email은 켜둔 채로 `Authentication` → `Emails` →
       `SMTP Settings`에서 자체 SMTP(예: Resend, SendGrid, AWS SES 등)를 연결해 인증 메일이
       안정적으로 발송되도록 구성.
  - 이 항목은 **Vercel 배포 자체(코드/빌드)를 막는 요소는 아니지만**, 실제 서비스 플로우
    (회원가입 → 로그인)가 매끄럽게 동작하려면 배포 전/직후 반드시 처리되어야 하는 항목입니다.
  - **사용자 결정(배포 시점)**: 사용자는 테스트 목적으로 위 1번(Confirm email 끄기)을 선택했습니다.
    오케스트레이터도 Supabase MCP 도구 목록을 재확인했고, deploy-manager가 처음 확인한 것과 동일하게
    **Auth 설정을 변경하는 MCP 도구는 존재하지 않음을 재확인**했습니다. 따라서 이 토글은 **사용자가
    아래 대시보드 링크에서 직접 꺼야 하며, 이 문서 작성 시점 기준 아직 미완료 상태(사용자 조치 대기)**
    입니다. 완료 전까지는 `signUp()` 호출 시 세션이 즉시 발급되지 않고 안내 메시지만 반환됩니다(오류 아님).
    이 항목은 Vercel 배포 자체를 막는 요소가 아니므로, 미완료 상태에서도 배포는 예정대로 진행했습니다.

## 1. 코드/빌드 상태

- [x] 프론트엔드 테스트 전체 통과 (`npm test` → 49/49 통과 확인)
- [x] 백엔드 서비스 레이어 단위 테스트 통과 (fakeSupabase 모킹 기반, `npm test`에 포함, 위와 동일하게 통과)
- [x] 실제 Supabase 프로젝트 대상 스모크 테스트 통과 (backend-developer 단계에서 회원가입/로그인/RPC/RLS 조회 확인)
- [x] 프로덕션 빌드(`npm run build`)가 에러 없이 성공하고 `dist/`가 생성되는지 확인 (534ms, JS 283KB/CSS 20KB)
- [x] `.env` 파일(실제 키)이 `.gitignore`에 포함되어 커밋되지 않는지 확인 (`.gitignore`에 `.env` 등록됨)
- [x] `.env.example`에 필요한 환경변수 키(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)가 최신 상태인지 확인

## 2. Supabase 백엔드 상태

- [x] `public` 스키마의 모든 테이블(`profiles`, `meeting_rooms`, `room_members`, `chat_rooms`,
      `messages`, `reactions`, `code_documents`, `notifications`)에 RLS가 활성화되어 있는지 확인
      (`list_tables` 결과 8개 테이블 전부 `rls_enabled: true`)
- [x] Supabase 보안 어드바이저(`get_advisors` security) 확인 — WARN 14건은 모두 의도된 공개 RPC
      (`create_room`/`join_room_by_code`/`set_presence`/`transfer_host`/`leave_room`/`end_room`) 또는
      읽기 전용 헬퍼(boolean/id 반환)로, 데이터 유출·권한상승 위험 없음을 확인해 배포 차단 사유 아님으로 결론
- [x] Supabase 성능 어드바이저(`get_advisors` performance) 확인 — INFO 4건(unused index)뿐이며
      데이터가 없는 신규 프로젝트라 발생하는 정상 경고, 치명적 경고 없음
- [x] Realtime publication에 필요한 테이블이 모두 등록되어 있는지 확인 (backend-developer 구현 내용 기준)
- [x] Supabase 프로젝트 상태가 `ACTIVE_HEALTHY`인지 확인 (`get_project` 결과 `ACTIVE_HEALTHY`)

## 3. Vercel 배포 설정

- [x] Vercel 프로젝트명이 현재 폴더명(`Immersive_AI_service_project08`) 기준으로 생성되는지 확인
      (Vercel 네이밍 규칙상 소문자+하이픈만 허용되어 `immersive-ai-service-project08`로 생성,
      동일 계정의 기존 `immersive-ai-service-project07` 명명 관례와 일치)
- [x] 빌드 명령(`vite build`)과 출력 디렉터리(`dist`)가 Vercel에 올바르게 인식되는지 확인
      (framework: vite 자동 감지 + 명시적 설정, 배포 상태 READY로 확인)
- [x] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 값이 배포 결과물에 정상 반영되는지 확인
      (Vite는 빌드 시점에 `VITE_` 접두사 환경변수를 번들에 인라인하므로, 배포 파이프라인에
      해당 값이 전달되지 않으면 클라이언트가 Supabase에 연결할 수 없음 — 배포용 파일 트리에 `.env`를
      포함해 빌드에 반영되도록 처리, 사용자 사전 확인 완료)
  - 참고: anon/publishable key는 RLS로 보호되는 공개 클라이언트 키이므로 프론트엔드 번들에
    포함되는 것이 정상이며 보안 문제가 아님.
- [x] 해시 기반 라우터(`#/auth`, `#/home`, `#/room/:roomId`)를 사용하므로 별도의 서버 사이드
      rewrite(SPA fallback) 설정 없이도 정상 동작하는지 확인 (정적 `index.html` 하나만 서빙하면 됨)
- [x] 배포 후 실제 URL(`https://immersive-ai-service-project08.vercel.app`)에 접속해 정상 응답(200,
      배포된 JS/CSS 해시가 로컬 검증 빌드와 동일)과 런타임 에러 없음(`get_runtime_errors`)을 확인.
      전체 사용자 플로우(회원가입→로그인→회의방 생성) 수동 클릭 테스트는 0번 항목(Confirm email)
      해결 후 사용자가 직접 진행 필요.

## 4. 최종 게이트

- [x] 위 1~3 항목은 모두 충족됨을 확인
- [x] 0번(Auth 이메일 확인) 항목은 MCP로 해결 불가능함을 재확인 후 사용자에게 명시적으로 전달했고,
      사용자가 인지 및 결정(테스트를 위해 직접 끄기로 결정, 조치는 아직 미완료)함
- [x] 0번은 Vercel 배포 자체를 막는 요소가 아니라고 판단해 배포를 중단하지 않고 진행함. 1~3번 중
      충족되지 않은 항목은 없었으므로 배포를 정상 진행함(하나라도 미충족 시 배포 중단 원칙 유지)
