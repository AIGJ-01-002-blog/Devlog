# Implementation Plan: 가입·로그인과 소유 권한 (001-auth-ownership)

**Branch**: `claude/blog-implementation-g7il4l` (기능 브랜치 대신 구현 브랜치 하나에 기능별 커밋) | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

## Summary

GitHub OAuth2 로그인 → (처음이면) 가입 마무리 → 회원·로그인 수단·약관 동의를 한 트랜잭션으로 만든다. 로그인 상태는
Spring Session(Redis) 세션 쿠키 + CSRF 토큰이다. 블로그 주소·닉네임 규칙은 `HandlePolicy`·`NicknamePolicy` 한곳에서
검사하고, DB의 UNIQUE·CHECK가 동시 요청의 최종 방어선이다. 소유 권한은 Service 계층에서 `author_id = :me` 조건 조회로
판정하고, 없는 글과 남의 글을 같은 404로 응답한다.

## Technical Context

**Language/Version**: Java 21, TypeScript 5 (React 19)

**Primary Dependencies**: Spring Boot 4.1.1 (WebMVC, Security 7.1, OAuth2 Client, Data JPA/Hibernate 7.4, Data Redis,
Session Data Redis, Flyway, Validation), Vite 8

**Storage**: PostgreSQL 16 (`pg_trgm`), Redis 7 (세션·요청 제한)

**Testing**: JUnit 5, Spring Boot Test + MockMvc, Spring Security Test, Testcontainers(PostgreSQL 16, Redis 7)

**Target Platform**: Linux 컨테이너 1개(앱) + PostgreSQL + Redis (Docker Compose)

**Project Type**: 웹 애플리케이션 (`app/backend` 모듈러 모놀리스 + `app/frontend` React, 같은 도메인에서 서빙)

**Performance Goals**: 목록·상세 300ms 이내(02 §6), 로그인 후 세션 조회는 Redis 1회

**Constraints**: 세션 14일(마지막 활동 기준), 같은 IP 로그인 1분 20회, Redis 장애 시 읽기 계속

**Scale/Scope**: MVP 첫 릴리스, 회원 1만·글 1만 기준

## Constitution Check

| 원칙 | 확인 |
|---|---|
| I. 공통 기준선 보존 | V1 스키마(`erd/V1__common_schema.sql`)를 Flyway `V1`로 그대로 쓴다. 블로그 주소 규칙(08 §7, H-6~H-9 결정)은 `V2__handle_rule.sql`에서 CHECK·길이만 바꾼다 (민서님 "고치기" 결정) |
| II. 서버가 권한을 결정 | 모든 쓰기 Service가 `MemberPrincipal`의 회원 번호로 `author_id` 조건 조회. 남의 것·없는 것 404 |
| III. 본문 안전성 | 001은 본문을 다루지 않음. 보안 헤더(CSP·nosniff·Referrer-Policy)는 001에서 공통 필터로 넣는다 |
| IV. 모듈 경계 | `account` 모듈만 `member`·`auth_identity`·`member_agreement`·`member_suspension`을 쓴다. 다른 모듈은 `MemberQueryService`로만 접근 |
| V. 실제 환경 테스트 | Testcontainers PostgreSQL·Redis. 동시 가입은 동시 요청 테스트 |
| VI. 설정값 | 예약어·금칙어 목록, 약관 버전, 세션 기간, 요청 제한 수치는 `application.yml`·리소스 파일 |

## 설계 결정 (research)

| # | 결정 | 이유 | 버린 대안 |
|---|---|---|---|
| R-1 | 소셜 인증 직후에는 Spring Security 인증을 세우지 않고 세션에 `PendingSocialSignup`(10분)만 담는다 | 가입 마무리 전에는 계정이 없다(FR-002). 인증 객체가 있으면 쓰기 API가 열린다 | OAuth2AuthenticationToken을 그대로 두고 필터로 막기 → 누락 위험 |
| R-2 | 로그인 성공 시 우리 `MemberAuthentication`(회원 번호·handle·role·약관 재동의 필요 여부·직전 로그인)으로 교체하고 세션 ID를 새로 발급 | 세션 고정 방지, 이후 요청에서 DB 조회 없이 현재 사용자 확인 | JWT → 헌법이 금지 |
| R-3 | 계정 상태(정지·탈퇴 유예)는 요청마다 `member.status`를 PK로 다시 읽어 판정 | 정지 직후 남아 있는 세션의 쓰기를 막는다(FR-016) | 세션 값만 신뢰 → 정지가 늦게 반영됨 |
| R-4 | Redis 세션 저장소 앞에 `ResilientSessionRepository`를 둔다: 읽기 실패 → 세션 없음(비로그인), 로그인 직전 Redis 확인 실패 → "잠시 후 다시 시도" | FR-020, 02 §2-1 | 장애 시 500 |
| R-5 | 클라이언트 IP는 `blog.web.trusted-proxies`(CIDR)에서 온 요청만 `X-Forwarded-For`의 가장 오른쪽 신뢰 밖 주소를 쓴다 | FR-019, 02 §5 H4 | `server.forward-headers-strategy` 전체 신뢰 → 위조로 우회 |
| R-6 | 블로그 주소 제안은 `HandleSuggester`가 `base`, `base_2`… 중 비어 있는 첫 값을 한 번의 `LIKE` 조회로 찾는다 | H-5 | 번호마다 조회 |
| R-7 | 동시 가입 충돌은 DB UNIQUE 위반(`uq_member_handle`, `uq_member_nickname`)을 잡아 409 `HANDLE_TAKEN`/`NICKNAME_TAKEN` + 새 제안 | FR-008·011, SC-003 | 애플리케이션 잠금 |
| R-8 | 개발·E2E용 `POST /api/dev/login`(GitHub 프로필 흉내)은 `blog.dev-login.enabled=true`일 때만 켠다 | GitHub 앱 키 없이 로컬·테스트에서 같은 가입 흐름을 탄다 | 테스트 전용 Security 설정 분기 |

## Data Model

V1의 `member`, `auth_identity`, `member_agreement`, `member_suspension`을 그대로 쓴다. 바꾸는 것은 V2의
`member.handle`(VARCHAR(23), CHECK `^((go|gi)-)?[a-z0-9][a-z0-9_]{1,18}[a-z0-9]$` AND `!~ '^(go|gi)_'`)뿐이다.

## Contracts (REST)

| 메서드·경로 | 설명 | 응답 |
|---|---|---|
| `GET /oauth2/authorization/github?redirect=/path` | GitHub 인증 시작 (돌아갈 주소는 사이트 안 상대 경로만) | 302 |
| `GET /api/auth/me` | 현재 사용자 `{ authenticated, member{ id, handle, nickname, role, defaultVisibility }, agreementRequired, previousLogin }` / 가입 대기 `{ pendingSignup{...} }` | 200 |
| `GET /api/auth/signup` | 가입 마무리 화면 초기값 `{ provider, prefix, handleBody, nickname, avatarUrl, email, terms{version}, privacy{version} }` | 200 / 404 (대기 없음·만료) |
| `POST /api/auth/signup` | `{ handleBody, nickname, agreeTerms, agreePrivacy }` → 가입 + 로그인 | 201 / 400(필드 오류) / 409 `HANDLE_TAKEN`·`NICKNAME_TAKEN`(+`details.suggestion`) / 410 `SIGNUP_EXPIRED` |
| `POST /api/auth/agreements` | 재동의 `{ agreeTerms, agreePrivacy }` | 204 |
| `POST /api/auth/logout` | 로그아웃 | 204 |
| `GET /api/auth/login-error` | 직전 로그인 실패 이유(정지 기한·사유 등) 1회 조회 | 200 / 204 |
| `GET /api/handles/availability?handle=` | `{ available, reason, suggestion }` (IP 1분 30회) | 200 / 429 |
| `GET /api/nicknames/availability?nickname=` | `{ available, code }` (IP 1분 30회) | 200 / 429 |
| `PATCH /api/me/nickname` | `{ nickname }` | 200 / 400 / 409 `NICKNAME_CHANGE_TOO_SOON`·`NICKNAME_TAKEN` |
| `GET /api/me/posts?tab=&visibility=&cursor=` | 내 글 관리 (본인 글만) | 200 / 401 |
| `GET /api/terms/current` | 약관·처리방침 현재 버전·시행일 | 200 |

오류 본문은 02 §5-1 공통 형식 `{ code, message, errors[], details }`.

## Project Structure

```text
app/
├── backend/                         Spring Boot (Maven)
│   └── src/main/java/com/team/blog/
│       ├── account/  web · application · domain · infra   (회원·로그인·주소·닉네임·약관·정지)
│       ├── post/     web · application · domain · infra   (002)
│       ├── discovery/ web · application                     (003)
│       ├── page/     SPA 셸 + 링크 미리보기 메타 (003)
│       └── shared/   config · error · security · web · markdown · cursor · event
├── frontend/                        React + Vite (TypeScript)
└── compose.yaml                     PostgreSQL · Redis · (009부터 MinIO)
```

## Complexity Tracking

| 위반 | 필요한 이유 | 더 단순한 대안을 버린 이유 |
|---|---|---|
| V1 `member.handle` CHECK·길이 변경(V2) | 08 §7·H-6~H-9 결정(민서님 확정)과 V1이 다름 | 애플리케이션에서만 검사하면 DB가 규칙 밖 주소를 받아들인다 |
