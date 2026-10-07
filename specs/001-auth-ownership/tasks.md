# Tasks: 가입·로그인과 소유 권한 (001-auth-ownership)

**Input**: [spec.md](./spec.md), [plan.md](./plan.md) · 테스트는 헌법 V에 따라 완료 기준마다 1개 이상

## Phase 1: Setup

- [X] T001 `app/backend` Maven 프로젝트(Spring Boot 4.1.1, Java 21)와 `app/frontend`(Vite + React + TS) 만들기
- [X] T002 Flyway `V1__common_schema.sql`(erd 원본 그대로), `V2__handle_rule.sql`
- [X] T003 `app/compose.yaml`(PostgreSQL 16, Redis 7), `application.yml` 설정값(약관 버전·예약어·요청 제한·세션 14일)
- [X] T004 테스트 기반: Testcontainers PostgreSQL·Redis 공용 설정, MockMvc 로그인 헬퍼

## Phase 2: Foundational

- [X] T005 공통 오류 형식 `ErrorResponse`·`ApiException`·`GlobalExceptionHandler` (02 §5-1)
- [X] T006 `ClientIpResolver`(신뢰 프록시 대역), `RateLimiter`(Redis, 장애 시 통과)
- [X] T007 `SecurityConfig`: 세션 쿠키 + CSRF(SPA), API 401 JSON, 보안 헤더(CSP·nosniff·Referrer-Policy)
- [X] T008 `ResilientSessionRepository`(Redis 장애 시 비로그인)
- [X] T009 `AccountStateFilter`: 정지 → 쓰기 403 `ACCOUNT_SUSPENDED`, 재동의 필요 → 403 `AGREEMENT_REQUIRED`

## Phase 3: User Story 1 — GitHub로 가입 (P1)

- [X] T010 [US1] `HandlePolicy`(형식·예약어·go_/gi_·금칙어), `HandleSuggester`(_2, _3…, 16자, user_ + 6자리)
- [X] T011 [US1] `NicknamePolicy`(NFC·형식·글자 포함·예약어·금칙어 4변형·예외), `WordFilter` 리소스 파일
- [X] T012 [US1] GitHub OAuth2: 인증된 대표 이메일 조회, 성공 핸들러(기존 회원 로그인 / 가입 대기 10분)
- [X] T013 [US1] `SignupService.complete` 한 트랜잭션(member + auth_identity + member_agreement 2행), UNIQUE 충돌 → 409 + 제안
- [X] T014 [US1] 가입 API·중복 확인 API, 대문자 주소 301
- [X] T015 [US1] 테스트: 주소 규칙 표(08 §2·§3), 닉네임 규칙(09 §11), 가입·재로그인 1계정, 동시 가입 10건 1건 성공

## Phase 4: User Story 2 — 로그인 유지·로그아웃·정지·재동의·닉네임 변경 (P2)

- [X] T016 [US2] 로그아웃(세션 삭제, 화면은 IndexedDB·localStorage의 본인 임시 데이터 삭제)
- [X] T017 [US2] 정지 로그인 거부(기한·사유), 기한 지난 정지 자동 해제
- [X] T018 [US2] 약관 버전 비교 → 재동의, `POST /api/auth/agreements`
- [X] T019 [US2] 닉네임 변경 30일 제한·같은 값 무변경·대소문자만 바꾸기
- [X] T020 [US2] 로그인 후 돌아갈 주소(사이트 안 상대 경로만), 같은 IP 1분 20회 제한·헤더 위조 무시
- [X] T021 [US2] 테스트: 위 항목 각각

## Phase 5: User Story 3·4 — 소유 권한·내 글 관리 (P3·P4)

- [X] T022 [US3] `PostAccessPolicy.canRead`, 소유자 조건 조회(002와 함께)
- [X] T023 [US4] `GET /api/me/posts` 본인 글만, 빈 상태
- [X] T024 테스트: 남의 글 수정·삭제 404 + 내용 불변, 비공개·임시·없는 글 응답 동일, 다른 사용자 값 무시

## Phase 6: 화면

- [X] T025 React: 로그인 화면, 가입 마무리(접두어 고정·0.5초 중복 확인), 재동의, 정지 안내, 프로필 메뉴·로그아웃
