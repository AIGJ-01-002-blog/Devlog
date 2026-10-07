# 구현 메모: 004 이메일 가입·비밀번호와 Google 로그인

**구현**: 2026-10-07, v0.4.0 · 테스트 `app/backend/src/test/java/com/team/blog/account/EmailAuthTest.java` (19개), `app/frontend/src/lib/password.test.ts`

## 구조

| 부분 | 위치 | 설명 |
|---|---|---|
| 가입·로그인 | `account/application/EmailAccountService` | 회원·로그인 수단·약관을 한 트랜잭션, 커밋 뒤 인증 메일. 없는 이메일도 같은 BCrypt 비교와 같은 잠금 |
| 메일 인증 | `account/application/EmailVerification` | 링크 24시간·1회·마지막 것만, 다시 보내기 1분 1번·하루 10번 |
| 재설정·변경 | `account/application/PasswordService` | 재설정은 항상 202, 규칙 검사를 통과한 뒤에야 링크를 쓴다. 재설정은 모든 세션, 변경은 지금 세션 빼고 끊는다 |
| 일회용 링크 | `account/infra/AuthTokens` | 32바이트 난수, Redis에는 SHA-256만. Lua로 원자적 1회 사용 |
| 실패 잠금 | `account/infra/LoginAttempts` | `auth:fail:{해시}` 5회 → 15분. Redis 장애 시 통과 |
| 비밀번호 규칙 | `account/application/PasswordPolicy`, `resources/policy/common-passwords.txt` | 8~16자, 영문·숫자·특수문자, 이메일 앞부분·흔한 비밀번호 금지 |
| 인증 전 차단 | `account/web/AccountStateFilter` (`VERIFIED_ONLY`) | 매 요청 DB의 `email_verified_at`으로 판정. 댓글·사진·좋아요·신고 경로도 미리 등록 |
| 세션 끊기 | `shared/security/SessionTerminator` | Spring Session indexed 저장소에서 회원 번호로 찾는다 |
| 메일 | `shared/mail` | `SMTP_HOST` 있으면 SMTP(가상 스레드 비동기), 없으면 보관함 |
| Google | `account/infra/oauth/OAuthClientsConfig` | `GOOGLE_CLIENT_ID`가 있을 때만 등록, `/api/auth/providers`로 화면에 알림 |

## API

`POST /api/auth/signup/email` · `POST /api/auth/login` · `POST /api/auth/email/verify` · `POST /api/auth/email/resend` ·
`POST /api/auth/password/reset-request` · `POST /api/auth/password/reset-check` · `POST /api/auth/password/reset` ·
`PUT /api/me/password` · `GET /api/handles/suggestion?material=` · `GET /api/auth/providers` · (개발) `GET /api/dev/mails`

## 결정 (갈림길에서 고른 것)

- 인증 링크는 화면(`/verify-email`)이 POST로 확인한다. 메일 앱의 링크 미리 열기가 인증을 소모하지 않게 하기 위해서다.
- 재설정 링크를 연 것으로 이메일 소유가 확인되므로 재설정하면 이메일 인증도 완료로 본다.
- 로그인 잠금 응답은 429 `LOGIN_LOCKED`(Retry-After = 잠금 시간). 가입되지 않은 이메일도 똑같이 잠겨 가입 여부를 알 수 없다.
- 메일 인증 여부는 세션에 담지 않고 매 요청 DB로 본다. 세션 형식을 바꾸지 않아 기존 로그인이 유지된다.
